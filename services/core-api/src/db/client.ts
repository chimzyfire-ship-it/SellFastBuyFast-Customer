import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
import { config } from "../lib/config.js";

const connectionString = config.databaseUrl;

if (!connectionString) {
  console.warn("⚠️ DATABASE_URL environment variable is not defined.");
}

// Connection pooler with max 10 connections for lightweight backend
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false, // Required for Supabase Transaction Pooler (Supavisor)
});

const rootDatabase = drizzle(client, { schema });
export type Database = typeof rootDatabase;
const transactionContext = new AsyncLocalStorage<Database>();
/** All queries in an idempotent command share its transaction, including legacy services. */
export function withDatabase<T>(database: Database, work: () => T): T {
  return transactionContext.run(database, work);
}
export const db = new Proxy(rootDatabase, {
  get(_target, property) {
    const database = transactionContext.getStore() ?? rootDatabase;
    const value = Reflect.get(database, property);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
export { schema };
export function closeDatabase(): Promise<void> {
  return client.end();
}

/** Run helpers that use the shared database inside this transaction. */
export function scopedTransaction<T>(work: () => Promise<T>): Promise<T> {
  return db.transaction((tx) => withDatabase(tx as unknown as Database, work));
}
