import { sql } from "drizzle-orm";
import crypto from "node:crypto";
import { z } from "zod";
import { AppError, errors } from "../../lib/errors.js";
export const staffRoles = [
  "operations_admin",
  "security_admin",
  "support_agent",
  "catalogue_moderator",
  "finance_reviewer",
] as const;
export type StaffRole = (typeof staffRoles)[number];
const ops: string[] = ["operations_admin"];
const care = [...ops, "support_agent"];
const finance = [...ops, "finance_reviewer"];
export const sections: Record<
  string,
  { table: string; roles: readonly string[]; resource: string }
> = {
  merchants: {
    table: "merchants",
    roles: [...ops, "security_admin"],
    resource: "merchant",
  },
  catalogue: {
    table: "products",
    roles: [...ops, "catalogue_moderator"],
    resource: "product",
  },
  orders: { table: "orders", roles: care, resource: "order" },
  customers: { table: "profiles", roles: care, resource: "customer" },
  returns: { table: "return_requests", roles: care, resource: "return" },
  disputes: { table: "disputes", roles: care, resource: "dispute" },
  support: {
    table: "support_tickets",
    roles: care,
    resource: "support_ticket",
  },
  refunds: {
    table: "admin_refund_reviews",
    roles: finance,
    resource: "refund",
  },
  payouts: { table: "payouts", roles: finance, resource: "payout" },
  reconciliation: {
    table: "admin_reconciliation",
    roles: finance,
    resource: "reconciliation",
  },
  content: { table: "admin_campaigns", roles: ops, resource: "content" },
  access: { table: "profiles", roles: ["security_admin"], resource: "access" },
  audit: {
    table: "audit_events",
    roles: [...ops, "security_admin"],
    resource: "audit",
  },
};
export interface Actor {
  id: string;
  roles: string[];
  aal?: string;
  issuedAt?: number;
  email?: string;
}
export function sectionPolicy(section: string, actor: Actor) {
  const p = Object.hasOwn(sections, section) ? sections[section] : null;
  if (!p) throw errors.notFound("Workspace not found.");
  if (!actor.roles.some((r) => p.roles.includes(r))) throw errors.forbidden();
  return p;
}
export const Note = z.string().trim().min(10).max(500);
export const ListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sort: z
    .enum(["updated_desc", "created_desc", "created_asc"])
    .default("updated_desc"),
  q: z.string().trim().max(200).default(""),
  status: z.string().max(60).default(""),
  cursor: z.string().max(2000).default(""),
});
export type ListInput = z.infer<typeof ListQuery>;
export const CampaignInput = z
  .object({
    title: z.string().trim().min(1).max(100),
    placement: z.enum(["home_hero", "home_collection", "category_feature"]),
    targetType: z.enum(["category", "product", "merchant"]),
    targetId: z.string().uuid(),
    imageUrl: z.string().url().max(2000),
    altText: z.string().trim().min(1).max(180),
    priority: z.number().int().min(0).max(100),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  })
  .strict()
  .refine(
    (v) => new Date(v.endsAt) > new Date(v.startsAt),
    "End date must follow start date.",
  );
