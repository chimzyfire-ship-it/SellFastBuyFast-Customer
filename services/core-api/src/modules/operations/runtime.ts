import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { query } from "../admin/admin.store.js";

export async function leasedJob(name: string, work: () => Promise<unknown>) {
  const token = crypto.randomUUID();
  const rows =
    await query(sql`insert into operations_runtime(name,lease_token,lease_until,last_started_at)
    values(${name},${token},clock_timestamp()+interval '5 minutes',clock_timestamp())
    on conflict(name) do update set lease_token=excluded.lease_token,lease_until=excluded.lease_until,last_started_at=excluded.last_started_at,updated_at=clock_timestamp()
    where operations_runtime.lease_until<clock_timestamp() returning name`);
  if (!rows.length) return { name, status: "busy" };
  try {
    const result = await work();
    await db.execute(
      sql`update operations_runtime set lease_until=to_timestamp(0),last_succeeded_at=clock_timestamp(),last_error=null,updated_at=clock_timestamp() where name=${name} and lease_token=${token}`,
    );
    return { name, status: "succeeded", result };
  } catch (error) {
    await db.execute(
      sql`update operations_runtime set lease_until=to_timestamp(0),last_error='Task failed; inspect the service request reference and retry.',updated_at=clock_timestamp() where name=${name} and lease_token=${token}`,
    );
    throw error;
  }
}
export async function operationalHealth() {
  const rows = await query(
    sql`select name,last_succeeded_at as "lastSucceededAt",last_error is not null as failed from operations_runtime where name='nonpayment-maintenance'`,
  );
  const row = rows[0];
  return {
    status: !row
      ? "not_started"
      : row.failed
        ? "failed"
        : !row.lastSucceededAt ||
            Date.now() - new Date(String(row.lastSucceededAt)).getTime() >
              600000
          ? "stale"
          : "healthy",
    lastSucceededAt: row?.lastSucceededAt ?? null,
  };
}
export function validRunnerSecret(header: string | undefined, secret: string) {
  if (secret.length < 32 || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`),
    actual = Buffer.from(header);
  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected)
  );
}
