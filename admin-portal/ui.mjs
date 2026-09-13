import {
  human,
  money,
  routeUrl,
  safeHttps,
  recordStatus,
} from "./contracts.mjs";
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  store:
    "M3 10v11h18V10 M2 10l2-7h16l2 7 M2 10q3 4 5 0q3 4 5 0q3 4 5 0q3 4 5 0 M9 21v-7h6v7",
  box: "m3 7 9-5 9 5v10l-9 5-9-5z M3 7l9 5 9-5 M12 12v10 M7 4l10 6",
  truck:
    "M1 4h13v13H1z M14 9h5l4 5v3h-9 M6 17a2 2 0 1 0 0 .01 M18 17a2 2 0 1 0 0 .01",
  users:
    "M15 21v-3a5 5 0 0 0-10 0v3 M10 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M17 4a4 4 0 0 1 0 7 M18 14q4 1 4 7",
  return: "M9 4 3 10l6 6 M3 10h12a6 6 0 0 1 0 12",
  shield: "M12 2 3 6v6q0 7 9 10q9-3 9-10V6z M8 12l3 3 5-6",
  message: "M3 3h18v14H8l-5 4z M7 7h10 M7 11h7",
  wallet: "M3 6V3h16v3 M3 6h18v15H3z M16 11h5v5h-5z",
  scale: "M12 3v18 M7 21h10 M3 7h18 M6 7 2 15h8z M18 7l-4 8h8z",
  key: "M14 3a6 6 0 1 0 0 12a6 6 0 1 0 0-12 M9 13l-7 7v2h4v-3h3v-3",
  list: "M8 5h13 M8 12h13 M8 19h13 M3 5h.01 M3 12h.01 M3 19h.01",
  settings:
    "M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z",
  search: "M10 3a7 7 0 1 0 0 14a7 7 0 1 0 0-14 M15 15l6 6",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  close: "m6 6 12 12 M18 6 6 18",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  logout: "M9 3H3v18h6 M9 12h12 M16 7l5 5-5 5",
  bell: "M5 17V9a7 7 0 0 1 14 0v8l2 2H3z M9 22h6",
  clock: "M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20 M12 6v6l4 2",
  check: "m5 12 4 4L20 5",
  download: "M12 3v12 M7 10l5 5 5-5 M3 16v5h18v-5",
  plus: "M12 4v16 M4 12h16",
  refresh: "M20 8a9 9 0 1 0 0 8 M20 3v5h-5",
  info: "M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20 M12 11v6 M12 7h.01",
  file: "M4 2h10l6 6v14H4z M14 2v6h6 M8 12h8 M8 16h8",
};
export const icon = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.file}"/></svg>`;
export const button = (label, action, primary = false, extra = "") =>
  `<button type="button" class="btn${primary ? " primary" : ""}" data-action="${esc(action)}" ${extra}>${esc(label)}</button>`;
export const link = (label, section, id = "", query = {}, cls = "btn") =>
  `<a class="${cls}" href="${esc(routeUrl(section, id, query))}">${esc(label)}</a>`;
export const date = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.valueOf())
    ? "—"
    : new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
};
export const title = (r) =>
  r.name || r.title || r.subject || r.reference || r.email || r.id;
export function badge(value) {
  const tone =
    /^(active|registered|published|completed|successful|matched|resolved.*|approved)$/.test(
      value,
    )
      ? "good"
      : /reject|suspend|restrict|failed|revoked|reversed/.test(value)
        ? "bad"
        : /pending|review|requested|unmatched|open|investigating/.test(value)
          ? "warn"
          : "info";
  return `<span class="tag ${tone}">${esc(human(value) || "Not provided")}</span>`;
}
export const empty = (heading, text, action = "") =>
  `<div class="empty">${icon("box")}<h2>${esc(heading)}</h2><p>${esc(text)}</p>${action}</div>`;