export function assertVersion(current: unknown, header: unknown) {
  if (typeof header !== "string" || !/^\d+$/.test(header))
    throw new AppError(
      "PRECONDITION_REQUIRED",
      "Refresh this record before submitting a decision.",
      428,
    );
  if (String(current) !== header)
    throw new AppError(
      "STALE_RECORD",
      "This record changed. Refresh before making another decision.",
      412,
    );
}
export type AdminRecord = Record<string, unknown> & {
  id: string;
  status: string;
  version: string;
  allowedActions?: string[];
};
export function actionsFor(
  section: string,
  r: AdminRecord,
  actor: Actor,
  financeReady: boolean,
): string[] {
  sectionPolicy(section, actor);
  const keys: string[] = [];
  const status =
    section === "merchants"
      ? r.status === "suspended"
        ? "suspended"
        : r.registrationState
      : r.status;
  const rules: Record<string, Array<[string, string[]]>> = {
    merchants: [
      ["approve_merchant", ["in_review"]],
      ["reject_merchant", ["in_review"]],
      ["suspend_merchant", ["registered"]],
      ["restore_merchant", ["suspended"]],
    ],
    catalogue: [
      ["publish_product", ["pending_approval"]],
      ["reject_product", ["pending_approval"]],
      ["unpublish_product", ["published"]],
    ],
    customers: [
      ["restrict_customer", ["active"]],
      ["restore_customer", ["restricted"]],
      ["review_privacy", ["deletion_requested"]],
    ],
    orders: [["escalate_order", ["processing", "in_transit"]]],
    returns: [
      ["approve_return", ["requested"]],
      ["reject_return", ["requested"]],
      ["receive_return", ["approved"]],
      ["escalate_return", ["requested", "rejected"]],
    ],
    disputes: [["resolve_dispute", ["open", "under_review"]]],
    support: [
      ["close_ticket", ["open", "pending"]],
      ["reopen_ticket", ["closed", "resolved"]],
      ["reply_ticket", ["open", "pending"]],
    ],
    payouts: [
      ["approve_payout", ["pending_approval"]],
      ["reject_payout", ["pending_approval"]],
      ["dispatch_payout", ["approved"]],
    ],
    reconciliation: [
      ["investigate", ["unmatched"]],
      ["recheck", ["investigating"]],
    ],
    content: [
      ["edit_content", ["draft"]],
      ["publish_content", ["draft", "scheduled"]],
      ["archive_content", ["published", "scheduled"]],
    ],
    access: [
      ["revoke_access", ["active", "invited"]],
      ["edit_roles", ["active"]],
    ],
  };
  for (const [key, from] of rules[section] ?? [])
    if (from.includes(String(status))) keys.push(key);
  if (
    [
      "merchants",
      "orders",
      "customers",
      "returns",
      "disputes",
      "support",
    ].includes(section)
  )
    keys.push("add_note", "assign");
  return keys.filter((key) => {
    if (
      [
        "suspend_merchant",
        "restore_merchant",
        "restrict_customer",
        "restore_customer",
        "review_privacy",
      ].includes(key) &&
      !actor.roles.includes("operations_admin")
    )
      return false;
    if (key === "review_privacy" && r.privacyReviewStartedAt) return false;
    if (key === "escalate_order" && r.escalatedAt) return false;
    if (
      key === "approve_payout" &&
      (!r.requestedBy || r.requestedBy === actor.id)
    )
      return false;
    if (["revoke_access", "edit_roles"].includes(key) && r.id === actor.id)
      return false;
    if (["payouts"].includes(section) && !financeReady) return false;
    if (key === "recheck" && !financeReady) return false;
    return true;
  });
}
export function requestFingerprint(
  method: string,
  path: string,
  body: unknown,
  version: unknown,
): string {
  const normalize = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(normalize)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, value]) => [k, normalize(value)]),
          )
        : v;
  return crypto
    .createHash("sha256")
    .update(JSON.stringify([method, path, normalize(body), version ?? null]))
    .digest("hex");
}
export function cursorCodec(secret: string) {
  const sign = (s: string) =>
    crypto.createHmac("sha256", secret).update(s).digest("base64url");
  return {
    encode(scope: string, key: string, id: string) {
      const data = Buffer.from(JSON.stringify({ scope, key, id })).toString(
        "base64url",
      );
      return `${data}.${sign(data)}`;
    },
    decode(value: string, scope: string): { key: string; id: string } {
      try {
        const [data, sig, ...extra] = value.split(".");
        if (
          extra.length ||
          !sig ||
          !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(data)))
        )
          throw Error();
        const parsed = JSON.parse(Buffer.from(data, "base64url").toString());
        if (
          parsed.scope !== scope ||
          !z.string().uuid().safeParse(parsed.id).success ||
          !Number.isFinite(Date.parse(parsed.key))
        )
          throw Error();
        return parsed;
      } catch {
        throw errors.validation(
          "This page cursor is invalid for these filters. Start from the first page.",
        );
      }
    },
  };
}

export function textArray(values: readonly unknown[]) {
  return sql`ARRAY[${sql.join(
    values.map((v) => sql`${v}`),
    sql`, `,
  )}]::text[]`;
}
