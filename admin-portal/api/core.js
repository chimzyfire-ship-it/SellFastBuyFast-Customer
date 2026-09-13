// Same-origin transport only. Core API remains responsible for authentication,
// staff roles, MFA and every business operation; no privileged credentials here.
function createHandler(fetcher = fetch, env = process.env) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const fail = (status, code, message) => res.status(status).json({ success: false, error: { code, message } });
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method))
      return fail(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
    if (typeof req.headers.authorization !== 'string' || !/^Bearer \S+$/i.test(req.headers.authorization))
      return fail(401, 'UNAUTHORIZED', 'Sign in again to continue.');
    let target;
    try {
      const base = new URL(env.ADMIN_API_URL);
      if (base.protocol !== 'https:' || base.username || base.password)
        throw new Error('Invalid upstream');
      const path = req.query.path;
      if (typeof path !== 'string' || !path.startsWith('/v1/') || path.includes('\\') || path.includes('#'))
        return fail(400, 'INVALID_PATH', 'Invalid workspace request.');
      target = new URL(path, base.origin);
      if (target.origin !== base.origin || !target.pathname.startsWith('/v1/'))
        return fail(400, 'INVALID_PATH', 'Invalid workspace request.');
    } catch {
      return fail(503, 'CONFIGURATION_ERROR', 'Workspace connection is not configured.');
    }
    const headers = {};
    for (const name of ['authorization', 'content-type', 'idempotency-key', 'if-match']) {
      if (typeof req.headers[name] === 'string') headers[name] = req.headers[name];
    }
    try {
      const upstream = await fetcher(target.href, {
        method: req.method, headers,
        body: req.method === 'GET' || req.body == null ? undefined :
          typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body),
        redirect: 'error', signal: AbortSignal.timeout(15000),
      });
      for (const name of ['content-type', 'x-request-id', 'retry-after']) {
        const value = upstream.headers.get(name);
        if (value) res.setHeader(name, value);
      }
      return res.status(upstream.status).send(await upstream.text());
    } catch {
      return fail(502, 'UPSTREAM_UNAVAILABLE', 'The workspace service is temporarily unavailable. Please retry.');
    }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
