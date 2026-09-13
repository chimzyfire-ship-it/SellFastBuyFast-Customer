import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIONS,
  SECTIONS,
  ROLES,
  canAct,
  canView,
  assertWorkspaceData,
  money,
  parseRoute,
  routeUrl,
  safeHttps,
  csvCell,
} from "../contracts.mjs";
import { AdminApi } from "../api.mjs";
import { esc, field, textarea, media } from "../ui.mjs";

for (const [key, action] of Object.entries(ACTIONS)) {
  test(`${key}: role, lifecycle, server eligibility, and version are all required`, () => {
    const viewer = { id: "operator", roles: action.roles };
    const record = {
      id: "record/id",
      version: 1,
      status: action.from[0],
      registrationState: action.from[0],
      allowedActions: [key],
      requestedBy: "another-operator",
    };
    assert.equal(canAct(key, record, viewer), true);
    assert.equal(canAct(key, { ...record, allowedActions: [] }, viewer), false);
    assert.equal(canAct(key, { ...record, version: undefined }, viewer), false);
    assert.equal(
      canAct(
        key,
        { ...record, status: "invalid", registrationState: "invalid" },
        viewer,
      ),
      false,
    );
    assert.equal(canAct(key, record, { id: "buyer", roles: ["buyer"] }), false);
    assert.ok(action.path(record).startsWith("/v1/"));
    assert.ok(action.path(record).includes("record%2Fid"));
    assert.ok(SECTIONS[action.section]);
  });
}
test("Staff access cannot be granted by a customer role or a prototype property", () => {
  for (const section of Object.keys(SECTIONS))
    assert.equal(canView(section, { roles: ["buyer"] }), false);
  assert.equal(canView("__proto__", { roles: ["operations_admin"] }), false);
  assert.equal(canAct("__proto__", {}, { roles: ["operations_admin"] }), false);
  assert.equal(canView("access", { roles: ["operations_admin"] }), false);
  assert.equal(canView("access", { roles: ["security_admin"] }), true);
});
test("Separation of duties and self-revocation", () => {
  const viewer = { id: "self", roles: Object.keys(ROLES) };
  assert.equal(
    canAct(
      "approve_payout",
      {
        id: "payout",
        version: 1,
        status: "pending_approval",
        requestedBy: "self",
        allowedActions: ["approve_payout"],
      },
      viewer,
    ),
    false,
  );
  assert.equal(
    canAct(
      "revoke_access",
      {
        id: "self",
        version: 1,
        status: "active",
        allowedActions: ["revoke_access"],
      },
      viewer,
    ),
    false,
  );
});
test("Deep links preserve opaque IDs, tabs and filters", () => {
  const r = parseRoute(
    routeUrl("orders", "a/b + c", {
      q: "search & space",
      tab: "fulfilment",
      status: "in_transit",
    }),
  );
  assert.equal(r.id, "a/b + c");
  assert.equal(r.q, "search & space");
  assert.equal(r.tab, "fulfilment");
  assert.equal(parseRoute("#/orders/a/b").section, "not-found");
  assert.equal(parseRoute("#//external.example/orders").section, "not-found");
  assert.equal(parseRoute("#/%E0%A4").section, "not-found");
});
test("Minor-unit amounts stay precise; unsafe numbers are rejected", () => {
  assert.equal(money("900719925474099301"), "₦9,007,199,254,740,993.01");
  assert.equal(money(-1), "−₦0.01");
  assert.equal(money(0), "₦0.00");
  assert.equal(money(9007199254740992), "—");
  assert.equal(money(1.5), "—");
  assert.equal(money(null), "—");
});
test("Untrusted text and export cells cannot inject HTML or spreadsheet formulas", () => {
  assert.equal(
    esc('<img src=x onerror="alert(1)">'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
  );
  assert.ok(
    field("name", "Name", '" autofocus onfocus="alert(1)').includes("&quot;"),
  );
  assert.ok(
    textarea("note", "Note", "</textarea><script>").includes(
      "&lt;/textarea&gt;",
    ),
  );
  assert.equal(csvCell(" =1+1"), '"\' =1+1"');
  assert.equal(csvCell('a"b'), '"a""b"');
  assert.equal(safeHttps("javascript:alert(1)"), "");
  assert.ok(
    !media([{ url: "javascript:alert(1)" }]).includes('src="javascript'),
  );
});
const auth = {
  getSession: async () => ({
    data: { session: { access_token: "unit-test-token" } },
  }),
};
test("API attaches session, idempotency, version, and prevents caching", async () => {
  let call;
  const api = new AdminApi(
    { apiUrl: "https://api.invalid/" },
    auth,
    async (...args) => {
      call = args;
      return new Response(
        JSON.stringify({ success: true, data: { accepted: true } }),
      );
    },
  );
  await api.request("/v1/admin/content", {
    method: "POST",
    body: { title: "title" },
    key: "request-key",
    version: 7,
  });
  assert.equal(call[0], "https://api.invalid/v1/admin/content");
  assert.equal(call[1].headers.Authorization, "Bearer unit-test-token");
  assert.equal(call[1].headers["Idempotency-Key"], "request-key");
  assert.equal(call[1].headers["If-Match"], "7");
  assert.equal(call[1].cache, "no-store");
  await assert.rejects(
    () => api.request("/v1/admin/content", { method: "POST", body: {} }),
    /request key/,
  );
  await assert.rejects(
    () => api.request("https://external.invalid"),
    /Only Core API/,
  );
});
test("API fails closed on expired sessions, errors, and invalid success responses", async () => {
  const missing = new AdminApi(
    { apiUrl: "https://api.invalid" },
    { getSession: async () => ({ data: { session: null } }) },
    () => assert.fail("No request should be made"),
  );
  await assert.rejects(
    () => missing.request("/v1/admin/me"),
    (e) => e.status === 401,
  );
  for (const [status, body] of [
    [403, { success: false, error: { message: "Denied" } }],
    [409, { success: false }],
    [200, { success: "true" }],
    [200, null],
  ]) {
    const api = new AdminApi(
      { apiUrl: "https://api.invalid" },
      auth,
      async () => new Response(JSON.stringify(body), { status }),
    );
    await assert.rejects(() => api.request("/v1/admin/me"));
  }
});
test("Network failure and caller abort remain distinguishable", async () => {
  const api = new AdminApi(
    { apiUrl: "https://api.invalid" },
    auth,
    async () => {
      throw new TypeError("Connection lost");
    },
  );
  await assert.rejects(
    () => api.request("/v1/admin/me"),
    (e) => e.code === "NETWORK_ERROR",
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => api.request("/v1/admin/me", { signal: controller.signal }),
    (e) => e.name === "AbortError",
  );
});

test("Missing collections are an integration error, never an empty queue", () => {
  assert.throws(() => assertWorkspaceData("overview", "", {}), /incomplete/);
  assert.throws(
    () => assertWorkspaceData("orders", "", { items: [] }),
    /incomplete/,
  );
  assert.doesNotThrow(() =>
    assertWorkspaceData("orders", "", { items: [], nextCursor: null }),
  );
  assert.throws(
    () =>
      assertWorkspaceData("support", "record", {
        record: { id: "record", allowedActions: [] },
        activity: [],
        media: [],
        documents: [],
        notes: [],
      }),
    /incomplete/,
  );
  assert.equal(canView("overview", { roles: ["constructor"] }), false);
});
