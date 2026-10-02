import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const envPath = path.join(root, '.env');
const operationsPath = path.join(root, '.operations.secrets.local');
const environment = dotenv.parse(readFileSync(envPath));
const saved = existsSync(operationsPath) ? dotenv.parse(readFileSync(operationsPath)) : {};
const projectRef = environment.SUPABASE_PROJECT_REF?.trim();
const accessToken = environment.SUPABASE_ACCESS_TOKEN?.trim();
const currentDatabaseUrl = (saved.DATABASE_URL || environment.DATABASE_URL || '').trim();

if (!projectRef || !accessToken || !currentDatabaseUrl) {
  throw Error('SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, and DATABASE_URL must be available in the secure local environment.');
}

const existingUrl = new URL(currentDatabaseUrl);
if (!['postgres:', 'postgresql:'].includes(existingUrl.protocol) || !existingUrl.hostname || !existingUrl.username) {
  throw Error('DATABASE_URL must be a complete PostgreSQL connection URL.');
}

if (!process.argv.includes('--apply')) {
  console.log('Database password rotation prepared.', {
    projectRef,
    host: existingUrl.host,
    username: existingUrl.username,
    next: 'Run with --apply, then deploy with configure-release.mjs --apply --only=services/core-api.',
  });
  process.exit(0);
}

// URL-safe entropy avoids interpolation and escaping hazards in PostgreSQL URLs.
const password = crypto.randomBytes(36).toString('base64url');
const nextDatabaseUrl = new URL(existingUrl);
nextDatabaseUrl.password = password;

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/password`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ password }),
  signal: AbortSignal.timeout(60_000),
});
if (!response.ok) {
  throw Error(`Supabase rejected the database password rotation (${response.status}). No secret was logged.`);
}

saved.DATABASE_URL = nextDatabaseUrl.toString();
writeFileSync(
  operationsPath,
  Object.entries(saved).map(([key, value]) => `${key}=${value}`).join('\n') + '\n',
  { mode: 0o600 },
);

console.log('Production database password rotated. The replacement connection URL is stored only in .operations.secrets.local.');
