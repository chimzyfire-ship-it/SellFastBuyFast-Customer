import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
function harness({ refreshError, rejectAgain = false, networkRetry = false } = {}) {
  let stored = { access_token: 'stored', user: { id: 'one' } };
  const calls = []; let refreshes = 0; let signouts = 0; let persistedSessionPurges = 0;
  const context = vm.createContext({
    console: { warn() {}, error: console.error, log: console.log }, setTimeout, AbortController, DOMException,
    normalizeEmail: value => String(value || '').trim().toLowerCase(),
    state: { session: { access_token: 'stale-memory' }, dataRequestVersion: 0,
      client: { auth: {
        getSession: async () => ({ data: { session: stored } }),
        refreshSession: async () => {
          refreshes++;
          await new Promise(resolve => setTimeout(resolve, 5));
          if (refreshError) return { error: refreshError };
          stored = { access_token: 'fresh', user: { id: 'one' } };
          return { data: { session: stored } };
        },
        signOut: async () => { signouts++; stored = null; },
      } },
    },
    render() {}, apiUrl: path => path, idempotencyKey: () => 'key',
    clearPersistedSupabaseSession: () => { persistedSessionPurges++; },
    fetch: async (_path, options) => {
      calls.push(options.headers.Authorization);
      if (networkRetry && options.headers.Authorization === 'Bearer fresh') throw Error('offline');
      const ok = !rejectAgain && options.headers.Authorization === 'Bearer fresh';
      return { ok, status: ok ? 200 : 401,
        json: async () => ok ? { success: true, data: { ready: true } } :
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Token is invalid or expired.' } },
      };
    },
  });
  vm.runInContext('let workspaceGeneration = 0; let workspaceLoadingPromise = null;\n' +
    source.slice(source.indexOf('class ApiError'), source.indexOf('function showNotice')), context);
  return { context, calls, stats: () => ({ refreshes, signouts, persistedSessionPurges }),
    run: expression => vm.runInContext(expression, context), setStored: value => { stored = value; } };
}

test('restoration reads persisted session instead of stale memory', async () => {
  const h = harness();
  assert.equal((await h.run('getValidSession()')).access_token, 'stored');
  h.setStored(null);
  assert.equal(await h.run('getValidSession()'), null);
});

test('concurrent rejected requests share one refresh and retry with current token', async () => {
  const h = harness();
  await h.run("Promise.all([api('/one'), api('/two'), api('/three')])");
  assert.equal(h.stats().refreshes, 1);
  assert.equal(h.stats().signouts, 0);
  assert.equal(h.calls.filter(value => value === 'Bearer fresh').length, 3);
});

test('revoked refresh token clears local session and opens sign in', async () => {
  const h = harness({ refreshError: { code: 'refresh_token_not_found', status: 400 } });
  await assert.rejects(h.run("api('/one')"));
  assert.equal(h.context.state.session, null);
  assert.equal(h.context.state.authMode, 'signin');
  assert.equal(h.context.state.workspaceError, '');
  assert.equal(h.stats().signouts, 1);
});

test('second 401 ends session without an infinite retry', async () => {
  const h = harness({ rejectAgain: true });
  await assert.rejects(h.run("api('/one')"));
  assert.equal(h.calls.length, 2);
  assert.equal(h.stats().signouts, 1);
  assert.equal(h.context.state.session, null);
});

test('network failure during refresh preserves the login', async () => {
  const h = harness({ refreshError: { name: 'AuthRetryableFetchError', status: 0, message: 'offline' } });
  await assert.rejects(h.run("api('/one')"));
  assert.equal(h.stats().signouts, 0);
  assert.ok(h.context.state.session);
});

test('network failure on retry does not become session expiry', async () => {
  const h = harness({ networkRetry: true });
  await assert.rejects(h.run("api('/one')"), { code: 'NETWORK_ERROR' });
  assert.equal(h.stats().signouts, 0);
});

test('expired session invalidates pending workspace and merchant reads', async () => {
  const h = harness();
  h.run('workspaceLoadingPromise = Promise.resolve();');
  await h.run('handleSessionExpired()');
  assert.equal(h.context.state.dataRequestVersion, 1);
  assert.equal(h.run('workspaceGeneration'), 1);
  assert.equal(h.run('workspaceLoadingPromise'), null);
  h.setStored({ access_token: 'new-login' });
  assert.equal((await h.run('getValidSession()')).access_token, 'new-login');
});

