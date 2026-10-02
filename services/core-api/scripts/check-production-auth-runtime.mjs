import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const env = dotenv.parse(readFileSync(path.join(root, '.env')));
const apiBaseUrl = 'https://sell-fast-buy-fast-core-api.vercel.app';

async function request(pathname, options = {}) {
  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    ...options,
    signal: AbortSignal.timeout(30_000),
  });
  let body = null;
  try { body = await response.json(); } catch {}
  return { response, body };
}

const health = await request('/health');
const ready = await request('/ready');
const checks = {
  apiDatabaseHealthy: health.response.status === 200 && health.body?.status === 'healthy',
  apiReady: ready.response.status === 200 && ready.body?.status === 'ready',
};

const email = process.env.MERCHANT_AUTH_SMOKE_EMAIL?.trim();
const password = process.env.MERCHANT_AUTH_SMOKE_PASSWORD;
if (email || password) {
  if (!email || !password) throw Error('Set both MERCHANT_AUTH_SMOKE_EMAIL and MERCHANT_AUTH_SMOKE_PASSWORD to run the authenticated smoke check.');
  const authResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(30_000),
  });
  const auth = await authResponse.json();
  const workspace = auth.access_token
    ? await request('/v1/vendor/me', { headers: { Authorization: `Bearer ${auth.access_token}` } })
    : { response: { status: 0 }, body: null };
  checks.confirmedCredentialCanReachWorkspace = authResponse.status === 200 && workspace.response.status === 200 && workspace.body?.success === true;
  checks.newMerchantGetsOnboardingContract = checks.confirmedCredentialCanReachWorkspace && Array.isArray(workspace.body?.data?.merchants);
}

console.log(JSON.stringify({ checks, healthStatus: health.response.status, readyStatus: ready.response.status }, null, 2));
const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
if (failures.length) throw Error(`Production auth runtime check failed: ${failures.join(', ')}.`);
