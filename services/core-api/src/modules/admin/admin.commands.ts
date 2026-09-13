import { textArray } from "./admin.policy.js";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { errors } from "../../lib/errors.js";
import { config } from "../../lib/config.js";
import {
  Actor,
  CampaignInput,
  Note,
  sectionPolicy,
  staffRoles,
} from "./admin.policy.js";
import {
  audit,
  event,
  financeReady,
  freshStaff,
  lockRecord,
  notify,
  notifyMerchant,
  query,
  touch,
} from "./admin.store.js";
const terminal = ["completed", "cancelled", "refunded"];
export async function queueRefundReview(
  orderId: string,
  actorId: string,
  reason: string,
  returnId: string | null = null,
  disputeId: string | null = null,
) {
  await db.execute(
    sql`insert into admin_refund_reviews(order_id,return_id,dispute_id,amount_minor,reason,requested_by) select id,${returnId}::uuid,${disputeId}::uuid,subtotal_minor,${reason},${actorId}::uuid from orders where id=${orderId} and subtotal_minor>0 on conflict(order_id) where status in ('review_required','approved') do nothing`,
  );
}
export async function assertCampaignTarget(
  input: z.infer<typeof CampaignInput>,
) {
  const url = new URL(input.imageUrl);
  if (url.protocol !== "https:" || url.username || url.password)
    throw errors.validation("Campaign images require a secure HTTPS URL.");
  let rows;
  if (input.targetType === "category")
    rows = await query(
      sql`select id from categories where id=${input.targetId} and is_active=true for share`,
    );
  else if (input.targetType === "merchant")
    rows = await query(
      sql`select id from merchants where id=${input.targetId} and status='active' and registration_state='registered' for share`,
    );
  else
    rows = await query(
      sql`select p.id from products p join merchants m on m.id=p.merchant_id where p.id=${input.targetId} and p.status='published' and m.status='active' and m.registration_state='registered' for share of p,m`,
    );
  if (!rows[0])
    throw errors.validation(
      "The campaign destination is not currently available to shoppers.",
    );
  // Only already registered product assets can be featured; URL syntax alone is not ownership.
  const asset = await query(
    sql`select pm.id from product_media pm join products p on p.id=pm.product_id join merchants m on m.id=p.merchant_id where pm.media_url=${input.imageUrl} and pm.media_type='image' and p.status='published' and m.status='active' and m.registration_state='registered' limit 1 for share of pm,p,m`,
  );
  if (!asset[0])
    throw errors.validation(
      "Select an image already registered in the catalogue.",
    );
}
export async function saveCampaign(
  actor: Actor,
  body: unknown,
  id?: string,
  version?: unknown,
  requestId?: string,
) {
  const input = CampaignInput.parse(body);
  await freshStaff(actor, ["operations_admin"]);
  if (id) {
    const r = await lockRecord("content", id, version, actor);
    if (r.status !== "draft")
      throw errors.conflict(
        "CAMPAIGN_NOT_DRAFT",
        "Only a draft can be edited.",
      );
  }
  await assertCampaignTarget(input);
  let result;
  if (id)
    result = await query(
      sql`update admin_campaigns set title=${input.title},placement=${input.placement},target_type=${input.targetType},target_id=${input.targetId},image_url=${input.imageUrl},alt_text=${input.altText},priority=${input.priority},starts_at=${input.startsAt}::timestamptz,ends_at=${input.endsAt}::timestamptz where id=${id} returning id`,
    );
  else
    result = await query(
      sql`insert into admin_campaigns(title,placement,target_type,target_id,image_url,alt_text,priority,starts_at,ends_at,created_by) values(${input.title},${input.placement},${input.targetType},${input.targetId},${input.imageUrl},${input.altText},${input.priority},${input.startsAt}::timestamptz,${input.endsAt}::timestamptz,${actor.id}) returning id`,
    );
  const recordId = String(result[0].id);
  await audit(
    actor,
    "content",
    recordId,
    id ? "content.draft_updated" : "content.draft_created",
    "Campaign draft saved",
    requestId,
  );
  return { id: recordId };
}
const actionKeys: Record<string, string> = {
  restrict: "restrict_customer",
  restore: "restore_customer",
  "privacy-review": "review_privacy",
  withdraw: "unpublish_product",
  suspend: "suspend_merchant",
  resolve: "resolve_dispute",
  reopen: "reopen_ticket",
  investigate: "investigate",
  recheck: "recheck",
  publish: "publish_content",
  archive: "archive_content",
};
export async function decide(
  actor: Actor,
  section: string,
  id: string,
  action: string,
  version: unknown,
  body: unknown,
  requestId?: string,
) {
  actor = await freshStaff(actor, sectionPolicy(section, actor).roles);
  const input = z
    .object({
      note: Note,
      outcome: z.enum(["resolved_buyer", "resolved_merchant"]).optional(),
    })
    .strict()
    .parse(body);
  // Order lock always precedes case locks, matching checkout/return/dispute services.
  let order: Record<string, unknown> | undefined;
  if (["returns", "disputes"].includes(section)) {
    const table = section === "returns" ? "return_requests" : "disputes";
    [order] = await query(
      sql`select o.* from orders o join ${sql.identifier(table)} c on c.order_id=o.id where c.id=${id} for update of o`,
    );
    if (!order) throw errors.notFound();
  }
  const r = await lockRecord(section, id, version, actor);
  const key =
    section === "merchants" && action === "restore"
      ? "restore_merchant"
      : action === "escalate"
        ? section === "returns"
          ? "escalate_return"
          : "escalate_order"
        : actionKeys[action];
  if (!key || !r.allowedActions?.includes(key))
    throw errors.conflict(
      "ACTION_NOT_AVAILABLE",
      "This action is not eligible for this record.",
    );
  if (section === "customers") {
    if (action === "privacy-review")
      await db.execute(
        sql`update admin_customer_controls set privacy_review_started_at=clock_timestamp(),updated_at=clock_timestamp() where id=${id} and deletion_requested_at is not null`,
      );
    else
      await db.execute(
        sql`insert into admin_customer_controls(id,restricted) values(${id},${action === "restrict"}) on conflict(id) do update set restricted=excluded.restricted,updated_at=clock_timestamp()`,
      );
    await touch(section, id);
    await notify(id, `account_${action}`, "Account review update", input.note, {
      customerId: id,
    });
  } else if (section === "merchants") {
    await db.execute(
      sql`update merchants set status=${action === "suspend" ? "suspended" : "active"} where id=${id}`,
    );
    await notifyMerchant(id, `merchant.${action}`, input.note, {
      merchantId: id,
    });
  } else if (section === "catalogue") {
    await db.execute(
      sql`update products set status='archived',rejection_reason=${input.note},moderated_by=${actor.id},moderated_at=clock_timestamp() where id=${id}`,
    );
    await db.execute(
      sql`insert into product_moderation_logs(product_id,action,note,actor_id) values(${id},'withdrawn',${input.note},${actor.id})`,
    );
    await notifyMerchant(
      String(r.merchantId),
      "catalog.product_withdrawn",
      input.note,
      { productId: id },
    );
  } else if (section === "orders") {
    await db.execute(
      sql`insert into admin_case_metadata(section,resource_id,priority,escalated_at) values('orders',${id},'high',clock_timestamp()) on conflict(section,resource_id) do update set priority='high',escalated_at=clock_timestamp()`,
    );
    await touch(section, id);
    await notifyMerchant(
      String(r.merchantId),
      "delivery.escalated",
      input.note,
      { orderId: id },
    );
  } else if (section === "returns") {
    if (terminal.includes(String(order!.status)))
      throw errors.conflict(
        "ORDER_TERMINAL",
        "A terminal order cannot be escalated through a return.",
      );
    const [created] = await query(
      sql`insert into disputes(order_id,opened_by,reason,return_id) values(${order!.id},${actor.id},${input.note},${id}) returning id`,
    );
    if (order!.status !== "disputed") {
      await db.execute(
        sql`update orders set status='disputed' where id=${order!.id}`,
      );
      await db.execute(
        sql`insert into order_status_events(order_id,from_status,to_status,actor_id,note) values(${order!.id},${order!.status},'disputed',${actor.id},${input.note})`,
      );
    }
    await touch(section, id);
    await notify(
      String(order!.buyer_id),
      "dispute_opened",
      "Return escalated",
      input.note,
      { orderId: order!.id, disputeId: created.id },
    );
    await notifyMerchant(
      String(order!.merchant_id),
      "dispute.opened",
      input.note,
      { orderId: order!.id, disputeId: created.id },
    );
  } else if (section === "disputes") {
    if (!input.outcome) throw errors.validation("Choose a dispute outcome.");
    await db.execute(
      sql`update disputes set status=${input.outcome},resolution_note=${input.note},resolved_by=${actor.id},resolved_at=clock_timestamp() where id=${id}`,
    );
    if (input.outcome === "resolved_buyer")
      await queueRefundReview(
        String(order!.id),
        actor.id,
        input.note,
        null,
        id,
      );
    else if (order!.status === "disputed") {
      if (r.returnId)
        await db.execute(
          sql`update return_requests set status='rejected',decision_note=${input.note},decided_by=${actor.id},decided_at=clock_timestamp() where id=${r.returnId} and status='requested'`,
        );
      const [previous] = await query(
        sql`select from_status::text as status from order_status_events where order_id=${order!.id} and to_status='disputed' order by created_at desc,id desc limit 1`,
      );
      if (
        !previous ||
        !["processing", "in_transit", "delivered"].includes(
          String(previous.status),
        )
      )
        throw errors.conflict(
          "ORDER_RESTORE_UNSAFE",
          "The prior fulfilment state cannot be established.",
        );
      await db.execute(
        sql`update orders set status=${previous.status} where id=${order!.id}`,
      );
      await db.execute(
        sql`insert into order_status_events(order_id,from_status,to_status,actor_id,note) values(${order!.id},'disputed',${previous.status},${actor.id},${input.note})`,
      );
    }
    await notify(
      String(order!.buyer_id),
      "dispute_resolved",
      "Dispute decision",
      input.note,
      { disputeId: id, orderId: order!.id },
    );
    await notifyMerchant(
      String(order!.merchant_id),
      "dispute.resolved",
      input.note,
      { disputeId: id, orderId: order!.id },
    );
  } else if (section === "support") {
    await db.execute(
      sql`update support_tickets set status='open' where id=${id}`,
    );
    await notify(
      String(r.customerId),
      "support_reopened",
      "Conversation reopened",
      input.note,
      { ticketId: id, orderId: r.orderId },
    );
  } else if (section === "reconciliation") {
    if (action === "recheck" && !financeReady())
      throw errors.unavailable(
        "PAYMENTS_DEFERRED",
        "Provider reconciliation is not enabled.",
      );
    await db.execute(
      sql`update admin_reconciliation set status=${action === "investigate" ? "investigating" : "recheck_pending"} where id=${id}`,
    );
    if (action === "recheck")
      await event("admin.reconciliation_recheck", { id });
  } else if (section === "content") {
    if (action === "publish") {
      const campaign = CampaignInput.parse({
        title: r.title,
        placement: r.placement,
        targetType: r.targetType,
        targetId: r.targetId,
        imageUrl: r.imageUrl,
        altText: r.altText,
        priority: r.priority,
        startsAt: new Date(String(r.startsAt)).toISOString(),
        endsAt: new Date(String(r.endsAt)).toISOString(),
      });
      await assertCampaignTarget(campaign);
      if (new Date(campaign.endsAt) <= new Date())
        throw errors.validation("An expired campaign cannot be published.");
      await db.execute(
        sql`update admin_campaigns set status=case when starts_at>clock_timestamp() then 'scheduled' else 'published' end where id=${id}`,
      );
    } else
      await db.execute(
        sql`update admin_campaigns set status='archived' where id=${id}`,
      );
  }
  await audit(
    actor,
    section,
    id,
    `${section}.${action}`,
    input.note,
    requestId,
  );
  await event(`admin.${section}.${action}`, { id, actorId: actor.id });
  return { id };
}
export async function addNoteOrAssign(
  actor: Actor,
  section: string,
  id: string,
  action: string,
  version: unknown,
  body: unknown,
  requestId?: string,
) {
  actor = await freshStaff(actor, sectionPolicy(section, actor).roles);
  const r = await lockRecord(section, id, version, actor);
  if (!r.allowedActions?.includes(action === "notes" ? "add_note" : "assign"))
    throw errors.forbidden();
  const input = z
    .object({
      note: z
        .string()
        .trim()
        .min(3)
        .max(action === "notes" ? 2000 : 500),
      assigneeId: z.string().uuid().optional(),
    })
    .strict()
    .parse(body);
  if (action === "assign") {
    if (!input.assigneeId) throw errors.validation("Choose an operator.");
    const roles = sectionPolicy(section, actor).roles;
    const valid = await query(
      sql`select p.id from profiles p left join admin_staff_access a on a.id=p.id where p.id=${input.assigneeId} and coalesce(a.status,'active')='active' and exists(select 1 from user_roles u where u.user_id=p.id and u.role::text=any(${textArray([...roles])})) for share of p`,
    );
    if (!valid[0])
      throw errors.validation(
        "This operator is not eligible for this workspace.",
      );
    await db.execute(
      sql`insert into admin_case_metadata(section,resource_id,assigned_to) values(${section},${id},${input.assigneeId}) on conflict(section,resource_id) do update set assigned_to=excluded.assigned_to`,
    );
  }
  await db.execute(
    sql`insert into admin_notes(section,resource_id,actor_id,note) values(${section},${id},${actor.id},${input.note})`,
  );
  await touch(section, id);
  await audit(
    actor,
    section,
    id,
    `${section}.${action}`,
    input.note,
    requestId,
  );
  return { id };
}
