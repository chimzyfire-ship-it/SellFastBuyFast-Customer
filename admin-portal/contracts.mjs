// One explicit contract registry shared by the interface and backend handoff.
// No demo adapter, client-granted roles, or database table fallback.
export const ROLES = {
  operations_admin: "Operations admin",
  catalogue_moderator: "Catalogue moderator",
  support_agent: "Support agent",
  finance_reviewer: "Finance reviewer",
  security_admin: "Security admin",
};
const ops = ["operations_admin"];
const care = [...ops, "support_agent"];
const finance = [...ops, "finance_reviewer"];
export const SECTIONS = {
  overview: {
    title: "Overview",
    group: "Workspace",
    icon: "grid",
    description: "The marketplace at a glance. The work that matters next.",
  },
  merchants: {
    title: "Merchants",
    group: "Marketplace",
    icon: "store",
    roles: [...ops, "security_admin"],
    description: "Review business identity and manage selling eligibility.",
    statuses: ["in_review", "registered", "not_registered", "suspended"],
  },
  catalogue: {
    title: "Catalogue",
    group: "Marketplace",
    icon: "box",
    roles: [...ops, "catalogue_moderator"],
    description: "Review every detail before a listing reaches shoppers.",
    statuses: [
      "pending_approval",
      "published",
      "rejected",
      "draft",
      "archived",
    ],
  },
  orders: {
    title: "Orders & delivery",
    group: "Marketplace",
    icon: "truck",
    roles: care,
    description: "Follow the order journey and resolve delivery exceptions.",
    statuses: [
      "pending_payment",
      "payment_confirmed",
      "processing",
      "in_transit",
      "delivered",
      "completed",
      "cancelled",
      "refunded",
      "disputed",
    ],
  },
  customers: {
    title: "Customers",
    group: "Customer care",
    icon: "users",
    roles: care,
    description: "The customer context behind each order and conversation.",
    statuses: ["active", "restricted", "deletion_requested"],
  },
  returns: {
    title: "Returns",
    group: "Customer care",
    icon: "return",
    roles: care,
    description: "Evidence, merchant response, and a clear next step.",
    statuses: [
      "requested",
      "approved",
      "rejected",
      "received",
      "refund_initiated",
      "completed",
    ],
  },
  disputes: {
    title: "Disputes",
    group: "Customer care",
    icon: "shield",
    roles: care,
    description: "Bring both sides together for a documented decision.",
    statuses: [
      "open",
      "under_review",
      "resolved_buyer",
      "resolved_merchant",
      "closed",
    ],
  },
  support: {
    title: "Support inbox",
    group: "Customer care",
    icon: "message",
    roles: care,
    description: "Every conversation, connected to its customer and order.",
    statuses: ["open", "pending", "resolved", "closed"],
  },
  refunds: {
    title: "Refunds",
    group: "Finance",
    icon: "return",
    roles: finance,
    description: "Review adjustments and track provider-confirmed outcomes.",
    statuses: ["review_required", "initialized", "successful", "failed"],
  },
  payouts: {
    title: "Payouts",
    group: "Finance",
    icon: "wallet",
    roles: finance,
    description: "Review eligible balances with separation of duties.",
    statuses: [
      "pending_approval",
      "approved",
      "processing",
      "successful",
      "failed",
      "rejected",
      "reversed",
    ],
  },
  reconciliation: {
    title: "Reconciliation",
    group: "Finance",
    icon: "scale",
    roles: finance,
    description:
      "Investigate differences between provider events and the ledger.",
    statuses: ["unmatched", "investigating", "recheck_pending", "matched"],
  },
  content: {
    title: "Storefront content",
    group: "Platform",
    icon: "grid",
    roles: ops,
    description:
      "Manage campaigns and category placements for the customer app.",
    statuses: ["draft", "scheduled", "published", "archived"],
  },
  access: {
    title: "Team & access",
    group: "Platform",
    icon: "key",
    roles: ["security_admin"],
    description: "Give each operator the access their work requires.",
    statuses: ["invited", "active", "revoked"],
  },
  audit: {
    title: "Audit trail",
    group: "Platform",
    icon: "list",
    roles: [...ops, "security_admin"],
    description: "Read the history behind every operational decision.",
  },
  settings: {
    title: "Workspace settings",
    group: "Platform",
    icon: "settings",
    description: "Your preferences, session security, and service connections.",
  },
};
const command = (
  label,
  section,
  roles,
  from,
  impact,
  path,
  body = (p) => ({ note: p.note }),
  existing = false,
) => ({ label, section, roles, from, impact, path, body, existing });
const id = (r) => encodeURIComponent(r.id);
export const ACTIONS = {
  restrict_customer: command(
    "Restrict account",
    "customers",
    ops,
    ["active"],
    "Restrict new purchases while preserving access to existing orders and support.",
    (r) => `/v1/admin/customers/${id(r)}/restrict`,
  ),
  restore_customer: command(
    "Restore account",
    "customers",
    ops,
    ["restricted"],
    "Restore purchase eligibility after the account review is complete.",
    (r) => `/v1/admin/customers/${id(r)}/restore`,
  ),
  review_privacy: command(
    "Start privacy review",
    "customers",
    ops,
    ["deletion_requested"],
    "Assign the deletion request for a retention and identity review. This does not delete the account.",
    (r) => `/v1/admin/customers/${id(r)}/privacy-review`,
  ),
  approve_return: command(
    "Approve return",
    "returns",
    care,
    ["requested"],
    "Authorize the return and notify the customer. Refund processing remains a separate step after receipt.",
    (r) => `/v1/customer-care/returns/${id(r)}/decision`,
    (p) => ({ decision: "approved", note: p.note }),
    true,
  ),
  reject_return: command(
    "Reject return",
    "returns",
    care,
    ["requested"],
    "Record the reason and notify the customer. They can raise a dispute for an independent review.",
    (r) => `/v1/customer-care/returns/${id(r)}/decision`,
    (p) => ({ decision: "rejected", note: p.note }),
    true,
  ),
  unpublish_product: command(
    "Withdraw listing",
    "catalogue",
    [...ops, "catalogue_moderator"],
    ["published"],
    "Remove the listing from discovery and new purchases. Existing order records are retained.",
    (r) => `/v1/admin/catalogue/${id(r)}/withdraw`,
  ),
  approve_merchant: command(
    "Approve registration",
    "merchants",
    [...ops, "security_admin"],
    ["in_review"],
    "The merchant becomes active. Published listings become eligible for shopper discovery.",
    (r) => `/v1/vendor/merchant/${id(r)}/registration/decision`,
    (p) => ({ decision: "approve", note: p.note }),
    true,
  ),
  reject_merchant: command(
    "Return for corrections",
    "merchants",
    [...ops, "security_admin"],
    ["in_review"],
    "The merchant can correct and resubmit. Your reason will be visible to the merchant.",
    (r) => `/v1/vendor/merchant/${id(r)}/registration/decision`,
    (p) => ({ decision: "reject", note: p.note }),
    true,
  ),
  suspend_merchant: command(
    "Suspend merchant",
    "merchants",
    ops,
    ["registered"],
    "Block new purchases. Existing paid orders still require fulfilment.",
    (r) => `/v1/admin/merchants/${id(r)}/suspend`,
  ),
  restore_merchant: command(
    "Restore merchant",
    "merchants",
    ops,
    ["suspended"],
    "Restore selling eligibility after the investigation is complete.",
    (r) => `/v1/admin/merchants/${id(r)}/restore`,
  ),
  publish_product: command(
    "Publish listing",
    "catalogue",
    [...ops, "catalogue_moderator"],
    ["pending_approval"],
    "Publish the listing after checking imagery, description, variants, and merchant eligibility.",
    (r) => `/v1/catalog-management/products/${id(r)}/moderate`,
    (p) => ({ decision: "publish", note: p.note }),
    true,
  ),
  reject_product: command(
    "Request corrections",
    "catalogue",
    [...ops, "catalogue_moderator"],
    ["pending_approval"],
    "Keep the listing private and send your correction note to the merchant.",
    (r) => `/v1/catalog-management/products/${id(r)}/moderate`,
    (p) => ({ decision: "reject", note: p.note }),
    true,
  ),
  escalate_order: command(
    "Escalate delivery",
    "orders",
    care,
    ["processing", "in_transit"],
    "Open a delivery investigation. Payment and fulfilment state are unchanged.",
    (r) => `/v1/admin/orders/${id(r)}/escalate`,
  ),
  receive_return: command(
    "Confirm item received",
    "returns",
    care,
    ["approved"],
    "Record warehouse receipt. This does not mark a refund as paid.",
    (r) => `/v1/customer-care/returns/${id(r)}/received`,
    (p) => ({ note: p.note }),
    true,
  ),
  escalate_return: command(
    "Escalate to dispute",
    "returns",
    care,
    ["requested", "rejected"],
    "Open an independent dispute using the buyer and merchant evidence.",
    (r) => `/v1/admin/returns/${id(r)}/escalate`,
  ),
  resolve_dispute: command(
    "Resolve dispute",
    "disputes",
    care,
    ["open", "under_review"],
    "Record the decision and notify participants. Any refund requires a separate finance workflow.",
    (r) => `/v1/admin/disputes/${id(r)}/resolve`,
    (p) => ({ note: p.note, outcome: p.outcome }),
  ),
  close_ticket: command(
    "Close conversation",
    "support",
    care,
    ["open", "pending"],
    "Close the conversation after addressing the customer’s issue.",
    (r) => `/v1/customer-care/tickets/${id(r)}/close`,
    (p) => ({ note: p.note }),
    true,
  ),
  reopen_ticket: command(
    "Reopen conversation",
    "support",
    care,
    ["closed", "resolved"],
    "Reopen this conversation for follow-up.",
    (r) => `/v1/admin/support/${id(r)}/reopen`,
  ),
  request_refund: command(
    "Submit refund review",
    "refunds",
    finance,
    ["review_required"],
    "Queue the reviewed amount for provider processing. Only provider confirmation can mark it successful.",
    (r) => `/v1/admin/refunds/${id(r)}/review`,
  ),
  approve_payout: command(
    "Approve payout",
    "payouts",
    finance,
    ["pending_approval"],
    "Authorize this request. Transfer dispatch is separate and settlement requires provider confirmation.",
    (r) => `/v1/payouts/${id(r)}/approve`,
    (p) => ({ note: p.note }),
    true,
  ),
  reject_payout: command(
    "Reject payout",
    "payouts",
    finance,
    ["pending_approval"],
    "Reject the request and release the hold through the backend ledger.",
    (r) => `/v1/payouts/${id(r)}/reject`,
    (p) => ({ note: p.note }),
    true,
  ),
  dispatch_payout: command(
    "Dispatch transfer",
    "payouts",
    finance,
    ["approved"],
    "Submit the approved transfer to the provider. This does not mean it has settled.",
    (r) => `/v1/payouts/${id(r)}/dispatch`,
    (p) => ({ note: p.note }),
    true,
  ),
  investigate: command(
    "Start investigation",
    "reconciliation",
    finance,
    ["unmatched"],
    "Assign the mismatch for investigation. Ledger values remain unchanged.",
    (r) => `/v1/admin/reconciliation/${id(r)}/investigate`,
  ),
  recheck: command(
    "Request provider recheck",
    "reconciliation",
    finance,
    ["investigating"],
    "Queue backend verification against the provider. This cannot manually mark a match.",
    (r) => `/v1/admin/reconciliation/${id(r)}/recheck`,
  ),
  publish_content: command(
    "Publish campaign",
    "content",
    ops,
    ["draft", "scheduled"],
    "Publish this placement after server validation of its target and schedule.",
    (r) => `/v1/admin/content/${id(r)}/publish`,
  ),
  archive_content: command(
    "Archive campaign",
    "content",
    ops,
    ["published", "scheduled"],
    "Remove the placement from the storefront and retain its history.",
    (r) => `/v1/admin/content/${id(r)}/archive`,
  ),
  revoke_access: command(
    "Revoke access",
    "access",
    ["security_admin"],
    ["active", "invited"],
    "Remove privileges and invalidate the affected staff sessions.",
    (r) => `/v1/admin/access/${id(r)}/revoke`,
  ),
};
export function canView(section, viewer) {
  const config = Object.hasOwn(SECTIONS, section) ? SECTIONS[section] : null;
  return Boolean(
    config &&
    Array.isArray(viewer?.roles) &&
    viewer.roles.some((r) => Object.hasOwn(ROLES, r)) &&
    (!config.roles || config.roles.some((r) => viewer.roles.includes(r))),
  );
}
export function recordStatus(section, r) {
  return section === "merchants"
    ? r.status === "suspended"
      ? "suspended"
      : r.registrationState
    : r.status;
}
export function canAct(key, record, viewer) {
  const a = Object.hasOwn(ACTIONS, key) ? ACTIONS[key] : null;
  return Boolean(
    a &&
    record &&
    record.version != null &&
    a.roles.some((r) => viewer?.roles?.includes(r)) &&
    a.from.includes(recordStatus(a.section, record)) &&
    Array.isArray(record.allowedActions) &&
    record.allowedActions.includes(key) &&
    !(key === "approve_payout" && record.requestedBy === viewer.id) &&
    !(key === "revoke_access" && record.id === viewer.id),
  );
}
export const human = (v) =>
  String(v ?? "")
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());
export function money(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number" && !Number.isSafeInteger(value)) return "—";
  // Format integer minor units without rounding through an unsafe JS Number.
  try {
    const n = BigInt(value);
    const a = n < 0n ? -n : n;
    return `${n < 0n ? "−" : ""}₦${(a / 100n).toLocaleString("en-NG")}.${String(a % 100n).padStart(2, "0")}`;
  } catch {
    return "—";
  }
}
export function parseRoute(hash) {
  try {
    const url = new URL(
      (hash || "#/overview").slice(1),
      "https://admin.invalid",
    );
    const parts = url.pathname
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);
    if (url.origin !== "https://admin.invalid" || parts.length > 2)
      throw new Error("Invalid route");
    return {
      section: parts[0] || "overview",
      id: parts[1] || "",
      tab: url.searchParams.get("tab") || "details",
      q: url.searchParams.get("q") || "",
      status: url.searchParams.get("status") || "",
      cursor: url.searchParams.get("cursor") || "",
      sort: url.searchParams.get("sort") || "updated_desc",
    };
  } catch {
    return {
      section: "not-found",
      id: "",
      tab: "details",
      q: "",
      status: "",
      cursor: "",
      sort: "updated_desc",
    };
  }
}
export function routeUrl(section, id = "", query = {}) {
  const qs = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v !== "" && v != null),
  );
  return `#/${encodeURIComponent(section)}${id ? `/${encodeURIComponent(id)}` : ""}${qs.size ? `?${qs}` : ""}`;
}
export function safeHttps(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}
export function csvCell(value) {
  let s = String(value ?? "");
  if (/^[\s]*[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
}

/** Reject incomplete reads instead of presenting unavailable collections as empty. */
export function assertWorkspaceData(section, recordId, data) {
  const invalid = () => {
    throw new Error(
      "The service returned an incomplete workspace response. Refresh or contact your administrator.",
    );
  };
  if (!data || typeof data !== "object") invalid();
  if (section === "overview") {
    if (
      !["metrics", "queues", "activity"].every((key) =>
        Array.isArray(data[key]),
      )
    )
      invalid();
    return;
  }
  if (!recordId) {
    if (
      !Array.isArray(data.items) ||
      !data.items.every((r) => r && typeof r.id === "string" && r.id)
    )
      invalid();
    if (data.nextCursor !== null && typeof data.nextCursor !== "string")
      invalid();
    return;
  }
  if (
    !data.record ||
    data.record.id !== recordId ||
    !Array.isArray(data.record.allowedActions)
  )
    invalid();
  const required = ["activity", "media", "documents"];
  if (
    [
      "support",
      "disputes",
      "returns",
      "orders",
      "customers",
      "merchants",
    ].includes(section)
  )
    required.push("notes");
  if (section === "support") required.push("messages");
  if (section === "catalogue") required.push("variants");
  if (section === "orders") required.push("items", "tracking");
  if (["refunds", "payouts", "reconciliation"].includes(section))
    required.push("entries");
  if (!required.every((key) => Array.isArray(data[key]))) invalid();
}