export const panel = (heading, body, tools = "") =>
  `<section class="panel"><div class="panel-head"><h2>${esc(heading)}</h2>${tools}</div><div class="panel-body">${body}</div></section>`;
export const notice = (message, tone = "") =>
  `<div class="notice ${tone}" role="${tone === "error" ? "alert" : "status"}">${icon("info")}<span>${esc(message)}</span></div>`;
export const field = (name, label, value = "", type = "text", extra = "") =>
  `<div class="field"><label for="${name}">${esc(label)}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
export const textarea = (name, label, value = "", extra = "") =>
  `<div class="field"><label for="${name}">${esc(label)}</label><textarea id="${name}" name="${name}" ${extra}>${esc(value)}</textarea></div>`;
export const select = (name, label, options, value = "", extra = "") =>
  `<div class="field"><label for="${name}">${esc(label)}</label><select name="${name}" id="${name}" ${extra}>${options
    .map((o) => {
      const [key, text] = Array.isArray(o) ? o : [o, human(o)];
      return `<option value="${esc(key)}" ${key === value ? "selected" : ""}>${esc(text)}</option>`;
    })
    .join("")}</select></div>`;
export const facts = (entries) =>
  `<dl class="facts">${entries.map(([label, value]) => `<div class="fact"><dt>${esc(label)}</dt><dd>${esc(value === undefined || value === null || value === "" ? "—" : value)}</dd></div>`).join("")}</dl>`;
export function timeline(events = []) {
  return events.length
    ? `<div class="timeline">${events.map((e) => `<article class="event"><strong>${esc(e.title || human(e.action))}</strong><small>${esc(date(e.createdAt || e.occurredAt))} · ${esc(e.actorName || "System")}</small><p>${esc(e.note || e.description || "")}</p></article>`).join("")}</div>`
    : empty(
        "No activity recorded",
        "Events will appear here when the service records them.",
      );
}
export const MONEY_FIELDS = new Set([
  "amountMinor",
  "totalMinor",
  "subtotalMinor",
  "deliveryFeeMinor",
  "commissionMinor",
  "availableMinor",
  "heldMinor",
  "priceMinor",
  "refundAmountMinor",
  "providerAmountMinor",
  "ledgerAmountMinor",
]);
export const FIELD_SETS = {
  merchants: [
    ["legalName", "Legal business name"],
    ["storeSlug", "Store address"],
    ["email", "Business email"],
    ["phone", "Business phone"],
    ["registrationNumber", "Registration number"],
    ["businessType", "Business type"],
    ["address", "Business address"],
    ["submittedAt", "Submitted"],
    ["registrationState", "Registration"],
    ["status", "Selling status"],
  ],
  catalogue: [
    ["description", "Description"],
    ["categoryName", "Category"],
    ["brand", "Brand"],
    ["sku", "SKU"],
    ["priceMinor", "Selling price"],
    ["stock", "Available stock"],
    ["condition", "Condition"],
    ["merchantName", "Merchant"],
    ["submittedAt", "Submitted"],
    ["rejectionReason", "Correction reason"],
  ],
  orders: [
    ["customerName", "Customer"],
    ["merchantName", "Merchant"],
    ["totalMinor", "Order total"],
    ["paymentStatus", "Payment"],
    ["carrier", "Carrier"],
    ["trackingNumber", "Tracking number"],
    ["shippingAddress", "Delivery address"],
    ["deliveryDeadline", "Delivery deadline"],
    ["deliveredAt", "Verified delivery"],
    ["returnDeadline", "Return deadline"],
  ],
  customers: [
    ["email", "Email"],
    ["phone", "Phone"],
    ["createdAt", "Customer since"],
    ["orderCount", "Orders"],
    ["totalMinor", "Total spent"],
    ["deletionRequestedAt", "Deletion requested"],
  ],
  returns: [
    ["reason", "Return reason"],
    ["merchantResponse", "Merchant response"],
    ["quantity", "Quantity"],
    ["amountMinor", "Requested amount"],
    ["requestedAt", "Requested"],
    ["returnDeadline", "Return deadline"],
    ["trackingNumber", "Return tracking"],
    ["receivedAt", "Receipt confirmed"],
  ],
  disputes: [
    ["reason", "Dispute reason"],
    ["customerStatement", "Customer statement"],
    ["merchantStatement", "Merchant statement"],
    ["amountMinor", "Disputed amount"],
    ["assignedToName", "Assigned operator"],
    ["dueAt", "Response due"],
    ["outcome", "Outcome"],
    ["resolutionNote", "Decision"],
  ],
  support: [
    ["subject", "Subject"],
    ["category", "Category"],
    ["priority", "Priority"],
    ["customerName", "Customer"],
    ["assignedToName", "Assigned operator"],
    ["dueAt", "Response due"],
  ],
  refunds: [
    ["amountMinor", "Refund amount"],
    ["reason", "Reason"],
    ["providerReference", "Provider reference"],
    ["paymentStatus", "Original payment"],
    ["requestedByName", "Requested by"],
    ["destination", "Original payment destination"],
    ["failureReason", "Failure reason"],
  ],
  payouts: [
    ["amountMinor", "Requested amount"],
    ["availableMinor", "Eligible balance"],
    ["heldMinor", "Held balance"],
    ["bankName", "Bank"],
    ["accountName", "Account name"],
    ["accountLast4", "Account ending"],
    ["requestedByName", "Requested by"],
    ["approvedByName", "Approved by"],
    ["providerReference", "Transfer reference"],
    ["failureReason", "Failure reason"],
  ],
  reconciliation: [
    ["providerReference", "Provider reference"],
    ["providerAmountMinor", "Provider amount"],
    ["ledgerAmountMinor", "Ledger amount"],
    ["reason", "Mismatch reason"],
    ["assignedToName", "Assigned operator"],
    ["lastCheckedAt", "Last checked"],
  ],
  content: [
    ["title", "Campaign title"],
    ["placement", "Placement"],
    ["targetType", "Target type"],
    ["targetId", "Target"],
    ["startsAt", "Starts"],
    ["endsAt", "Ends"],
    ["altText", "Image description"],
    ["priority", "Display priority"],
  ],
  access: [
    ["email", "Work email"],
    ["roles", "Roles"],
    ["mfaEnabled", "Authenticator enabled"],
    ["lastSignInAt", "Last sign-in"],
    ["invitedByName", "Invited by"],
    ["createdAt", "Added"],
  ],
  audit: [
    ["action", "Action"],
    ["actorName", "Actor"],
    ["resourceType", "Resource type"],
    ["resourceId", "Resource ID"],
    ["requestId", "Request ID"],
    ["createdAt", "Recorded"],
    ["note", "Reason"],
  ],
};
export function recordFacts(section, r) {
  return facts(
    (FIELD_SETS[section] || []).map(([key, label]) => [
      label,
      MONEY_FIELDS.has(key)
        ? money(r[key])
        : /At$|Deadline$/.test(key)
          ? date(r[key])
          : Array.isArray(r[key])
            ? r[key].map(human).join(", ")
            : typeof r[key] === "boolean"
              ? r[key]
                ? "Yes"
                : "No"
              : typeof r[key] === "object" && r[key]
                ? Object.values(r[key])
                    .filter((v) => typeof v === "string")
                    .join(", ")
                : r[key],
    ]),
  );
}
export const LIST_COLUMNS = {
  merchants: [
    ["Merchant", null],
    ["Business email", "email"],
    ["Registration", "state"],
    ["Selling status", "status"],
    ["Submitted", "submittedAt"],
  ],
  catalogue: [
    ["Product", null],
    ["Merchant", "merchantName"],
    ["Status", "state"],
    ["Price", "priceMinor"],
    ["Stock", "stock"],
  ],
  orders: [
    ["Order", null],
    ["Customer", "customerName"],
    ["Status", "state"],
    ["Total", "totalMinor"],
    ["Updated", "updatedAt"],
  ],
  customers: [
    ["Customer", null],
    ["Email", "email"],
    ["Status", "state"],
    ["Orders", "orderCount"],
    ["Joined", "createdAt"],
  ],
  returns: [
    ["Return", null],
    ["Merchant", "merchantName"],
    ["Status", "state"],
    ["Amount", "amountMinor"],
    ["Requested", "requestedAt"],
  ],
  disputes: [
    ["Case", null],
    ["Assigned operator", "assignedToName"],
    ["Status", "state"],
    ["Amount", "amountMinor"],
    ["Response due", "dueAt"],
  ],
  support: [
    ["Conversation", null],
    ["Customer", "customerName"],
    ["Status", "state"],
    ["Priority", "priority"],
    ["Assigned operator", "assignedToName"],
  ],
  refunds: [
    ["Refund", null],
    ["Customer", "customerName"],
    ["Status", "state"],
    ["Amount", "amountMinor"],
    ["Updated", "updatedAt"],
  ],
  payouts: [
    ["Payout", null],
    ["Merchant", "merchantName"],
    ["Status", "state"],
    ["Amount", "amountMinor"],
    ["Requested", "createdAt"],
  ],
  reconciliation: [
    ["Provider event", null],
    ["Provider reference", "providerReference"],
    ["Status", "state"],
    ["Ledger amount", "ledgerAmountMinor"],
    ["Last checked", "lastCheckedAt"],
  ],
  content: [
    ["Campaign", null],
    ["Placement", "placement"],
    ["Status", "state"],
    ["Starts", "startsAt"],
    ["Ends", "endsAt"],
  ],
  access: [
    ["Operator", null],
    ["Email", "email"],
    ["Status", "state"],
    ["Roles", "roles"],
    ["Last sign-in", "lastSignInAt"],
  ],
  audit: [
    ["Event", null],
    ["Actor", "actorName"],
    ["Resource", "resourceType"],
    ["Record ID", "resourceId"],
    ["Recorded", "createdAt"],
  ],
};
export function listRow(section, r, sectionIcon, query = {}) {
  const href = esc(routeUrl(section, r.id, query));
  const columns = LIST_COLUMNS[section];
  return `<tr>${columns
    .map(([, key]) => {
      if (key === null)
        return `<td><a class="table-link" href="${href}"><span class="record-icon">${icon(sectionIcon)}</span><span><strong>${esc(title(r))}</strong><small>${esc(r.reference || r.id)}</small></span></a></td>`;
      if (key === "state") return `<td>${badge(recordStatus(section, r))}</td>`;
      const value = MONEY_FIELDS.has(key)
        ? money(r[key])
        : /At$/.test(key)
          ? date(r[key])
          : Array.isArray(r[key])
            ? r[key].map(human).join(", ")
            : ["priority", "placement", "status", "resourceType"].includes(key)
              ? human(r[key])
              : r[key];
      return `<td>${esc(value ?? "—")}</td>`;
    })
    .join(
      "",
    )}<td><a class="btn ghost" aria-label="Open ${esc(title(r))}" href="${href}">Review ${icon("arrow")}</a></td></tr>`;
}
export function media(items = []) {
  const valid = items.filter((m) => safeHttps(m.url));
  return valid.length
    ? `<div class="media-grid">${valid.map((m) => `<button type="button" data-action="image" data-url="${esc(safeHttps(m.url))}" data-label="${esc(m.alt || m.label || "Product image")}"><img loading="lazy" src="${esc(safeHttps(m.url))}" alt="${esc(m.alt || m.label || "Product image")}"><span>${esc(m.label || "View image")}</span></button>`).join("")}</div>`
    : empty(
        "No images supplied",
        "Images submitted with this record will appear here.",
      );
}