test('a credential sign-in starts from a clean workspace instead of inheriting a prior failure', async () => {
  const h = harness();
  Object.assign(h.context.state, {
    merchant: { id: 'stale-merchant' },
    merchants: [{ id: 'stale-merchant' }],
    overview: { stale: true },
    workspaceError: 'Merchant workspace not available',
    authError: 'Old error',
    pendingPassword: 'must-not-survive',
    activeView: 'profile',
    productDraft: { title: 'Other merchant draft' },
    selectedOrder: { id: 'other-merchant-order' },
    selectedIdDocFile: { name: 'identity-document.pdf' },
  });

  await h.run('prepareForCredentialSignIn()');

  assert.equal(h.context.state.session, null);
  assert.equal(h.context.state.merchant, null);
  assert.equal(h.context.state.merchants.length, 0);
  assert.equal(h.context.state.workspaceError, '');
  assert.equal(h.context.state.authError, '');
  assert.equal(h.context.state.pendingPassword, '');
  assert.equal(h.context.state.authMode, 'signin');
  assert.equal(h.context.state.activeView, 'dashboard');
  assert.equal(h.context.state.productDraft, null);
  assert.equal(h.context.state.selectedOrder, null);
  assert.equal(h.context.state.selectedIdDocFile, null);
  assert.equal(h.stats().signouts, 1);
  assert.equal(h.stats().persistedSessionPurges, 1);
});

test('a complete sign-out purges persisted auth even when the SDK sign-out request fails', async () => {
  const h = harness();
  h.context.state.client.auth.signOut = async () => {
    throw Error('storage temporarily unavailable');
  };
  Object.assign(h.context.state, {
    session: { access_token: 'stale-session' },
    merchant: { id: 'stale-merchant' },
    merchants: [{ id: 'stale-merchant' }],
    workspaceError: 'Merchant workspace not available',
  });

  await h.run("handleSessionExpired('')");

  assert.equal(h.context.state.session, null);
  assert.equal(h.context.state.merchant, null);
  assert.equal(h.context.state.merchants.length, 0);
  assert.equal(h.context.state.workspaceError, '');
  assert.equal(h.context.state.authMode, 'signin');
  assert.equal(h.stats().persistedSessionPurges, 1);
});

test('a late rejection from an old session cannot sign out a new login', async () => {
  const h = harness();
  let respond;
  h.context.fetch = () => new Promise(resolve => { respond = resolve; });
  const pending = h.run("api('/old')");
  await new Promise(resolve => setTimeout(resolve, 0));
  await h.run('handleSessionExpired()');
  h.setStored({ access_token: 'new-login' });
  await h.run('getValidSession()');
  respond({ ok: false, status: 401 });
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(h.context.state.session.access_token, 'new-login');
  assert.equal(h.stats().signouts, 1);
});

test('a confirmed merchant without a membership enters onboarding instead of a workspace error', async () => {
  let rendered = 0;
  const context = vm.createContext({
    state: {
      session: { user: { id: 'new-merchant' } },
      merchants: [],
      merchant: null,
      workspaceError: 'stale error',
      loading: false,
      authMode: 'signin',
    },
    api: async () => ({ merchants: [] }),
    readStoredValue: () => '',
    render: () => { rendered++; },
    loadMerchantData: async () => { throw Error('A merchant-less account must not load merchant data.'); },
    isAuthError: () => false,
    handleSessionExpired: async () => { throw Error('A valid new session must not be signed out.'); },
    workspaceErrorMessage: () => 'workspace error',
  });
  const workspaceSource = source.slice(
    source.indexOf('let workspaceGeneration = 0;'),
    source.indexOf('async function performServerAction'),
  );
  vm.runInContext(workspaceSource, context);

  await vm.runInContext('loadWorkspace()', context);

  assert.equal(context.state.authMode, 'onboarding');
  assert.equal(context.state.workspaceError, '');
  assert.equal(context.state.loading, false);
  assert.equal(context.state.merchant, null);
  assert.ok(rendered >= 2);
});
