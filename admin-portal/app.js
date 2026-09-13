import { AdminApi, ApiError } from "./api.mjs";
import {
  ACTIONS,
  SECTIONS,
  ROLES,
  canAct,
  canView,
  assertWorkspaceData,
  human,
  money,
  parseRoute,
  routeUrl,
  safeHttps,
  csvCell,
  recordStatus,
} from "./contracts.mjs";
import {
  esc,
  icon,
  button,
  link,
  date,
  title,
  badge,
  empty,
  panel,
  notice,
  field,
  textarea,
  select,
  facts,
  timeline,
  recordFacts,
  listRow,
  LIST_COLUMNS,
  media,
} from "./ui.mjs";
const app = document.querySelector("#app");
const dialog = document.querySelector("#dialog");
const state = {
  viewer: null,
  api: null,
  auth: null,
  config: null,
  route: parseRoute(location.hash),
  data: null,
  controller: null,
  generation: 0,
  notice: "",
  busy: false,
  drafts: new Map(),
  preferences: { density: "comfortable" },
};
let modalTask = null;
let invitationToken = null;
let modalRevision = 0;
let lastFocus = null;
let toastTimer;
const allowed = (section) => canView(section, state.viewer);
const permitted = (capability) =>
  state.viewer?.capabilities?.includes(capability);
const recordPermission = (capability) =>
  allowed(state.route.section) &&
  state.data?.record?.version != null &&
  state.data.record.allowedActions?.includes(capability);
