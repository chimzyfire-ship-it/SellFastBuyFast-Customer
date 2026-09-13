import { textArray } from "./admin.policy.js";
import { sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db, scopedTransaction } from "../../db/client.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { config } from "../../lib/config.js";
import { PaystackClient } from "../../lib/paystack.js";
import { event, financeReady, query } from "./admin.store.js";
export async function advanceCampaigns() {
  return scopedTransaction(async () => {
    const rows = await query(
      sql`update admin_campaigns set status=case when ends_at<=clock_timestamp() then 'archived' else 'published' end where (status='scheduled' and starts_at<=clock_timestamp()) or (status='published' and ends_at<=clock_timestamp()) returning id,status`,
    );
    for (const r of rows)
      await event("admin.content.schedule_changed", {
        id: r.id,
        status: r.status,
      });
    await db.execute(
      sql`update admin_invitations set status='expired' where status='invited' and expires_at<=clock_timestamp()`,
    );
    return rows.length;
  });
}
export async function storefrontContent() {
  // Time and target eligibility are checked on every read, even if the worker is delayed.
  return query(
    sql`select c.id,c.title,c.placement,c.target_type as "targetType",c.target_id as "targetId",c.image_url as "imageUrl",c.alt_text as "altText",c.starts_at as "startsAt",c.ends_at as "endsAt",coalesce(cat.slug,p.slug,m.slug) as "targetSlug" from admin_campaigns c left join categories cat on c.target_type='category' and cat.id=c.target_id left join products p on c.target_type='product' and p.id=c.target_id left join merchants pm on pm.id=p.merchant_id left join merchants m on c.target_type='merchant' and m.id=c.target_id where c.status in ('published','scheduled') and c.starts_at<=clock_timestamp() and c.ends_at>clock_timestamp() and ((c.target_type='category' and cat.is_active) or (c.target_type='product' and p.status='published' and pm.status='active' and pm.registration_state='registered') or (c.target_type='merchant' and m.status='active' and m.registration_state='registered')) order by c.priority desc,c.created_at desc,c.id limit 30`,
  );
}
async function claimJob(invitationsOnly = false) {
  const types = [
    "admin.invitation_email",
    ...(!invitationsOnly && financeReady()
      ? ["admin.reconciliation_recheck"]
      : []),
  ];
  return scopedTransaction(async () => {
    const [job] = await query(
      sql`select id,type,payload,attempts from outbox_events where type=any(${textArray(types)}) and status in ('pending','failed','processing') and available_at<=clock_timestamp() and attempts<10 order by created_at,id limit 1 for update skip locked`,
    );
    if (!job) return null;
    await db.execute(
      sql`update outbox_events set status='processing',attempts=attempts+1,available_at=clock_timestamp()+interval '5 minutes' where id=${job.id}`,
    );
    return job;
  });
}
export async function detectReconciliationGaps() {
  // Only persisted, signed provider events are eligible; never trust an admin-supplied amount.
  const rows =
    await query(sql`insert into admin_reconciliation(provider_event_id,provider_reference,kind,order_id,payout_id,provider_amount_minor,ledger_amount_minor,reason)
    select e.id,e.payload->'data'->>'reference',case when e.event_type='charge.success' then 'payment' else 'payout' end,p.order_id,t.id,
      case when e.payload->'data'->>'amount' ~ '^[0-9]{1,18}$' then (e.payload->'data'->>'amount')::bigint else null end,j.debits,
      case when j.debits is null then 'Provider event has no matching ledger entry' else 'Provider amount or ledger balance differs' end
    from provider_events e left join payment_attempts p on p.provider_reference=e.payload->'data'->>'reference'
    left join payouts t on t.provider_reference=e.payload->'data'->>'reference'
    left join lateral(select sum(case when l.direction='debit' then l.amount_minor else 0 end)::bigint debits,sum(case when l.direction='credit' then l.amount_minor else 0 end)::bigint credits from journal_entries je join journal_lines l on l.journal_entry_id=je.id where je.reference=case when e.event_type='charge.success' then 'payment:'||(e.payload->'data'->>'reference') else 'payout-settled:'||t.id::text end) j on true
    where e.event_type in ('charge.success','transfer.success') and e.created_at<clock_timestamp()-interval '5 minutes' and coalesce(e.payload->'data'->>'reference','')<>''
      and (j.debits is null or j.debits<>j.credits or j.debits::text is distinct from (e.payload->'data'->>'amount'))
    on conflict(provider_event_id) do nothing returning id`);
  return rows.length;
}
async function recheck(id: string) {
  const [r] = await query(
    sql`select * from admin_reconciliation where id=${id}`,
  );
  if (!r || r.status !== "recheck_pending") return;
  const verified =
    r.kind === "payment"
      ? await PaystackClient.verifyTransaction(String(r.provider_reference))
      : await PaystackClient.verifyTransfer(String(r.provider_reference));
  const raw = (verified.raw ?? {}) as Record<string, unknown>;
  const amount = "amountMinor" in verified ? verified.amountMinor : raw.amount;
  if (!Number.isSafeInteger(amount) || Number(amount) < 0)
    throw new Error("Provider amount could not be verified.");
  if (raw.currency && raw.currency !== "NGN")
    throw new Error("Provider currency does not match the ledger.");
  await scopedTransaction(async () => {
    const [current] = await query(
      sql`select * from admin_reconciliation where id=${id} for update`,
    );
    if (!current || current.status !== "recheck_pending") return;
    const reference =
      current.kind === "payment"
        ? `payment:${current.provider_reference}`
        : `payout-settled:${current.payout_id}`;
    const [ledger] = await query(
      sql`select sum(case when l.direction='debit' then l.amount_minor else 0 end)::text as debits,sum(case when l.direction='credit' then l.amount_minor else 0 end)::text as credits from journal_entries e join journal_lines l on l.journal_entry_id=e.id where e.reference=${reference}`,
    );
    const matched =
      verified.status === "success" &&
      ledger.debits === String(amount) &&
      ledger.credits === String(amount);
    await db.execute(
      sql`update admin_reconciliation set status=${matched ? "matched" : "investigating"},provider_amount_minor=${String(amount)}::bigint,ledger_amount_minor=${ledger.debits ?? null}::bigint,last_checked_at=clock_timestamp(),reason=${matched ? "Provider verification matches the balanced journal" : "Verified provider outcome still differs from the ledger"} where id=${id}`,
    );
    await db.execute(
      sql`insert into audit_events(action,resource_type,resource_id,metadata) values('reconciliation.provider_rechecked','reconciliation',${id},${JSON.stringify({ status: matched ? "matched" : "investigating" })}::jsonb)`,
    );
  });
}
export async function processAdminOutbox(
  options: { invitationsOnly?: boolean } = {},
) {
  const job = await claimJob(options.invitationsOnly);
  if (!job) return false;
  try {
    const payload = job.payload as Record<string, string>;
    if (job.type === "admin.invitation_email") {
      const [inv] = await query(
        sql`select i.* from admin_invitations i where i.id=${payload.invitationId} and i.status='invited' and i.delivered_at is null and i.expires_at>clock_timestamp() and exists(select 1 from user_roles u where u.user_id=i.invited_by and u.role='security_admin')`,
      );
      if (inv) {
        if (
          !config.admin.smtpUrl ||
          !config.admin.mailFrom ||
          !config.admin.portalUrl
        )
          throw Error("Invitation delivery is not configured");
        const portal = new URL(config.admin.portalUrl);
        if (portal.protocol !== "https:" && config.isProduction)
          throw Error("Staff portal must use HTTPS");
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: String(inv.email),
          options: { redirectTo: portal.href },
        });
        if (error || !data.properties?.hashed_token)
          throw Error("Identity invitation link could not be created");
        portal.hash =
          "/accept-invitation?token=" +
          encodeURIComponent(data.properties.hashed_token);
        const smtp = new URL(config.admin.smtpUrl);
        if (!["smtp:", "smtps:"].includes(smtp.protocol))
          throw Error("Invalid SMTP URL");
        const transport = nodemailer.createTransport({
          host: smtp.hostname,
          port: Number(smtp.port || (smtp.protocol === "smtps:" ? 465 : 587)),
          secure: smtp.protocol === "smtps:",
          requireTLS: true,
          auth: {
            user: decodeURIComponent(smtp.username),
            pass: decodeURIComponent(smtp.password),
          },
          connectionTimeout: 15000,
          socketTimeout: 30000,
        });
        try {
          await transport.sendMail({
            from: config.admin.mailFrom,
            to: String(inv.email),
            subject: "Your SellFastBuyFast operations invitation",
            text: `You have been invited to the SellFastBuyFast operations workspace. Sign in using this link and set up your authenticator to continue:\n\n${portal.href}\n\nThis staff invitation expires ${new Date(String(inv.expires_at)).toISOString()}. If you were not expecting this invitation, you can ignore it.`,
          });
        } finally {
          transport.close();
        }
        await db.execute(
          sql`update admin_invitations set delivered_at=clock_timestamp() where id=${inv.id} and status='invited'`,
        );
      }
    } else await recheck(payload.id);
    await db.execute(
      sql`update outbox_events set status='processed',processed_at=clock_timestamp(),last_error=null where id=${job.id}`,
    );
    return true;
  } catch {
    const delay = Math.min(3600, 30 * 2 ** Number(job.attempts));
    await db.execute(
      sql`update outbox_events set status='failed',last_error='Delivery or provider verification failed; retry scheduled.',available_at=clock_timestamp()+${delay}*interval '1 second' where id=${job.id}`,
    );
    return false;
  }
}
