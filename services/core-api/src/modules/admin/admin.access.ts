import { textArray } from "./admin.policy.js";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db, scopedTransaction } from "../../db/client.js";
import { config } from "../../lib/config.js";
import { errors } from "../../lib/errors.js";
import { Actor, Note, staffRoles } from "./admin.policy.js";
import {
  audit,
  event,
  freshStaff,
  lockRecord,
  query,
  touch,
} from "./admin.store.js";
const Roles = z
  .array(z.enum(staffRoles))
  .min(1)
  .max(5)
  .transform((r) => [...new Set(r)]);
export async function manageAccess(
  actor: Actor,
  action: "invite" | "roles" | "revoke",
  body: unknown,
  id?: string,
  version?: unknown,
  requestId?: string,
) {
  await db.execute(sql`select pg_advisory_xact_lock(7819234)`);
  actor = await freshStaff(actor, ["security_admin"]);
  if (id === actor.id)
    throw errors.forbidden("You cannot change your own staff access.");
  const input =
    action === "revoke"
      ? z.object({ note: Note }).strict().parse(body)
      : z
          .object({
            note: Note,
            roles: Roles,
            email: z.string().email().max(254).optional(),
          })
          .strict()
          .parse(body);
  if (action === "invite") {
    if (
      !config.admin.smtpUrl ||
      !config.admin.mailFrom ||
      !config.admin.portalUrl
    )
      throw errors.unavailable(
        "INVITATION_DELIVERY_UNAVAILABLE",
        "Staff email delivery is not configured.",
      );
    const details = input as { note: string; roles: string[]; email?: string };
    if (!details.email) throw errors.validation("Work email is required.");
    const email = details.email.trim().toLowerCase();
    const active = await query(
      sql`select p.id from profiles p join user_roles r on r.user_id=p.id where lower(p.email)=${email} and r.role::text=any(${textArray([...staffRoles])}) limit 1`,
    );
    if (active[0])
      throw errors.conflict(
        "STAFF_ALREADY_ACTIVE",
        "This operator already has access. Edit their roles instead.",
      );
    await db.execute(
      sql`update admin_invitations set status='expired' where email=${email} and status='invited' and expires_at<=clock_timestamp()`,
    );
    const [created] = await query(
      sql`insert into admin_invitations(email,roles,invited_by) values(${email},${textArray(details.roles)},${actor.id}) returning id`,
    );
    await event("admin.invitation_email", { invitationId: created.id });
    await audit(
      actor,
      "access",
      String(created.id),
      "access.invited",
      input.note,
      requestId,
    );
    return { id: created.id, deliveryStatus: "queued" };
  }
  if (!id) throw errors.validation("Operator ID is required.");
  const r = await lockRecord("access", id, version, actor);
  if (
    !r.allowedActions?.includes(
      action === "roles" ? "edit_roles" : "revoke_access",
    )
  )
    throw errors.conflict(
      "ACCESS_NOT_EDITABLE",
      "This access record is no longer editable.",
    );
  if (r.invitation) {
    await db.execute(
      sql`update admin_invitations set status='revoked' where id=${id}`,
    );
  } else {
    const roles =
      action === "roles"
        ? "roles" in input
          ? (input.roles as string[])
          : []
        : [];
    if (
      Array.isArray(r.roles) &&
      r.roles.includes("security_admin") &&
      !roles.includes("security_admin")
    ) {
      const [count] = await query(
        sql`select count(distinct u.user_id)::int as count from user_roles u left join admin_staff_access a on a.id=u.user_id where u.role='security_admin' and coalesce(a.status,'active')='active'`,
      );
      if (Number(count.count) <= 1)
        throw errors.conflict(
          "LAST_SECURITY_ADMIN",
          "The last security administrator cannot be removed.",
        );
    }
    await db.execute(
      sql`delete from user_roles where user_id=${id} and role::text=any(${textArray([...staffRoles])})`,
    );
    for (const role of roles)
      await db.execute(
        sql`insert into user_roles(user_id,role) values(${id},${role})`,
      );
    await db.execute(
      sql`insert into admin_staff_access(id,status,valid_after) values(${id},${action === "revoke" ? "revoked" : "active"},clock_timestamp()) on conflict(id) do update set status=excluded.status,valid_after=excluded.valid_after,updated_at=clock_timestamp()`,
    );
    await touch("access", id);
  }
  await audit(actor, "access", id, `access.${action}`, input.note, requestId);
  return { id };
}
export async function acceptDeliveredInvitation(
  actor: Actor,
  emailConfirmed: boolean,
) {
  if (!emailConfirmed || !actor.email) return;
  await scopedTransaction(async () => {
    await db.execute(sql`select pg_advisory_xact_lock(7819234)`);
    const invitations = await query(
      sql`select * from admin_invitations where email=${actor.email!.toLowerCase()} and status='invited' and delivered_at is not null and expires_at>clock_timestamp() for update`,
    );
    for (const invitation of invitations) {
      // The inviter must still hold security authority when the invitation is redeemed.
      const inviter = await query(
        sql`select u.user_id from user_roles u left join admin_staff_access a on a.id=u.user_id where u.user_id=${invitation.invited_by} and u.role='security_admin' and coalesce(a.status,'active')='active'`,
      );
      if (!inviter[0]) {
        await db.execute(
          sql`update admin_invitations set status='revoked' where id=${invitation.id}`,
        );
        continue;
      }
      await db.execute(
        sql`select id from profiles where id=${actor.id} for update`,
      );
      for (const role of invitation.roles as string[])
        await db.execute(
          sql`insert into user_roles(user_id,role) select ${actor.id},${role}::user_role_type where not exists(select 1 from user_roles where user_id=${actor.id} and role::text=${role})`,
        );
      await db.execute(
        sql`insert into admin_staff_access(id,status,valid_after) values(${actor.id},'active',to_timestamp(0)) on conflict(id) do update set status='active',updated_at=clock_timestamp()`,
      );
      await db.execute(
        sql`update admin_invitations set status='accepted',accepted_by=${actor.id} where id=${invitation.id}`,
      );
      await touch("access", actor.id);
      await audit(
        actor,
        "access",
        actor.id,
        "access.invitation_accepted",
        "Verified staff invitation accepted",
      );
    }
  });
}
