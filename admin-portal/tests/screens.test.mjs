// Isolated rendering and interaction checks. No test data or test transport is imported by the product.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import * as contracts from "../contracts.mjs";
import * as ui from "../ui.mjs";
import * as api from "../api.mjs";
const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
function workspace() {
  const elements = new Map();
  function element() {
    return {
      innerHTML: "",
      dataset: {},
      open: false,
      isConnected: true,
      focus() {},
      setAttribute() {},
      addEventListener() {},
      showModal() {
        this.open = true;
      },
      close() {
        this.open = false;
      },
      insertAdjacentHTML(_position, html) {
        this.innerHTML += html;
      },
    };
  }
  for (const id of ["#app", "#dialog", "#main"]) elements.set(id, element());
  const document = {
    querySelector: (selector) => elements.get(selector) || null,
    addEventListener() {},
    body: { dataset: {}, append() {} },
    createElement: element,
  };
  const context = vm.createContext({
    ...contracts,
    ...ui,
    ...api,
    document,
    window: { addEventListener() {} },
    location: { hash: "#/overview" },
    history: { replaceState() {} },
    URL,
    URLSearchParams,
    AbortController,
    DOMException,
    crypto: globalThis.crypto,
    console,
    setTimeout: () => 0,
    clearTimeout() {},
    localStorage: {
      getItem() {
        return null;
      },
    },
  });
  const code = source
    .replace(/^import[\s\S]*?from "[^"\n]+";\n/gm, "")
    .replace(
      /boot\(\);\s*$/,
      "globalThis.subject={state,overview,list,detail,renderSettings,authPage,commandDialog,contentDialog,accessDialog,mutate};",
    );
  vm.runInContext(code, context);
  context.subject.state.viewer = {
    id: "operator",
    name: "Operator",
    email: "operator@example.invalid",
    roles: Object.keys(contracts.ROLES),
    capabilities: ["content:create", "access:invite"],
  };
  context.subject.state.config = {
    apiUrl: "https://api.invalid",
    supabaseUrl: "https://auth.invalid",
  };
  return { subject: context.subject, elements };
}
for (const [section, s] of Object.entries(contracts.SECTIONS)) {
  test(`${section}: renders its workspace and applicable detail tabs`, () => {
    const { subject, elements } = workspace();
    subject.state.route = contracts.parseRoute(contracts.routeUrl(section));
    if (section === "overview") {
      assert.match(
        subject.overview({ metrics: [], queues: [], activity: [] }),
        /Needs your attention/,
      );
      return;
    }
    if (section === "settings") {
      subject.renderSettings();
      assert.match(elements.get("#main").innerHTML, /Session security/);
      return;
    }
    assert.match(subject.list({ items: [], total: 0 }), /No records yet/);
    const record = {
      id: "record",
      name: "<script>unsafe</script>",
      status: s.statuses?.[0],
      registrationState: "in_review",
      version: 1,
      allowedActions: [],
    };
    subject.state.route.q = "saved filter";
    const populated = subject.list({
      items: [record],
      total: 1,
      nextCursor: null,
    });
    assert.ok(populated.includes("q=saved+filter"));
    assert.ok(!populated.includes("<script>unsafe"));
    const data = {
      record,
      items: [],
      activity: [],
      notes: [],
      messages: [],
      documents: [],
      media: [],
      variants: [],
      tracking: [],
      entries: [],
    };
    subject.state.data = data;
    const tabs = ["details", "evidence", "activity"];
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
      tabs.push("notes");
    if (section === "support") tabs.push("conversation");
    if (section === "catalogue") tabs.push("variants");
    if (section === "orders") tabs.push("fulfilment");
    if (["refunds", "payouts", "reconciliation"].includes(section))
      tabs.push("ledger");
    for (const tab of tabs) {
      subject.state.route = { section, id: "record", tab };
      const html = subject.detail(data);
      assert.match(html, /Connected records/);
      assert.ok(!html.includes("<script>unsafe"));
      assert.match(html, new RegExp('aria-current="page"'));
    }
    subject.state.route.tab = "invalid";
    assert.match(subject.detail(data), /Tab not found/);
  });
}
test("Every command opens a reasoned confirmation with the correct record", () => {
  for (const [key, a] of Object.entries(contracts.ACTIONS)) {
    const { subject, elements } = workspace();
    const record = {
      id: "record",
      version: 1,
      status: a.from[0],
      registrationState: a.from[0],
      allowedActions: [key],
      requestedBy: "another",
    };
    subject.state.route = { section: a.section, id: "record" };
    subject.state.data = { record };
    subject.commandDialog(key);
    assert.equal(elements.get("#dialog").open, true, key);
    assert.match(
      elements.get("#dialog").innerHTML,
      /name="confirmed" required/,
    );
    assert.ok(elements.get("#dialog").innerHTML.includes(ui.esc(a.label)));
  }
});
test("Content, access and authentication forms are complete and do not invent records", () => {
  const { subject, elements } = workspace();
  subject.contentDialog();
  assert.match(elements.get("#dialog").innerHTML, /name="endsAt"/);
  subject.accessDialog();
  assert.match(elements.get("#dialog").innerHTML, /Send invitation/);
  for (const mode of ["sign-in", "recover", "reset-password"]) {
    subject.authPage(mode);
    assert.ok(elements.get("#app").innerHTML.includes(`data-form="${mode}"`));
  }
});
test("Unknown submission outcome preserves request key and locks values for retry", async () => {
  const { subject } = workspace();
  let calls = [];
  subject.state.api = {
    request: async (path, options) => {
      calls.push({ path, ...options });
      throw new api.ApiError("Disconnected", "NETWORK_ERROR");
    },
  };
  const submit = { textContent: "Confirm", disabled: false },
    input = { disabled: false },
    error = { textContent: "", focus() {} };
  const form = {
    querySelector: (q) => (q === '[type="submit"]' ? submit : error),
    querySelectorAll: () => [input],
  };
  const descriptor = {
    path: "/v1/admin/content",
    body: { title: "Unit test" },
    version: 1,
  };
  await subject.mutate(form, descriptor, "Confirmed");
  assert.equal(input.disabled, true);
  assert.equal(submit.textContent, "Retry same request");
  assert.match(error.textContent, /not yet confirmed/);
  await subject.mutate(form, descriptor, "Confirmed");
  assert.equal(calls[0].key, calls[1].key);
  assert.equal(subject.state.notice, "");
});
test("Conflict blocks resubmission until the operator refreshes", async () => {
  const { subject } = workspace();
  subject.state.api = {
    request: async () => {
      throw new api.ApiError("Stale", "CONFLICT", 409);
    },
  };
  const submit = { textContent: "Confirm" },
    input = {},
    error = { focus() {} };
  const form = {
    querySelector: (q) => (q === '[type="submit"]' ? submit : error),
    querySelectorAll: () => [input],
  };
  await subject.mutate(
    form,
    { path: "/v1/admin/content", body: {}, version: 1 },
    "Confirmed",
  );
  assert.equal(submit.disabled, true);
  assert.equal(submit.textContent, "Refresh required");
  assert.equal(subject.state.notice, "");
});
