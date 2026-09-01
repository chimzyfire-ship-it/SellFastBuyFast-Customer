import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { config } from '../lib/config.js';

const connectionString = config.databaseUrl;

if (!connectionString) {
  console.warn('⚠️ DATABASE_URL environment variable is not defined.');
}

// Connection pooler with max 10 connections for lightweight backend
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false // Required for Supabase Transaction Pooler (Supavisor)
});

export const db = drizzle(client, { schema });
export { schema };
export function closeDatabase(): Promise<void> {
  return client.end();
}
