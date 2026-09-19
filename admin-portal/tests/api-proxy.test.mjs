import test from 'node:test';
import assert from 'node:assert/strict';
import proxy from '../api/core.js';
import { AdminApi } from '../api.mjs';
const env = { ADMIN_API_URL: 'https://core.example' };
function response() {
  return { headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; } };
}
const request = (path = '/v1/admin/me') => ({ method: 'GET', query: { path }, headers: { authorization: 'Bearer test-token' } });

test('deployed admin identity uses same-origin transport and verifies the returned staff identity', async () => {
  const handler = proxy.createHandler(async (url, options) => {
    assert.equal(url, 'https://core.example/v1/admin/me');
    assert.equal(options.headers.authorization, 'Bearer test-token');
    return Response.json({ success: true, data: { id: 'staff', roles: ['operations_admin'] } });
  }, env);
  const api = new AdminApi({ apiUrl: env.ADMIN_API_URL, apiProxyPath: '/api/core' },
    { getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) },
    async (url, options) => {
      assert.ok(url.startsWith('/api/core?path='));
      const res = response();
      await handler({ ...request(new URL(url, 'https://admin.example').searchParams.get('path')),
        headers: { authorization: options.headers.Authorization } }, res);
      return new Response(res.body, { status: res.statusCode, headers: res.headers });
    });
  assert.equal((await api.request('/v1/admin/me')).id, 'staff');
});

test('proxy preserves unauthorized, forbidden and MFA responses', async () => {
  for (const status of [401, 403]) {
    const res = response();
    await proxy.createHandler(async () => Response.json({ success: false, error: { code: 'DENIED' } }, { status }), env)(request(), res);
    assert.equal(res.statusCode, status);
    assert.equal(JSON.parse(res.body).error.code, 'DENIED');
    assert.equal(res.headers['Cache-Control'], 'no-store');
  }
});

test('proxy forwards mutation body, concurrency and idempotency headers without cookies', async () => {
  const req = { ...request('/v1/admin/merchants/a?mode=review'), method: 'POST', body: { reason: 'review' } };
  Object.assign(req.headers, { 'content-type': 'application/json', 'idempotency-key': 'same-key', 'if-match': '2', cookie: 'private', origin: 'https://admin.example' });
  await proxy.createHandler(async (url, opts) => {
    assert.equal(url, 'https://core.example/v1/admin/merchants/a?mode=review');
    assert.equal(opts.headers['idempotency-key'], 'same-key');
    assert.equal(opts.headers['if-match'], '2');
    assert.equal(opts.headers.cookie, undefined);
    assert.equal(opts.headers.origin, undefined);
    assert.equal(opts.body, JSON.stringify(req.body));
    assert.equal(opts.redirect, 'error');
    return Response.json({ success: true });
  }, env)(req, response());
});

test('proxy rejects missing auth, foreign destinations and paths outside Core API', async () => {
  let calls = 0;
  const handler = proxy.createHandler(async () => { calls++; }, env);
  for (const path of ['https://evil.example', '//evil.example/v1/admin/me', '/internal/operations/run', '/v1/../internal/operations/run']) {
    const res = response(); await handler(request(path), res); assert.equal(res.statusCode, 400);
  }
  const res = response(); await handler({ ...request(), headers: {} }, res);
  assert.equal(res.statusCode, 401); assert.equal(calls, 0);
});

test('upstream network errors produce retryable structured responses', async () => {
  const res = response();
  await proxy.createHandler(async () => { throw Error('offline'); }, env)(request(), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.error.code, 'UPSTREAM_UNAVAILABLE');
});
