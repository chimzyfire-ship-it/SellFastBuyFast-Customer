import test from 'node:test';
import assert from 'node:assert/strict';
import { AdminApi } from '../api.mjs';

test('native browser fetch receives the global receiver, not the AdminApi instance', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async function (url, options) {
    if (this !== globalThis) throw new TypeError('Illegal invocation');
    calls++;
    assert.equal(url, '/api/core?path=%2Fv1%2Fadmin%2Fme');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return Response.json({ success: true, data: { id: 'staff', roles: ['operations_admin'] } });
  };
  try {
    const api = new AdminApi({ apiUrl: 'https://core.example', apiProxyPath: '/api/core' }, {
      getSession: async () => ({ data: { session: { access_token: 'test-token' } } }),
    });
    assert.equal((await api.request('/v1/admin/me')).id, 'staff');
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
