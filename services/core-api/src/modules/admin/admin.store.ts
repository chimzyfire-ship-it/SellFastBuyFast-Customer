import { textArray } from "./admin.policy.js";
import { sql, SQL } from "drizzle-orm";
import { db } from "../../db/client.js";
import { config, paystackConfigured } from "../../lib/config.js";
import { errors } from "../../lib/errors.js";
import {
  Actor,
  AdminRecord,
  sections,
  sectionPolicy,
  actionsFor,
  assertVersion,
  staffRoles,
  ListInput,
  cursorCodec,
  requestFingerprint,
} from "./admin.policy.js";
export const financeReady = () =>
  config.admin.financeEnabled && paystackConfigured;
export async function query<
  T extends Record<string, unknown> = Record<string, unknown>,
>(statement: SQL): Promise<T[]> {
  return (await db.execute(statement)) as unknown as T[];
}
export async function freshStaff(
  actor: Actor,
  roles: readonly string[] = staffRoles,
  requireMfa = true,
): Promise<Actor> {
  const [profile] = await query(
    sql`select p.id,a.status,a.valid_after from profiles p left join admin_staff_access a on a.id=p.id where p.id=${actor.id} for share of p`,
  );
  if (
    !profile ||
    profile.status === "revoked" ||
    (profile.valid_after &&
      (!actor.issuedAt ||
        actor.issuedAt <=
          Math.floor(new Date(String(profile.valid_after)).getTime() / 1000)))
  )
    throw errors.forbidden(
      "Your staff session is no longer valid. Sign in again.",
    );
  const grants = await query(
    sql`select role::text from user_roles where user_id=${actor.id}`,
  );
  const current = { ...actor, roles: grants.map((g) => String(g.role)) };
  if (!current.roles.some((r) => roles.includes(r))) throw errors.forbidden();
  if (requireMfa && config.admin.requireMfa && actor.aal !== "aal2")
    throw errors.forbidden(
      "Authenticator verification is required for staff operations.",
    );
  return current;
}
export async function audit(
  actor: Actor,
  section: string,
  id: string,
  action: string,
  note: string,
  requestId?: string,
) {
  await db.execute(
    sql`insert into audit_events(actor_id,action,resource_type,resource_id,metadata) values(${actor.id},${action},${sections[section]?.resource ?? section},${id},${JSON.stringify({ note, requestId })}::jsonb)`,
  );
}
export async function event(type: string, payload: Record<string, unknown>) {
  await db.execute(
    sql`insert into outbox_events(type,payload) values(${type},${JSON.stringify(payload)}::jsonb)`,
  );
}
export async function notify(
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
) {
  await db.execute(
    sql`insert into notifications(user_id,type,title,body,data) values(${userId},${type},${title},${body},${JSON.stringify(data)}::jsonb)`,
  );
}
export async function notifyMerchant(
  merchantId: string,
  type: string,
  body: string,
  data: Record<string, unknown>,
) {
  await db.execute(
    sql`insert into notifications(user_id,type,title,body,data) select distinct user_id,${type},'Marketplace review update',${body},${JSON.stringify(data)}::jsonb from merchant_members where merchant_id=${merchantId}`,
  );
}
export async function lockRecord(
  section: string,
  id: string,
  version: unknown,
  actor: Actor,
): Promise<AdminRecord> {
  const p = sectionPolicy(section, actor);
  let table = p.table;
  if (section === "access") {
    const inv = await query(
      sql`select id from admin_invitations where id=${id}`,
    );
    if (inv[0]) table = "admin_invitations";
  } else if (section === "refunds") {
    const review = await query(
      sql`select id from admin_refund_reviews where id=${id}`,
    );
    if (!review[0]) table = "refunds";
  }
  const [r] = await query(
    sql`select admin_version::text as version from ${sql.identifier(table)} where id=${id} for update`,
  );
  if (!r) throw errors.notFound();
  assertVersion(r.version, version);
  return readRecord(section, id, actor);
}
export async function touch(section: string, id: string) {
  const table = sections[section]?.table;
  if (!table || section === "audit")
    throw errors.validation("Unsupported record.");
  await db.execute(
    sql`update ${sql.identifier(table)} set updated_at=clock_timestamp() where id=${id}`,
  );
}
export async function readRecord(
  section: string,
  id: string,
  actor: Actor,
): Promise<AdminRecord> {
  sectionPolicy(section, actor);
  const [row] = await query(
    sql`select w.record,c.assigned_to,p.full_name as assigned_name,c.priority,c.due_at,c.escalated_at from admin_workspace_records w left join admin_case_metadata c on c.section=w.section and c.resource_id=w.id left join profiles p on p.id=c.assigned_to where w.section=${section} and w.id=${id}`,
  );
  if (!row) throw errors.notFound();
  return decorate(section, row, actor);
}
function decorate(
  section: string,
  row: Record<string, unknown>,
  actor: Actor,
): AdminRecord {
  const r: AdminRecord = {
    ...(row.record as AdminRecord),
    assignedTo: row.assigned_to ?? null,
    assignedToName: row.assigned_name ?? null,
    priority: row.priority ?? (row.record as AdminRecord).priority ?? "normal",
    dueAt: row.due_at ?? null,
    escalatedAt: row.escalated_at ?? null,
  };
  r.allowedActions = actionsFor(section, r, actor, financeReady());
  if (["payouts", "refunds"].includes(section) && !financeReady())
    r.actionBlockReason =
      "Financial processing is deferred until the dedicated payment integration is enabled and verified.";
  if (section === "refunds")
    r.actionBlockReason =
      "Refund decisions are retained for finance review. Provider refund dispatch remains in the dedicated payments release.";
  return r;
}
export async function listRecords(
  section: string,
  input: ListInput,
  actor: Actor,
) {
  sectionPolicy(section, actor);
  const column = input.sort === "updated_desc" ? "updated_at" : "created_at";
  const asc = input.sort === "created_asc";
  const scope = requestFingerprint(
    actor.id,
    section,
    { q: input.q, status: input.status, sort: input.sort },
    null,
  );
  // Dedicated secret is required in production; service secret is already server-only in development.
  const secret =
    config.admin.cursorSecret ||
    (!config.isProduction ? config.supabaseServiceRoleKey : "");
  if (secret.length < 32)
    throw errors.unavailable(
      "CURSOR_CONFIG_REQUIRED",
      "Secure pagination is not configured.",
    );
  const codec = cursorCodec(secret);
  const cursor = input.cursor ? codec.decode(input.cursor, scope) : null;
  const timestamp = sql`w.${sql.identifier(column)}`;
  const conditions = [sql`w.section=${section}`];
  if (input.status) conditions.push(sql`w.status=${input.status}`);
  if (input.q) {
    const term = "%" + input.q.replace(/[\\%_]/g, "\\$&") + "%";
    conditions.push(
      sql`concat_ws(' ',w.id::text,w.record->>'name',w.record->>'title',w.record->>'subject',w.record->>'reference',w.record->>'email',w.record->>'merchantName',w.record->>'customerName',w.record->>'actorName') ilike ${term}`,
    );
  }
  if (cursor)
    conditions.push(
      asc
        ? sql`(${timestamp},w.id)>(${cursor.key}::timestamptz,${cursor.id}::uuid)`
        : sql`(${timestamp},w.id)<(${cursor.key}::timestamptz,${cursor.id}::uuid)`,
    );
  const rows = await query(
    sql`select w.record,${timestamp}::text as sort_key,w.id,c.assigned_to,p.full_name as assigned_name,c.priority,c.due_at,c.escalated_at from admin_workspace_records w left join admin_case_metadata c on c.section=w.section and c.resource_id=w.id left join profiles p on p.id=c.assigned_to where ${sql.join(conditions, sql` and `)} order by ${timestamp} ${asc ? sql`asc` : sql`desc`},w.id ${asc ? sql`asc` : sql`desc`} limit ${input.limit + 1}`,
  );
  const page = rows.slice(0, input.limit);
  const last = page.at(-1);
  return {
    items: page.map((r) => decorate(section, r, actor)),
    nextCursor:
      rows.length > input.limit && last
        ? codec.encode(scope, String(last.sort_key), String(last.id))
        : null,
  };
}
export async function detailRecord(section: string, id: string, actor: Actor) {
  const record = await readRecord(section, id, actor);
  const resource = sections[section].resource;
  const activity = await query(
    sql`select a.id,a.action,p.full_name as "actorName",a.created_at as "createdAt",a.metadata->>'note' as note from audit_events a left join profiles p on p.id=a.actor_id where a.resource_id=${id} and a.resource_type=any(${textArray([resource, section, ...(section === "merchants" ? ["merchant_verification"] : [])])}) order by a.created_at desc,a.id desc limit 200`,
  );
  const notes = await query(
    sql`select n.id,n.note,p.full_name as "actorName",n.created_at as "createdAt",'Internal note' as title from admin_notes n join profiles p on p.id=n.actor_id where n.section=${section} and n.resource_id=${id} order by n.created_at,n.id`,
  );
  const data: Record<string, unknown> = {
    record,
    activity,
    notes,
    media: [],
    documents: [],
    messages: [],
    variants: [],
    items: [],
    tracking: [],
    entries: [],
  };
  if (section === "catalogue") {
    data.media = await query(
      sql`select id,media_url as url,alt_text as alt from product_media where product_id=${id} and media_type='image' order by sort_order,id`,
    );
    data.variants = await query(
      sql`select v.id,v.title as name,v.sku,v.price_minor::text as "priceMinor",coalesce(i.available_quantity,0) as available,coalesce(i.reserved_quantity,0) as reserved from product_variants v left join inventory_levels i on i.variant_id=v.id where v.product_id=${id} order by v.created_at,v.id`,
    );
  }
  if (section === "merchants") {
    const [v] = await query(
      sql`select id,id_document_url,utility_bill_url,created_at from merchant_verifications where merchant_id=${id} order by updated_at desc limit 1`,
    );
    if (v)
      data.documents = [
        ["identity", v.id_document_url, "Identity document"],
        ["utility", v.utility_bill_url, "Utility bill"],
      ]
        .filter(([, url]) => url)
        .map(([kind, , name]) => ({
          id: `${v.id}:${kind}`,
          name,
          type: kind,
          createdAt: v.created_at,
        }));
  }
  if (section === "orders") {
    data.items = await query(
      sql`select id,product_title as name,variant_title as "variantName",quantity,total_minor::text as "totalMinor" from order_lines where order_id=${id} order by created_at,id`,
    );
    data.tracking = await query(
      sql`select e.id,e.status as title,e.note,e.occurred_at as "createdAt" from shipment_events e join shipments s on s.id=e.shipment_id where s.order_id=${id} order by e.occurred_at,e.id`,
    );
    const [s] = await query(
      sql`select id,pickup_evidence_url,delivery_evidence_url,created_at from shipments where order_id=${id}`,
    );
    if (s)
      data.documents = [
        ["pickup", s.pickup_evidence_url, "Pickup evidence"],
        ["delivery", s.delivery_evidence_url, "Delivery evidence"],
      ]
        .filter(([, url]) => url)
        .map(([kind, , name]) => ({
          id: `${s.id}:${kind}`,
          name,
          type: kind,
          createdAt: s.created_at,
        }));
  }
  if (section === "returns") {
    const [r] = await query(
      sql`select evidence_url,created_at from return_requests where id=${id}`,
    );
    if (r?.evidence_url)
      data.documents = [
        {
          id: `${id}:return`,
          name: "Customer return evidence",
          type: "return",
          createdAt: r.created_at,
        },
      ];
  }
  if (section === "support")
    data.messages = await query(
      sql`select m.id,m.body,m.sender_role as "senderRole",p.full_name as "senderName",m.created_at as "createdAt" from support_ticket_messages m join profiles p on p.id=m.sender_id where m.ticket_id=${id} order by m.created_at,m.id`,
    );
  if (section === "content")
    data.media = [
      { url: record.imageUrl, alt: record.altText, label: record.title },
    ];
  if (["payouts", "refunds", "reconciliation"].includes(section)) {
    const linked = String(
      record.payoutId ?? (section === "payouts" ? id : (record.orderId ?? "")),
    );
    data.entries = await query(
      sql`select l.id,e.reference,a.account_name as "accountName",l.direction,l.amount_minor::text as "amountMinor",l.created_at as "createdAt" from journal_lines l join journal_entries e on e.id=l.journal_entry_id join ledger_accounts a on a.id=l.account_id where (e.reference=any(${textArray([`payout-hold:${linked}`, `payout-dispatch:${linked}`, `payout-settled:${linked}`, `payout-returned:${linked}`, `payout-rejected:${linked}`, `payment:${linked}`, `escrow-release:${linked}`])}) or e.reference in (select 'payment:'||provider_reference from payment_attempts where order_id=${record.orderId ?? null}::uuid)) order by l.created_at,l.id`,
    );
  }
  if (section === "payouts") {
    const balances = await query(
      sql`select a.account_code,coalesce(sum(case when l.direction='credit' then l.amount_minor else -l.amount_minor end),0)::text as balance from ledger_accounts a left join journal_lines l on l.account_id=a.id where a.merchant_id=${record.merchantId} group by a.id`,
    );
    record.availableMinor =
      balances.find((b) => String(b.account_code).endsWith(":available"))
        ?.balance ?? null;
    record.heldMinor =
      balances.find((b) => String(b.account_code).endsWith(":hold"))?.balance ??
      null;
  }
  return data;
}