function toast(message, error = false) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = `toast${error ? " error" : ""}`;
  el.setAttribute("role", error ? "alert" : "status");
  el.textContent = message;
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 7000);
}
function formError(form, error) {
  const node = form.querySelector("[data-error]");
  node.textContent = error.message || String(error);
  node.focus();
}
function errorMessage(error) {
  if (error.status === 403)
    return "Your account does not have permission for this operation. Contact your workspace administrator.";
  if (error.status === 409 || error.status === 412)
    return "This record changed or is no longer eligible. Close this dialog and refresh the record before making another decision.";
  if (error.status === 429)
    return "Too many requests. Wait a moment, then retry.";
  if (error.status === 404)
    return "This record or admin service is unavailable. Refresh to check again, or contact your workspace administrator.";
  return error.message || "Something went wrong. Please try again.";
}
function showDialog(heading, body, task = null) {
  ++modalRevision;
  if (dialog.open) dialog.close();
  lastFocus = document.activeElement;
  modalTask = task;
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${esc(heading)}</h2><button type="button" class="icon-btn" data-action="close-dialog" aria-label="Close dialog">${icon("close")}</button></div><div class="dialog-body">${body}</div>`;
  dialog.showModal();
}
function closeDialog() {
  if (state.busy) return;
  dialog.close();
}
dialog.addEventListener("cancel", (e) => {
  if (state.busy) e.preventDefault();
});
dialog.addEventListener("close", () => {
  if (dialog.open) return;
  ++modalRevision;
  dialog.innerHTML = "";
  modalTask = null;
  if (lastFocus?.isConnected) lastFocus.focus();
  if (!state.viewer && state.auth && !dialog.open)
    authPage(
      "sign-in",
      "Complete sign-in and identity verification to open the workspace.",
    );
});
const errorSlot =
  '<p class="dialog-error" data-error role="alert" tabindex="-1"></p>';
const formFoot = (label) =>
  `${errorSlot}<div class="dialog-foot">${button("Cancel", "close-dialog")}<button class="btn primary" type="submit">${esc(label)}</button></div>`;
function shell() {
  let group = "";
  const nav = Object.entries(SECTIONS)
    .filter(([key]) => allowed(key))
    .map(([key, s]) => {
      const heading =
        s.group !== group ? `<div class="nav-group">${esc(s.group)}</div>` : "";
      group = s.group;
      return `${heading}<a href="${routeUrl(key)}" class="${state.route.section === key ? "active" : ""}" ${state.route.section === key ? 'aria-current="page"' : ""}>${icon(s.icon)}${esc(s.title)}</a>`;
    })
    .join("");
  app.innerHTML = `<aside class="sidebar" id="sidebar" aria-label="Workspace navigation"><a class="brand" href="#/overview"><img src="assets/sellfastbuyfast-logo-white.png" alt="SellFastBuyFast" class="sidebar-logo" /><small>OPERATIONS WORKSPACE</small></a><nav class="nav" aria-label="Main navigation">${nav}</nav><div class="staff"><div class="avatar">${esc((state.viewer.name || state.viewer.email || "OP").slice(0, 2).toUpperCase())}</div><div class="staff-info"><strong>${esc(state.viewer.name || state.viewer.email)}</strong><span>${esc(ROLES[state.viewer.roles.find((r) => Object.hasOwn(ROLES, r))])}</span></div><button class="icon-btn" data-action="sign-out" aria-label="Sign out">${icon("logout")}</button></div></aside><button class="mobile-scrim" data-action="menu-close" aria-label="Close navigation"></button><div class="workspace"><header class="topbar"><div class="row"><button class="icon-btn mobile-menu" data-action="menu" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">${icon("menu")}</button><div class="breadcrumb">Workspace <span>/</span> <strong>${esc(SECTIONS[state.route.section]?.title || "Page not found")}</strong></div></div><div class="row"><button class="btn search-launch" data-action="search" aria-label="Search workspace">${icon("search")}<span>Find a record or workspace</span><kbd>⌘ K</kbd></button><span class="session-label tag good">Secure session</span>${link("Settings", "settings", "", "", "btn ghost")}</div></header><main id="main" class="content" tabindex="-1"></main></div>`;
  document.body.dataset.density = state.preferences.density;
}
function heading(section, tools = "") {
  const s = SECTIONS[section];
  return `<div class="page-heading"><div><div class="eyebrow">${esc(s.group)}</div><h1>${esc(s.title)}</h1><p>${esc(s.description)}</p></div><div class="page-tools">${tools}</div></div>`;
}
function render(html) {
  const main = document.querySelector("#main");
  if (!main) return;
  main.innerHTML = html;
  document.title = `${SECTIONS[state.route.section]?.title || "Workspace"} · SellFastBuyFast`;
}
function refreshTools() {
  return button("Refresh", "refresh", false);
}
function readStateError(error) {
  return `${notice(errorMessage(error), "error")}${empty(error.status === 403 ? "Access restricted" : "Workspace unavailable", "No data has been substituted. You can retry this request or open another workspace.", button("Try again", "refresh", true))}${error.requestId ? `<p class="small muted">Request reference: ${esc(error.requestId)}</p>` : ""}`;
}
async function loadRoute({ focus = true } = {}) {
  if (!state.viewer) return;
  state.controller?.abort();
  state.controller = new AbortController();
  const signal = state.controller.signal;
  const generation = ++state.generation;
  state.route = parseRoute(location.hash);
  state.data = null;
  shell();
  const r = state.route;
  if (!Object.hasOwn(SECTIONS, r.section)) {
    render(
      empty(
        "Page not found",
        "This address does not match a workspace.",
        link("Back to overview", "overview"),
      ),
    );
    return;
  }
  if (!allowed(r.section)) {
    render(
      heading(r.section) +
        empty(
          "Access restricted",
          "Your role does not include this workspace.",
          link("Back to overview", "overview"),
        ),
    );
    return;
  }
  if (r.id && ["settings", "overview"].includes(r.section)) {
    render(
      empty(
        "Page not found",
        "This workspace has no record at this address.",
        link("Open workspace", r.section),
      ),
    );
    return;
  }
  if (r.section === "settings") {
    renderSettings();
    return;
  }
  render(
    heading(r.section) +
      `<section class="panel panel-body" aria-busy="true" aria-label="Loading workspace"><div class="skeleton wide"></div><div class="skeleton block"></div><div class="skeleton wide"></div></section>`,
  );
  try {
    const data =
      r.section === "overview"
        ? await state.api.request("/v1/admin/overview", { signal })
        : r.id
          ? await state.api.detail(r.section, r.id, signal)
          : await state.api.list(r.section, r, signal);
    if (generation !== state.generation) return;
    if (
      !data ||
      (r.id && (!data.record || String(data.record.id) !== r.id)) ||
      (!r.id && r.section !== "overview" && !Array.isArray(data.items))
    )
      throw new ApiError(
        "The service returned an incomplete workspace response. Contact your administrator.",
        "INVALID_RESPONSE",
      );
    assertWorkspaceData(r.section, r.id, data);
    state.data = data;
    render(
      r.section === "overview"
        ? overview(data)
        : r.id
          ? detail(data)
          : list(data),
    );
    if (state.notice) {
      document
        .querySelector("#main")
        .insertAdjacentHTML("afterbegin", notice(state.notice, "success"));
      state.notice = "";
    }
  } catch (error) {
    if (generation !== state.generation || error.name === "AbortError") return;
    if (error.status === 401) {
      state.viewer = null;
      authPage("sign-in", "Your session has expired. Sign in to continue.");
      return;
    }
    render(heading(r.section) + readStateError(error));
  }
  if (focus) document.querySelector("#main")?.focus({ preventScroll: true });
}
function overview(data) {
  const metrics = (data.metrics || []).filter((m) => allowed(m.section));
  const queues = (data.queues || []).filter((q) => allowed(q.section));
  return (
    heading("overview", refreshTools()) +
    `<p class="small muted updated-line">${data.asOf ? `Updated ${esc(date(data.asOf))}` : "Reporting period not supplied"}</p><div class="metrics">${metrics.map((m) => `<a class="metric" href="${esc(routeUrl(m.section, "", { status: m.status }))}"><div class="metric-top">${esc(m.label)}<span class="metric-icon">${icon(SECTIONS[m.section].icon)}</span></div><div class="metric-value">${esc(m.format === "money" ? money(m.value) : (m.value ?? "—"))}</div><div class="metric-foot">${esc(m.description || "Open workspace")} ${icon("arrow")}</div></a>`).join("")}</div><div class="dashboard-grid"><div class="stack">${panel("Needs your attention", queues.length ? queues.map((q) => `<a class="attention-item" href="${esc(routeUrl(q.section, "", { status: q.status }))}"><span class="item-icon">${icon(SECTIONS[q.section].icon)}</span><span><strong>${esc(q.label)}</strong><p>${esc(q.description || SECTIONS[q.section].description)}</p></span><strong class="queue-count">${esc(q.count ?? "—")}</strong>${icon("arrow")}</a>`).join("") : empty("No work queued", "There are no items assigned to your available queues."))}${panel("Recent activity", timeline(data.activity), allowed("audit") ? link("View audit trail", "audit") : "")}</div><div>${panel("Marketplace connections", `<ul class="help-list"><li><strong>Merchant → review → storefront</strong><p class="muted">Business verification and catalogue approval control what shoppers can discover.</p></li><li><strong>Order → merchant → customer</strong><p class="muted">The Core API handles stock, fulfilment, and verified delivery. Operations handles exceptions.</p></li><li><strong>Return → decision → finance</strong><p class="muted">Evidence and support decisions feed a separate, provider-confirmed refund workflow.</p></li></ul>`)}<div class="workflow-card"><div class="eyebrow">Connected operations</div><h2>Every decision has context.</h2><p>Open a record to see related orders, merchant details, submitted evidence, and its activity history.</p>${link("View workspace settings", "settings")}</div></div></div>`
  );
}
function list(data) {
  const r = state.route,
    s = SECTIONS[r.section];
  const create =
    r.section === "content" && permitted("content:create")
      ? button("Create campaign", "create-content", true)
      : r.section === "access" && permitted("access:invite")
        ? button("Invite operator", "invite", true)
        : "";
  return (
    heading(
      r.section,
      `${refreshTools()}${button("Export this page", "export", false, data.items.length ? "" : "disabled")}${create}`,
    ) +
    `<section class="panel"><form class="table-tools" data-form="filter"><label class="search-field">${icon("search")}<span class="sr-only">Search ${esc(s.title)}</span><input name="q" value="${esc(r.q)}" placeholder="Search ${esc(s.title.toLowerCase())}" maxlength="200"></label><div class="filters"><label><span class="sr-only">Status</span><select name="status"><option value="">All statuses</option>${(s.statuses || []).map((status) => `<option value="${status}" ${r.status === status ? "selected" : ""}>${esc(human(status))}</option>`).join("")}</select></label><label><span class="sr-only">Sort records</span><select name="sort"><option value="updated_desc" ${r.sort === "updated_desc" ? "selected" : ""}>Recently updated</option><option value="created_desc" ${r.sort === "created_desc" ? "selected" : ""}>Newest first</option><option value="created_asc" ${r.sort === "created_asc" ? "selected" : ""}>Oldest first</option></select></label><button class="btn" type="submit">Apply</button>${r.q || r.status || r.cursor ? link("Clear", r.section) : ""}</div></form>${data.items.length ? `<div class="table-scroll"><table><caption class="sr-only">${esc(s.title)} records</caption><thead><tr>${LIST_COLUMNS[r.section].map(([label]) => `<th scope="col">${esc(label)}</th>`).join("")}<th scope="col"><span class="sr-only">Open record</span></th></tr></thead><tbody>${data.items.map((item) => listRow(r.section, item, s.icon, { q: r.q, status: r.status, sort: r.sort, cursor: r.cursor })).join("")}</tbody></table></div>` : empty(r.q || r.status ? "No matching records" : "No records yet", r.q || r.status ? "Try another search or remove the status filter." : "Records will appear here when they are available to your role.", r.q || r.status ? link("Clear filters", r.section) : "")}<div class="table-footer"><span>${esc(data.items.length)} records on this page${Number.isSafeInteger(data.total) ? ` · ${data.total.toLocaleString()} total` : ""}</span><div class="row">${r.cursor ? link("First page", r.section, "", { ...r, cursor: "", section: "", id: "", tab: "" }) : ""}${data.nextCursor ? link("Next page", r.section, "", { q: r.q, status: r.status, sort: r.sort, cursor: data.nextCursor }) : "<span>End of results</span>"}</div></div></section>`
  );
}
function relatedLinks(record) {
  const items = [
    ["merchantId", "merchants", "Merchant"],
    ["customerId", "customers", "Customer"],
    ["orderId", "orders", "Order"],
    ["productId", "catalogue", "Product"],
    ["returnId", "returns", "Return"],
    ["disputeId", "disputes", "Dispute"],
    ["refundId", "refunds", "Refund"],
    ["payoutId", "payouts", "Payout"],
  ].filter(([key, section]) => record[key] && allowed(section));
  return items.length
    ? items
        .map(
          ([key, section, label]) =>
            `<a class="related" href="${esc(routeUrl(section, record[key]))}"><span>${label}<small class="muted"> · ${esc(record[key])}</small></span>${icon("arrow")}</a>`,
        )
        .join("")
    : '<p class="small muted">No linked records available.</p>';
}
function detail(data) {
  const r = state.route,
    record = data.record,
    s = SECTIONS[r.section];
  const tabs = [
    ["details", "Details"],
    ["evidence", "Documents & media"],
    ["activity", "Activity"],
  ];
  if (
    [
      "support",
      "disputes",
      "returns",
      "orders",
      "customers",
      "merchants",
    ].includes(r.section)
  )
    tabs.push(["notes", "Internal notes"]);
  if (r.section === "support")
    tabs.splice(1, 0, ["conversation", "Conversation"]);
  if (r.section === "catalogue")
    tabs.splice(1, 0, ["variants", "Variants & stock"]);
  if (r.section === "orders")
    tabs.splice(1, 0, ["fulfilment", "Items & delivery"]);
  if (["refunds", "payouts", "reconciliation"].includes(r.section))
    tabs.splice(1, 0, ["ledger", "Ledger entries"]);
  if (!tabs.some(([key]) => key === r.tab))
    return (
      heading(r.section) +
      empty(
        "Tab not found",
        "Choose a valid record view.",
        link("Open details", r.section, r.id),
      )
    );
  const actions = Object.entries(ACTIONS).filter(
    ([key, a]) => a.section === r.section && canAct(key, record, state.viewer),
  );
  const draft = state.drafts.get(`${r.section}/${r.id}/note`) || "";
  let body = "";
  if (r.tab === "details")
    body = panel("Record details", recordFacts(r.section, record));
  if (r.tab === "activity")
    body = panel("Activity history", timeline(data.activity));
  if (r.tab === "evidence")
    body = `<div class="stack">${panel("Submitted images", media(data.media))}${panel("Documents", (data.documents || []).length ? data.documents.map((d) => `<article class="document">${icon("file")}<div><strong>${esc(d.name)}</strong><small>${esc(d.type || "Submitted document")} · ${esc(date(d.createdAt))}</small></div>${button("Open", "document", false, `data-id="${esc(d.id)}"`)}</article>`).join("") : empty("No documents supplied", "Supporting documents will appear here after submission."))}</div>`;
  if (r.tab === "notes")
    body = panel(
      "Internal notes",
      `<p class="small muted note-hint">Visible to authorized operators. Customer-facing replies belong in the support conversation.</p>${timeline(data.notes)}${recordPermission("add_note") ? `<form data-form="note">${textarea("note", "Add an internal note", draft, 'required minlength="3" maxlength="2000" data-draft="note"')}${errorSlot}<button class="btn primary" type="submit">Save note</button></form>` : ""}`,
    );
  if (r.tab === "conversation")
    body = panel(
      "Customer conversation",
      `${(data.messages || []).map((m) => `<article class="message ${m.senderRole === "agent" ? "agent" : ""}"><strong>${esc(m.senderName || human(m.senderRole))}</strong>${esc(m.body)}<small>${esc(date(m.createdAt))}</small></article>`).join("") || empty("No messages yet", "Messages from this support conversation will appear here.")}${recordPermission("reply_ticket") && ["open", "pending"].includes(record.status) ? `<form data-form="reply">${textarea("message", "Reply to customer", state.drafts.get(`support/${r.id}/reply`) || "", 'required maxlength="5000" data-draft="reply"')}<p class="small muted">Your reply will be sent to the customer and may trigger a notification.</p>${errorSlot}<button class="btn primary" type="submit">Send reply</button></form>` : '<p class="small muted">This conversation is read-only in its current state or for your role.</p>'}`,
    );
  if (r.tab === "variants")
    body = panel(
      "Variants & inventory",
      simpleTable(
        ["Variant", "SKU", "Price", "Available", "Reserved"],
        (data.variants || []).map((v) => [
          v.name,
          v.sku,
          money(v.priceMinor),
          v.available,
          v.reserved,
        ]),
      ),
    );
  if (r.tab === "fulfilment")
    body = `<div class="stack">${panel(
      "Order items",
      simpleTable(
        ["Product", "Variant", "Quantity", "Line total"],
        (data.items || []).map((i) => [
          i.name,
          i.variantName,
          i.quantity,
          money(i.totalMinor),
        ]),
      ),
    )}${panel(
      "Shipment",
      facts([
        ["Carrier", record.carrier],
        ["Tracking number", record.trackingNumber],
        ["Delivery status", human(record.shipmentStatus)],
        ["Verified delivery", date(record.deliveredAt)],
      ]),
    )}${panel("Tracking events", timeline(data.tracking))}</div>`;
  if (r.tab === "ledger")
    body = panel(
      "Ledger entries",
      simpleTable(
        ["Reference", "Account", "Direction", "Amount", "Recorded"],
        (data.entries || []).map((e) => [
          e.reference,
          e.accountName,
          human(e.direction),
          money(e.amountMinor),
          date(e.createdAt),
        ]),
      ),
    );
  const extra = [];
  if (recordPermission("assign"))
    extra.push(button("Assign operator", "assign"));
  if (
    r.section === "content" &&
    recordPermission("edit_content") &&
    record.status === "draft"
  )
    extra.push(button("Edit campaign", "edit-content"));
  if (
    r.section === "access" &&
    recordPermission("edit_roles") &&
    record.id !== state.viewer.id
  )
    extra.push(button("Edit roles", "edit-roles"));
  return `<div class="row between record-back">${link(`Back to ${s.title.toLowerCase()}`, r.section, "", { q: r.q, status: r.status, sort: r.sort, cursor: r.cursor }, "back-link")}${refreshTools()}</div><div class="detail-header"><span class="record-icon">${icon(s.icon)}</span><div><div class="eyebrow">${esc(record.reference || record.id)}</div><h1>${esc(title(record))}</h1></div>${badge(recordStatus(r.section, record))}</div><nav class="tabs" aria-label="Record views">${tabs.map(([key, label]) => `<a href="${esc(routeUrl(r.section, r.id, { tab: key, q: r.q, status: r.status, sort: r.sort, cursor: r.cursor }))}" ${key === r.tab ? 'aria-current="page"' : ""}>${label}</a>`).join("")}</nav><div class="detail-grid"><div>${body}</div><aside class="stack">${panel("Next steps", `${record.actionBlockReason ? notice(record.actionBlockReason) : ""}<p class="small muted">${actions.length ? "Review the evidence before making a decision." : "No decisions are available for this record in its current state or for your role."}</p><div class="action-stack">${actions.map(([key, a]) => button(a.label, "command", false, `data-key="${key}"`)).join("")}${extra.join("")}</div>`)}${panel("Connected records", relatedLinks(record))}${panel(
    "Record context",
    facts([
      ["Record ID", record.id],
      ["Created", date(record.createdAt)],
      ["Last updated", date(record.updatedAt)],
      ["Assigned to", record.assignedToName || "Unassigned"],
    ]),
  )}</aside></div>`;
}
function simpleTable(headings, rows) {
  return rows.length
    ? `<div class="table-scroll"><table><thead><tr>${headings.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v) => `<td>${esc(v ?? "—")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
    : empty(
        "No records supplied",
        "Details will appear when they are recorded by the service.",
      );
}
function renderSettings() {
  render(
    heading("settings") +
      `<div class="detail-grid"><div class="stack">${panel(
        "Your workspace",
        `<form data-form="preferences">${select(
          "density",
          "Table density",
          [
            ["comfortable", "Comfortable"],
            ["compact", "Compact"],
          ],
          state.preferences.density,
        )}<p class="small muted">This display preference is saved on this browser only.</p>${errorSlot}<button type="submit" class="btn primary">Save preference</button></form>`,
      )}${panel(
        "Session security",
        `${facts([
          ["Signed in as", state.viewer.email],
          [
            "Staff roles",
            state.viewer.roles
              .filter((r) => Object.hasOwn(ROLES, r))
              .map((r) => ROLES[r])
              .join(", "),
          ],
        ])}<div class="action-stack">${button("Manage authenticator", "mfa")}${button("Sign out of all sessions", "sign-out-all")}${button("Sign out", "sign-out")}</div>`,
      )}${panel("Connected services", `<p class="small muted">Connection status is checked on request.</p><div class="service-row"><span>Core API</span><span class="mono">${esc(new URL(state.config.apiUrl).host)}</span></div><div class="service-row"><span>Identity provider</span><span class="mono">${esc(new URL(state.config.supabaseUrl).host)}</span></div><div id="service-status"></div><div class="action-stack">${button("Check connections", "connections")}</div>`)}</div><aside class="stack">${panel(
        "Access & responsibilities",
        `<ul class="help-list">${state.viewer.roles
          .filter((r) => Object.hasOwn(ROLES, r))
          .map(
            (r) =>
              `<li><strong>${esc(ROLES[r])}</strong><p class="muted">${esc({ operations_admin: "Marketplace reviews and operational exceptions.", catalogue_moderator: "Product review and publication decisions.", support_agent: "Customer conversations, returns, and disputes.", finance_reviewer: "Payouts, refunds, and reconciliation.", security_admin: "Staff access and merchant identity review." }[r])}</p></li>`,
          )
          .join("")}</ul>`,
      )}${panel("Need more access?", `<p class="small muted">Contact your workspace security administrator. Roles and record permissions are verified by the service for every request.</p>`)}</aside></div>`,
  );
}
function commandDialog(key) {
  const record = state.data?.record,
    a = ACTIONS[key];
  if (!canAct(key, record, state.viewer)) {
    toast("This action is not available. Refresh the record.", true);
    return;
  }
  showDialog(
    a.label,
    `<form data-form="modal-command"><p class="small muted">${esc(title(record))} · ${esc(record.reference || record.id)}</p>${notice(a.impact)}${
      key === "resolve_dispute"
        ? select(
            "outcome",
            "Decision",
            [
              ["", "Select an outcome"],
              ["resolved_buyer", "Resolve in favour of customer"],
              ["resolved_merchant", "Resolve in favour of merchant"],
            ],
            "",
            "required",
          )
        : ""
    }${textarea("note", "Decision reason", "", 'required minlength="10" maxlength="500"')}<label class="check"><input type="checkbox" name="confirmed" required> I reviewed the record and understand the effect of this action.</label>${formFoot(a.label)}</form>`,
    { kind: "command", key, record, section: state.route.section },
  );
}
function contentDialog(edit = false) {
  if (edit ? !recordPermission("edit_content") : !permitted("content:create"))
    return;
  const record = edit ? state.data.record : {};
  const localDate = (v) =>
    v
      ? new Date(
          new Date(v).getTime() - new Date(v).getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, 16)
      : "";
  showDialog(
    edit ? "Edit campaign" : "Create campaign",
    `<form data-form="modal-content"><p class="small muted note-hint">Save a draft, then review it before publication. Dates use your local time zone.</p>${field("title", "Campaign title", record.title, "text", 'required maxlength="100"')}${select("placement", "Placement", ["home_hero", "home_collection", "category_feature"], record.placement)}<div class="form-grid">${select("targetType", "Destination", ["category", "product", "merchant"], record.targetType)}${field("targetId", "Destination ID", record.targetId, "text", 'required maxlength="200"')}</div>${field("imageUrl", "Image URL", record.imageUrl, "url", 'required placeholder="https://…"')}${field("altText", "Image description", record.altText, "text", 'required maxlength="180"')}<div class="form-grid">${field("startsAt", "Starts", localDate(record.startsAt), "datetime-local", "required")}${field("endsAt", "Ends", localDate(record.endsAt), "datetime-local", "required")}</div>${field("priority", "Display priority", record.priority ?? 0, "number", 'required min="0" max="100" step="1"')}${formFoot("Save draft")}</form>`,
    { kind: "content", record, edit },
  );
}
function roleFields(selected = []) {
  return `<fieldset class="role-options"><legend>Staff roles</legend>${Object.entries(
    ROLES,
  )
    .map(
      ([key, label]) =>
        `<label class="check"><input type="checkbox" name="roles" value="${key}" ${selected.includes(key) ? "checked" : ""}>${label}</label>`,
    )
    .join("")}</fieldset>`;
}
function accessDialog(edit = false) {
  if (edit ? !recordPermission("edit_roles") : !permitted("access:invite"))
    return;
  const record = edit ? state.data.record : {};
  if (edit && record.id === state.viewer.id) return;
  showDialog(
    edit ? "Edit staff roles" : "Invite an operator",
    `<form data-form="modal-access">${edit ? `<p>${esc(record.email)}</p>` : field("email", "Work email", "", "email", 'required autocomplete="email" maxlength="254"')}${roleFields(record.roles)}${textarea("note", "Reason for access", "", 'required minlength="10" maxlength="500"')}<p class="small muted">${edit ? "Changes take effect after the service confirms them." : "An invitation email will be sent to this operator. They must authenticate before accessing the workspace."}</p>${formFoot(edit ? "Save roles" : "Send invitation")}</form>`,
    { kind: "access", record, edit },
  );
}
async function assignmentDialog() {
  if (!recordPermission("assign")) return;
  const record = state.data.record,
    section = state.route.section;
  showDialog(
    "Assign operator",
    '<p role="status">Loading eligible operators…</p>',
  );
  const revision = modalRevision;
  try {
    const data = await state.api.request(
      `/v1/admin/${section}/${encodeURIComponent(record.id)}/assignees`,
    );
    if (!dialog.open || revision !== modalRevision) return;
    if (!Array.isArray(data.items))
      throw new Error("The operator list could not be read.");
    showDialog(
      "Assign operator",
      `<form data-form="modal-assign">${select("assigneeId", "Operator", [["", "Select an operator"], ...data.items.map((i) => [i.id, i.name || i.email])], record.assignedTo || "", "required")}${textarea("note", "Handoff note", "", 'required minlength="3" maxlength="500"')}${formFoot("Assign operator")}</form>`,
      { kind: "assign", record, section },
    );
  } catch (error) {
    if (dialog.open && revision === modalRevision)
      showDialog(
        "Assignment unavailable",
        notice(errorMessage(error), "error") + button("Close", "close-dialog"),
      );
  }
}
function searchDialog() {
  showDialog(
    "Find your next task",
    `<form data-form="search"><div class="row">${field("query", "Search records", "", "search", 'required minlength="2" maxlength="200" autofocus')}<button class="btn primary" type="submit">Search</button></div>${select(
      "section",
      "Workspace",
      Object.entries(SECTIONS)
        .filter(
          ([key]) => allowed(key) && !["overview", "settings"].includes(key),
        )
        .map(([key, s]) => [key, s.title]),
      allowed(state.route.section) &&
        !["overview", "settings"].includes(state.route.section)
        ? state.route.section
        : "",
    )}<p class="small muted">Search by a name, email, reference, or record ID.</p></form><div class="quick-links">${Object.entries(
      SECTIONS,
    )
      .filter(([key]) => allowed(key))
      .map(([key, s]) => link(s.title, key, "", {}, "quick-link"))
      .join("")}</div>`,
  );
}
const requests = new WeakMap();
const pendingRequests = new Map();
async function mutate(form, descriptor, message) {
  if (state.busy) return;
  const signature = JSON.stringify({
    actor: state.viewer.id,
    path: descriptor.path,
    body: descriptor.body,
    version: descriptor.version,
  });
  const request = requests.get(form) ||
    pendingRequests.get(signature) || {
      ...descriptor,
      key: crypto.randomUUID(),
    };
  requests.set(form, request);
  pendingRequests.set(signature, request);
  state.busy = true;
  const submit = form.querySelector('[type="submit"]');
  const label = submit.textContent;
  submit.disabled = true;
  submit.textContent = "Submitting…";
  const controls = [...form.querySelectorAll("input,textarea,select")];
  controls.forEach((el) => (el.disabled = true));
  try {
    await state.api.request(request.path, {
      method: request.method || "POST",
      body: request.body,
      key: request.key,
      version: request.version,
    });
    requests.delete(form);
    pendingRequests.delete(signature);
    state.busy = false;
    dialog.close();
    if (request.draftKey) state.drafts.delete(request.draftKey);
    state.notice = message;
    await loadRoute({ focus: false });
    toast(message);
  } catch (error) {
    const unknown =
      error.code === "NETWORK_ERROR" ||
      error.code === "INVALID_RESPONSE" ||
      error.status >= 500;
    if (!unknown) {
      requests.delete(form);
      pendingRequests.delete(signature);
    }
    controls.forEach((el) => (el.disabled = unknown));
    formError(
      form,
      new Error(
        `${errorMessage(error)}${unknown ? " The outcome is not yet confirmed. Retry submits the same request safely; fields are locked until it is resolved." : ""}`,
      ),
    );
    if (error.status === 409 || error.status === 412) {
      submit.disabled = true;
      submit.textContent = "Refresh required";
    } else {
      submit.disabled = false;
      submit.textContent = unknown ? "Retry same request" : label;
    }
    state.busy = false;
  }
}
function exportPage() {
  const items = state.data?.items;
  if (!items?.length) return;
  const rows = [
    [
      "Record ID",
      "Name",
      "Status",
      "Related party",
      "Amount (NGN minor units)",
      "Updated",
    ],
    ...items.map((r) => [
      r.id,
      title(r),
      recordStatus(state.route.section, r),
      r.merchantName || r.customerName || r.email || r.actorName,
      r.amountMinor ?? r.totalMinor ?? r.priceMinor,
      r.updatedAt || r.createdAt,
    ]),
  ];
  const blob = new Blob(
    ["\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${state.route.section}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("The current page was exported.");
}
async function openDocument(id) {
  const r = state.route;
  showDialog(
    "Secure document",
    '<p role="status">Requesting document access…</p>',
  );
  const revision = modalRevision;
  try {
    const data = await state.api.request(
      `/v1/admin/${r.section}/${encodeURIComponent(r.id)}/documents/${encodeURIComponent(id)}/access`,
    );
    const url = safeHttps(data.url);
    if (!url)
      throw new Error("The document service did not return a secure URL.");
    if (!dialog.open || revision !== modalRevision) return;
    showDialog(
      "Secure document",
      `<p class="small muted">${esc(data.name || "Submitted document")}</p><p class="small muted note-hint">${data.expiresAt ? `This access link expires ${esc(date(data.expiresAt))}.` : 'This evidence opens at the external address supplied with the record.'} Close the document when your review is complete.</p><a class="btn primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open document ${icon("arrow")}</a>`,
    );
  } catch (error) {
    if (dialog.open && revision === modalRevision)
      showDialog(
        "Document unavailable",
        notice(errorMessage(error), "error") + button("Close", "close-dialog"),
      );
  }
}
async function checkConnections() {
  const node = document.querySelector("#service-status");
  node.innerHTML = '<p role="status">Checking connections…</p>';
  try {
    const data = await state.api.request("/v1/admin/services");
    node.innerHTML =
      (data.services || [])
        .map(
          (s) =>
            `<div class="service-row"><span>${esc(s.name)}</span>${badge(s.status)}</div>`,
        )
        .join("") ||
      '<p class="small muted">No service status was supplied.</p>';
  } catch (error) {
    node.innerHTML = notice(errorMessage(error), "error");
  }
}
document.addEventListener("input", (event) => {
  const key = event.target.dataset.draft;
  if (key)
    state.drafts.set(
      `${state.route.section}/${state.route.id}/${key}`,
      event.target.value,
    );
});
document.addEventListener("keydown", (event) => {
  if (
    (event.metaKey || event.ctrlKey) &&
    event.key.toLowerCase() === "k" &&
    state.viewer
  ) {
    event.preventDefault();
    if (!state.busy) searchDialog();
  }
  if (event.key === "Escape") setMenu(false);
  const sidebar = document.querySelector("#sidebar.open");
  if (event.key === "Tab" && sidebar && !dialog.open) {
    const controls = [
      ...sidebar.querySelectorAll("a[href],button:not(:disabled)"),
    ];
    const first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
function setMenu(open) {
  const wasOpen = document
    .querySelector("#sidebar")
    ?.classList.contains("open");
  document.querySelector("#sidebar")?.classList.toggle("open", open);
  const workspace = document.querySelector(".workspace");
  if (workspace) workspace.inert = open;
  document
    .querySelector('[data-action="menu"]')
    ?.setAttribute("aria-expanded", String(open));
  if (open) document.querySelector("#sidebar a.active")?.focus();
  else if (wasOpen) document.querySelector('[data-action="menu"]')?.focus();
}
window.addEventListener("resize", () => {
  if (window.innerWidth > 760) setMenu(false);
});
document.addEventListener("click", async (event) => {
  if (state.busy && event.target.closest('a[href^="#"]')) {
    event.preventDefault();
    toast("Wait for the current request to finish.");
    return;
  }
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  try {
    if (state.busy && action !== "menu-close") return;
    if (action === "close-dialog") closeDialog();
    else if (action === "refresh") await loadRoute();
    else if (action === "menu")
      setMenu(!document.querySelector("#sidebar").classList.contains("open"));
    else if (action === "menu-close") setMenu(false);
    else if (action === "search") searchDialog();
    else if (action === "command") commandDialog(target.dataset.key);
    else if (action === "create-content") contentDialog();
    else if (action === "edit-content") contentDialog(true);
    else if (action === "invite") accessDialog();
    else if (action === "edit-roles") accessDialog(true);
    else if (action === "assign") await assignmentDialog();
    else if (action === "export") exportPage();
    else if (action === "document") await openDocument(target.dataset.id);
    else if (action === "image") {
      const url = safeHttps(target.dataset.url);
      if (url)
        showDialog(
          target.dataset.label,
          `<img class="image-preview" src="${esc(url)}" alt="${esc(target.dataset.label)}">`,
        );
    } else if (action === "connections") await checkConnections();
    else if (action === "sign-out" || action === "sign-out-all")
      showDialog(
        "Sign out",
        `<form data-form="sign-out"><p>${action === "sign-out-all" ? "Sign out of this workspace and all other sessions for this account?" : "Sign out of this workspace? Unsaved notes and replies will be discarded."}</p>${formFoot("Sign out")}</form>`,
        { scope: action === "sign-out-all" ? "global" : "local" },
      );
    else if (action === "mfa") await mfaDialog();
    else if (action === "enroll-mfa") await enrollMfa();
    else if (action === "retry-boot") await boot();
    else if (action === "retry-identity") await establishIdentity();
  } catch (error) {
    toast(errorMessage(error), true);
  }
});
document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!form.dataset.form) return;
  event.preventDefault();
  const kind = form.dataset.form;
  const values = Object.fromEntries(new FormData(form));
  try {
    if (requests.has(form)) {
      await mutate(
        form,
        requests.get(form),
        "The service confirmed your request.",
      );
      return;
    }
    if (kind === "accept-invitation") {
      const submit=form.querySelector('[type="submit"]'); submit.disabled=true;
      try {const {error}=await state.auth.verifyOtp({token_hash:invitationToken,type:'magiclink'});if(error)throw new Error('This invitation link is invalid or expired. Ask your administrator for a new invitation.');invitationToken=null;history.replaceState(null,'','#/overview');await establishIdentity();}finally{submit.disabled=false;}
      return;
    }
    if (kind === "filter") {
      location.hash = routeUrl(state.route.section, "", {
        q: values.q.trim(),
        status: values.status,
        sort: values.sort,
      });
      return;
    }
    if (kind === "search") {
      dialog.close();
      location.hash = routeUrl(values.section, "", { q: values.query.trim() });
      return;
    }
    if (kind === "preferences") {
      localStorage.setItem(
        "sfbf-admin-preferences",
        JSON.stringify({ density: values.density }),
      );
      state.preferences.density = values.density;
      document.body.dataset.density = values.density;
      toast("Display preference saved.");
      return;
    }
    if (kind === "sign-in" || kind === "recover" || kind === "reset-password") {
      await submitAuth(form, kind, values);
      return;
    }
    if (kind === "mfa-verify") {
      await verifyMfa(form, values);
      return;
    }
    if (kind === "sign-out") {
      const { error } = await state.auth.signOut({ scope: modalTask.scope });
      if (error) throw error;
      dialog.close();
      state.controller?.abort();
      state.viewer = null;
      state.data = null;
      state.drafts.clear();
      pendingRequests.clear();
      authPage();
      return;
    }
    if (!state.viewer) throw new Error("Sign in to continue.");
    if (kind === "modal-command") {
      const task = modalTask,
        a = ACTIONS[task.key];
      if (!canAct(task.key, task.record, state.viewer))
        throw new Error("This action is no longer available.");
      if (values.note.trim().length < 10)
        throw new Error("Give a reason of at least 10 characters.");
      await mutate(
        form,
        {
          path: a.path(task.record),
          body: a.body({ ...values, note: values.note.trim() }),
          version: task.record.version,
        },
        `${a.label}: confirmed by the service.`,
      );
    } else if (kind === "reply" || kind === "note") {
      const record = state.data.record,
        r = state.route,
        key = kind === "reply" ? "reply_ticket" : "add_note";
      if (!recordPermission(key))
        throw new Error("You do not have permission for this action.");
      const content = (kind === "reply" ? values.message : values.note).trim();
      if (content.length < (kind === "reply" ? 1 : 3))
        throw new Error("Enter a message before submitting.");
      const path =
        kind === "reply"
          ? `/v1/customer-care/tickets/${encodeURIComponent(record.id)}/agent-messages`
          : `/v1/admin/${r.section}/${encodeURIComponent(record.id)}/notes`;
      await mutate(
        form,
        {
          path,
          body: kind === "reply" ? { message: content } : { note: content },
          version: record.version,
          draftKey: `${r.section}/${r.id}/${kind}`,
        },
        kind === "reply"
          ? "Reply sent to the customer."
          : "Internal note saved.",
      );
    } else if (kind === "modal-content") {
      const task = modalTask;
      if (!safeHttps(values.imageUrl))
        throw new Error("Use an HTTPS image URL.");
      if (new Date(values.endsAt) <= new Date(values.startsAt))
        throw new Error("The end date must be after the start date.");
      if (
        !values.title.trim() ||
        !values.targetId.trim() ||
        !values.altText.trim()
      )
        throw new Error(
          "Complete the title, destination, and image description.",
        );
      await mutate(
        form,
        {
          path: `/v1/admin/content${task.edit ? `/${encodeURIComponent(task.record.id)}` : ""}`,
          method: task.edit ? "PATCH" : "POST",
          version: task.record.version,
          body: {
            ...values,
            title: values.title.trim(),
            targetId: values.targetId.trim(),
            altText: values.altText.trim(),
            priority: Number(values.priority),
            startsAt: new Date(values.startsAt).toISOString(),
            endsAt: new Date(values.endsAt).toISOString(),
          },
        },
        "Campaign draft saved.",
      );
    } else if (kind === "modal-access") {
      const task = modalTask,
        roles = new FormData(form).getAll("roles");
      if (!roles.length) throw new Error("Choose at least one staff role.");
      if (values.note.trim().length < 10)
        throw new Error("Give an access reason of at least 10 characters.");
      await mutate(
        form,
        {
          path: task.edit
            ? `/v1/admin/access/${encodeURIComponent(task.record.id)}/roles`
            : "/v1/admin/access/invitations",
          version: task.record.version,
          body: {
            ...(task.edit ? {} : { email: values.email.trim() }),
            roles,
            note: values.note.trim(),
          },
        },
        task.edit ? "Staff roles updated." : "Invitation queued for email delivery.",
      );
    } else if (kind === "modal-assign") {
      const task = modalTask;
      if (values.note.trim().length < 3)
        throw new Error("Enter a handoff note.");
      await mutate(
        form,
        {
          path: `/v1/admin/${task.section}/${encodeURIComponent(task.record.id)}/assign`,
          version: task.record.version,
          body: { assigneeId: values.assigneeId, note: values.note.trim() },
        },
        "Operator assigned.",
      );
    }
  } catch (error) {
    formError(form, error);
  }
});
window.addEventListener("hashchange", () => {
  if (state.busy) {
    history.replaceState(
      null,
      "",
      routeUrl(state.route.section, state.route.id, {
        tab: state.route.tab,
        q: state.route.q,
        status: state.route.status,
        sort: state.route.sort,
        cursor: state.route.cursor,
      }),
    );
    return;
  }
  if (state.viewer) {
    if (dialog.open && !state.busy) dialog.close();
    loadRoute();
  } else if (state.auth)
    authPage(location.hash === "#/recover" ? "recover" : "sign-in");
});
window.addEventListener("beforeunload", (event) => {
  if (
    state.busy ||
    pendingRequests.size ||
    [...state.drafts.values()].some((v) => v.trim())
  ) {
    event.preventDefault();
    event.returnValue = "";
  }
});
function authPage(mode = "sign-in", message = "") {
  state.controller?.abort();
  ++state.generation;
  state.data = null;
  const recover = mode === "recover",
    reset = mode === "reset-password";
  document.title = `${recover ? "Recover access" : reset ? "Reset password" : "Sign in"} · SellFastBuyFast`;
  app.innerHTML = `<main id="main" class="auth"><section class="auth-story"><div class="auth-brand-top"><a class="auth-brand-link" href="#/sign-in" aria-label="SellFastBuyFast Operations"><img src="assets/sellfastbuyfast-logo-white.png" alt="SellFastBuyFast" class="auth-logo-big" /></a><span class="auth-tag">OPERATIONS WORKSPACE</span></div><div class="auth-copy"><div class="eyebrow">Behind every great marketplace</div><h1>Good commerce.<br><em>Thoughtfully managed.</em></h1><p>One connected workspace for the people who keep our marketplace moving.</p><div class="auth-feature">${icon("store")} Merchant confidence, from the first review.</div><div class="auth-feature">${icon("shield")} Customer care, with the full picture.</div><div class="auth-feature">${icon("scale")} Every decision, clearly accounted for.</div></div><div class="auth-footer">SELLFASTBUYFAST · MARKETPLACE OPERATIONS</div></section><section class="auth-form-side"><div class="auth-card"><div class="auth-card-brand"><img src="assets/sellfastbuyfast-logo.png" alt="SellFastBuyFast" class="auth-card-logo" /></div><div class="eyebrow">Authorized staff only</div><h2>${recover ? "Recover your access" : reset ? "Choose a new password" : "Welcome to operations"}</h2><p>${recover ? "Enter your work email to request a password reset." : reset ? "Set a strong, unique password for your account." : "Sign in with your staff account to continue."}</p>${message ? notice(message) : ""}<form data-form="${mode}">${!reset ? field("email", "Work email", "", "email", 'required autocomplete="username" maxlength="254"') : ""}${!recover ? field("password", reset ? "New password" : "Password", "", "password", `required autocomplete="${reset ? "new-password" : "current-password"}" ${reset ? 'minlength="12"' : ""}`) : ""}${reset ? field("confirmPassword", "Confirm new password", "", "password", 'required autocomplete="new-password" minlength="12"') : ""}${errorSlot}<button class="btn primary" type="submit">${recover ? "Send recovery email" : reset ? "Update password" : "Sign in"} ${icon("arrow")}</button></form><div class="auth-note">${recover || reset ? '<a href="#/sign-in">Back to sign in</a>' : '<a href="#/recover">Forgot your password?</a>'}<p>Access is granted by your workspace administrator. Customer and merchant accounts do not grant staff access.</p></div></div></section></main>`;
}
async function submitAuth(form, mode, values) {
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    if (mode === "recover") {
      const { error } = await state.auth.resetPasswordForEmail(
        values.email.trim(),
        { redirectTo: `${location.origin}${location.pathname}` },
      );
      if (error) throw error;
      authPage(
        "recover",
        "If this address can receive recovery messages, a reset link will arrive shortly.",
      );
    } else if (mode === "reset-password") {
      if (values.password !== values.confirmPassword)
        throw new Error("Passwords must match.");
      const { error } = await state.auth.updateUser({
        password: values.password,
      });
      if (error) throw error;
      await establishIdentity();
    } else {
      const { error } = await state.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      });
      if (error)
        throw new Error(
          "Sign-in failed. Check your credentials and try again.",
        );
      await establishIdentity();
    }
  } catch (error) {
    formError(form, error);
  } finally {
    submit.disabled = false;
  }
}
async function establishIdentity() {
  state.viewer = null;
  app.innerHTML =
    '<main id="main" class="boot"><p role="status">Verifying your staff access…</p></main>';
  try {
    const { data: assurance, error: assuranceError } =
      await state.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) throw assuranceError;
    if (assurance.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
      await mfaDialog(true);
      return;
    }
    const viewer = await state.api.request("/v1/admin/me");
    if (
      !viewer?.id ||
      !Array.isArray(viewer.roles) ||
      !viewer.roles.some((r) => Object.hasOwn(ROLES, r))
    )
      throw new ApiError(
        "This account has no staff role. Contact your workspace administrator.",
        "FORBIDDEN",
        403,
      );
    if (viewer.requireMfa && assurance.currentLevel !== "aal2") {
      await mfaDialog(true);
      return;
    }
    if (state.lastViewerId && state.lastViewerId !== viewer.id)
      state.drafts.clear();
    state.lastViewerId = viewer.id;
    state.viewer = viewer;
    try {
      const saved = JSON.parse(
        localStorage.getItem("sfbf-admin-preferences") || "{}",
      );
      if (["comfortable", "compact"].includes(saved.density))
        state.preferences.density = saved.density;
    } catch {
      /* Storage restrictions do not prevent staff access. */
    }
    if (["#/sign-in", "#/recover", ""].includes(location.hash))
      history.replaceState(null, "", "#/overview");
    await loadRoute();
  } catch (error) {
    if (error.status === 401) {
      authPage("sign-in", "Sign in again to continue.");
      return;
    }
    app.innerHTML = `<main id="main" class="boot"><div class="access-state"><div class="brand-mark">${icon("shield")}</div><h1>${error.status === 403 ? "Staff access required" : "Staff workspace unavailable"}</h1><p>${esc(errorMessage(error))}</p><p class="small muted">The workspace opens only after the Core API verifies your staff permissions.</p><div class="row">${button("Retry access check", "retry-identity", true)}${button("Sign out", "sign-out")}</div></div></main>`;
  }
}
async function mfaDialog(required = false) {
  const { data, error } = await state.auth.mfa.listFactors();
  if (error) throw error;
  const factor = data.totp?.find((f) => f.status === "verified");
  if (factor) {
    if (required)
      showDialog(
        "Verify your identity",
        `<form data-form="mfa-verify"><p class="small muted note-hint">Enter the current six-digit code from your authenticator app.</p>${field("code", "Authenticator code", "", "text", 'required inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" maxlength="6"')}${formFoot("Verify and continue")}</form>`,
        { factorId: factor.id, required: true },
      );
    else
      showDialog(
        "Authenticator enabled",
        notice("Your account has a verified authenticator.", "success") +
          '<p class="small muted">For authenticator recovery or removal, contact your security administrator.</p>' +
          button("Close", "close-dialog"),
      );
  } else
    showDialog(
      "Protect your staff account",
      `<p class="small muted note-hint">Add an authenticator app to verify sensitive workspace access.</p>${button("Set up authenticator", "enroll-mfa", true)}${required ? button("Sign out", "sign-out") : ""}`,
      { required },
    );
}
async function enrollMfa() {
  const required = modalTask?.required;
  const { data: existing, error: listingError } =
    await state.auth.mfa.listFactors();
  if (listingError) throw listingError;
  // Clean up only incomplete enrollments created by this portal, never verified factors.
  for (const factor of existing.totp || [])
    if (
      factor.status === "unverified" &&
      factor.friendly_name === "SellFastBuyFast Operations"
    ) {
      const { error } = await state.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw error;
    }
  const { data, error } = await state.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "SellFastBuyFast Operations",
  });
  if (error) throw error;
  showDialog(
    "Set up your authenticator",
    `<form data-form="mfa-verify"><p class="small muted note-hint">Add a time-based account in your authenticator using this setup key, then enter the six-digit code.</p><code class="code">${esc(data.totp.secret)}</code>${field("code", "Authenticator code", "", "text", 'required inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" maxlength="6"')}${formFoot("Verify authenticator")}</form>`,
    { factorId: data.id, required },
  );
}
async function verifyMfa(form, values) {
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    const { error } = await state.auth.mfa.challengeAndVerify({
      factorId: modalTask.factorId,
      code: values.code,
    });
    if (error)
      throw new Error(
        "The code could not be verified. Enter the current code and try again.",
      );
    dialog.close();
    await establishIdentity();
  } finally {
    submit.disabled = false;
  }
}
function configUrl(value) {
  try {
    const u = new URL(value);
    return !u.username &&
      !u.password &&
      !u.search &&
      !u.hash &&
      (u.protocol === "https:" ||
        (u.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)))
      ? u.href.replace(/\/$/, "")
      : "";
  } catch {
    return "";
  }
}
async function loadConfig() {
  let config = window.SFBF_ADMIN_CONFIG;
  if (!config) {
    const result = await fetch("./api/runtime-config", {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);
    if (result?.ok) {
      const payload = await result.json().catch(() => null);
      if (payload?.success) config = payload.data;
    }
  }
  if (!config?.apiUrl) {
    await new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "./config.local.js";
      script.onload = resolve;
      script.onerror = resolve;
      document.head.append(script);
    });
    config = window.SFBF_ADMIN_CONFIG || config;
  }
  const apiUrl = configUrl(config?.apiUrl),
    supabaseUrl = configUrl(config?.supabaseUrl),
    key = config?.supabaseAnonKey;
  if (
    !apiUrl ||
    !supabaseUrl ||
    typeof key !== "string" ||
    !key ||
    /YOUR-|service_role|sb_secret_/.test(key)
  )
    throw new Error(
      "Public workspace configuration is missing or invalid. Configure the Core API URL and Supabase public credentials, then retry.",
    );
  if (key.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(
        atob(key.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
      );
      if (payload.role !== "anon") throw new Error();
    } catch {
      throw new Error(
        "Use a public Supabase anon key, never a privileged server credential.",
      );
    }
  }
  if (new URL(apiUrl).origin === new URL(supabaseUrl).origin)
    throw new Error("The Core API URL must point to the marketplace API.");
  return { apiUrl, supabaseUrl, supabaseAnonKey: key };
}
let authSubscription;
async function boot() {
  app.innerHTML =
    '<main id="main" class="boot"><p role="status">Connecting to your operations workspace…</p></main>';
  try {
    state.config = await loadConfig();
    if (!window.supabase?.createClient)
      throw new Error(
        "The identity client could not load. Refresh the page to retry.",
      );
    state.auth = window.supabase.createClient(
      state.config.supabaseUrl,
      state.config.supabaseAnonKey,
      {
        auth: {
          storageKey: "sfbf-admin-auth",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      },
    ).auth;
    state.api = new AdminApi(state.config, state.auth);
    authSubscription?.unsubscribe();
    let recovering = false;
    const { data } = state.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recovering = true;
        setTimeout(() => authPage("reset-password"), 0);
      }
      if (event === "SIGNED_OUT") {
        state.controller?.abort();
        ++state.generation;
        state.viewer = null;
        state.data = null;
        state.drafts.clear();
        pendingRequests.clear();
        state.notice = "";
        if (dialog.open) dialog.close();
        authPage();
      }
    });
    authSubscription = data.subscription;
    if(location.hash.startsWith('#/accept-invitation?')) {
      invitationToken=new URLSearchParams(location.hash.split('?')[1]).get('token');
      history.replaceState(null,'','#/accept-invitation');
      app.innerHTML=`<main id="main" class="boot"><div class="access-state"><div class="eyebrow">SellFastBuyFast Operations</div><h1>Accept your staff invitation</h1><p>Verify your invitation to open the staff workspace. You will also set up or verify your authenticator.</p><form data-form="accept-invitation">${errorSlot}<button class="btn primary" type="submit">Accept invitation</button></form></div></main>`;
      return;
    }
    const { data: session, error } = await state.auth.getSession();
    if (error) throw error;
    if (recovering) return;
    if (session.session) await establishIdentity();
    else authPage(location.hash === "#/recover" ? "recover" : "sign-in");
  } catch (error) {
    app.innerHTML = `<main id="main" class="boot"><div class="access-state"><div class="brand-mark">${icon("store")}</div><div class="eyebrow">SellFastBuyFast Operations</div><h1>Workspace connection required</h1><p>${esc(error.message)}</p>${button("Retry connection", "retry-boot", true)}<p class="small muted">Deployment configuration is managed by your workspace administrator.</p></div></main>`;
  }
}
boot();
