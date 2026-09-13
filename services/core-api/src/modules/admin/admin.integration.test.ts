import express from "express";
import { createApp } from "../../app.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { db, withDatabase, Database, closeDatabase } from "../../db/client.js";
import { config } from "../../lib/config.js";
import { atomicCommand } from "../../middleware/idempotency.js";
import { decide, addNoteOrAssign, saveCampaign } from "./admin.commands.js";
import { acceptDeliveredInvitation, manageAccess } from "./admin.access.js";
import { detailRecord, listRecords, query, freshStaff } from "./admin.store.js";
import {
  storefrontContent,
  advanceCampaigns,
  detectReconciliationGaps,
} from "./admin.workers.js";
import { Actor, ListQuery } from "./admin.policy.js";
function adapt(database: any): Database {
  return new Proxy(database, {
    get(target, key) {
      if (key === "execute")
        return async (statement: any) => (await target.execute(statement)).rows;
      if (key === "transaction")
        return async (fn: any) =>
          target.transaction((tx: any) => fn(adapt(tx)));
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as Database;
}
const ids = {
  ops: "10000000-0000-4000-8000-000000000001",
  security: "10000000-0000-4000-8000-000000000002",
  buyer: "10000000-0000-4000-8000-000000000003",
  merchant: "20000000-0000-4000-8000-000000000001",
  product: "30000000-0000-4000-8000-000000000001",
  category: "40000000-0000-4000-8000-000000000001",
  order: "50000000-0000-4000-8000-000000000001",
  return: "60000000-0000-4000-8000-000000000001",
};
const actor: Actor = {
  id: ids.ops,
  roles: ["operations_admin"],
  aal: "aal2",
  issuedAt: Math.floor(Date.now() / 1000) + 10,
};
const security: Actor = {
  ...actor,
  id: ids.security,
  roles: ["security_admin"],
};
const reason = "Reviewed the submitted record and evidence.";
test("Admin integration against isolated PostgreSQL migrations and transactions", async (t) => {
  const pg = new PGlite({ extensions: { citext, pgcrypto, uuid_ossp } });
  t.after(async () => {
    await pg.close();
    await closeDatabase();
  });
  await pg.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT null::uuid$$;
 CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  const root = path.resolve(__dirname, "../../../../../supabase/migrations");
  for (const file of (await readdir(root))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    const source = await readFile(path.join(root, file), "utf8");
    await pg.exec(source);
  }
  const store = adapt(drizzle(pg));
  config.admin.cursorSecret = "integration-test-cursor-secret-32-characters";
  config.admin.requireMfa = true;
  await withDatabase(store, async () => {
    for (const [key, id] of Object.entries(ids).filter(([key]) =>
      ["ops", "security", "buyer"].includes(key),
    ))
      await db.execute(
        sql`insert into auth.users(id,email,raw_user_meta_data) values(${id},${key + "@example.invalid"},${JSON.stringify({ full_name: key })}::jsonb)`,
      );
    await db.execute(
      sql`insert into user_roles(user_id,role) values(${ids.ops},'operations_admin'),(${ids.security},'security_admin')`,
    );
    await db.execute(
      sql`insert into merchants(id,slug,business_name,contact_email,contact_phone,state,lga,address,status,registration_state) values(${ids.merchant},'integration-merchant','Integration Merchant','merchant@example.invalid','08000000000','Lagos','Ikeja','Test address','active','registered')`,
    );
    await db.execute(
      sql`insert into categories(id,name,slug) values(${ids.category},'Category','category')`,
    );
    await db.execute(
      sql`insert into products(id,merchant_id,category_id,title,slug,base_price_minor,status) values(${ids.product},${ids.merchant},${ids.category},'Integration listing','integration-listing',900719925474099301,'published')`,
    );
    await db.execute(
      sql`insert into orders(id,order_number,buyer_id,merchant_id,delivery_address,subtotal_minor,total_amount_minor,status) values(${ids.order},'TEST-ORDER',${ids.buyer},${ids.merchant},'{}',10000,10000,'delivered')`,
    );
    await db.execute(
      sql`insert into return_requests(id,order_id,buyer_id,merchant_id,reason) values(${ids.return},${ids.order},${ids.buyer},${ids.merchant},'Item needs review')`,
    );
    await t.test(
      "All read models have detail collections; money stays exact and secrets are excluded",
      async () => {
        for (const section of [
          "merchants",
          "catalogue",
          "orders",
          "customers",
          "returns",
          "disputes",
          "support",
          "refunds",
          "payouts",
          "reconciliation",
          "content",
          "audit",
          "access",
        ]) {
          const viewer = section === "access" ? security : actor;
          const page = await listRecords(section, ListQuery.parse({}), viewer);
          assert.ok(Array.isArray(page.items));
          for (const row of page.items) {
            const data = await detailRecord(section, row.id, viewer);
            for (const key of ["activity", "media", "documents"])
              assert.ok(Array.isArray(data[key]));
            assert.ok(!JSON.stringify(data).includes("director_nin_encrypted"));
            assert.ok(!JSON.stringify(data).includes("account_number"));
          }
        }
        assert.equal(
          ((await detailRecord("catalogue", ids.product, actor)).record as any)
            .priceMinor,
          "900719925474099301",
        );
      },
    );
    await t.test(
      "Roles and MFA are verified against current database grants",
      async () => {
        await assert.rejects(
          () => freshStaff({ ...actor, aal: "aal1" }),
          /Authenticator/,
        );
        await assert.rejects(
          () => freshStaff({ ...actor, id: ids.buyer }),
          /permission/,
        );
        await assert.rejects(
          () => listRecords("access", ListQuery.parse({}), actor),
          /permission/,
        );
      },
    );
    await t.test(
      "Idempotency, atomic rollback, and stale-record protection",
      async () => {
        const version = (
          (await detailRecord("customers", ids.buyer, actor)).record as any
        ).version;
        let calls = 0;
        const work = async () => {
          calls++;
          return decide(actor, "customers", ids.buyer, "restrict", version, {
            note: reason,
          });
        };
        assert.deepEqual(
          await atomicCommand("test", actor.id, "same", "hash", work),
          await atomicCommand("test", actor.id, "same", "hash", work),
        );
        assert.equal(calls, 1);
        await assert.rejects(
          () => atomicCommand("test", actor.id, "same", "different", work),
          /different input/,
        );
        await assert.rejects(
          () =>
            atomicCommand("test", actor.id, "rollback", "hash", async () => {
              await db.execute(
                sql`update admin_customer_controls set restricted=false where id=${ids.buyer}`,
              );
              throw Error("rollback");
            }),
          /rollback/,
        );
        assert.equal(
          (
            await query(
              sql`select restricted from admin_customer_controls where id=${ids.buyer}`,
            )
          )[0].restricted,
          true,
        );
        assert.equal(
          (
            await query(
              sql`select key from idempotency_keys where key=${"test:" + actor.id + ":rollback"}`,
            )
          ).length,
          0,
        );
        await assert.rejects(
          () =>
            atomicCommand("test", actor.id, "stale", "hash", () =>
              decide(actor, "customers", ids.buyer, "restore", version, {
                note: reason,
              }),
            ),
          /changed/,
        );
      },
    );
    await t.test(
      "Internal notes remain separate from customer messages",
      async () => {
        const record = (await detailRecord("returns", ids.return, actor))
          .record as any;
        await atomicCommand("test", actor.id, "note", "hash", () =>
          addNoteOrAssign(
            actor,
            "returns",
            ids.return,
            "notes",
            record.version,
            { note: reason },
          ),
        );
        const updated = await detailRecord("returns", ids.return, actor);
        assert.equal((updated.notes as any[]).length, 1);
        assert.equal((updated.messages as any[]).length, 0);
      },
    );
    await t.test(
      "Dispute escalation holds funds; buyer resolution creates a real review without moving money",
      async () => {
        const record = (await detailRecord("returns", ids.return, actor))
          .record as any;
        await atomicCommand("test", actor.id, "escalate", "hash", () =>
          decide(actor, "returns", ids.return, "escalate", record.version, {
            note: reason,
          }),
        );
        assert.equal(
          (await query(sql`select status from orders where id=${ids.order}`))[0]
            .status,
          "disputed",
        );
        const [dispute] = await query(
          sql`select id,admin_version::text as version from disputes where order_id=${ids.order}`,
        );
        await atomicCommand("test", actor.id, "resolve", "hash", () =>
          decide(
            actor,
            "disputes",
            String(dispute.id),
            "resolve",
            dispute.version,
            { note: reason, outcome: "resolved_buyer" },
          ),
        );
        const refunds = await listRecords(
          "refunds",
          ListQuery.parse({}),
          actor,
        );
        assert.equal(refunds.items.length, 1);
        assert.equal(refunds.items[0].status, "review_required");
        assert.deepEqual(refunds.items[0].allowedActions, []);
        assert.equal(
          (await query(sql`select count(*)::int count from journal_entries`))[0]
            .count,
          0,
        );
      },
    );
    await t.test(
      "Campaign publication, target eligibility and expiration are enforced on storefront reads",
      async () => {
        const imageUrl = new URL(
          "/storage/v1/object/public/product-media/integration.jpg",
          config.supabaseUrl,
        ).href;
        await db.execute(
          sql`insert into product_media(product_id,media_url) values(${ids.product},${imageUrl})`,
        );
        const input = {
          title: "Integration campaign",
          placement: "home_hero",
          targetType: "product",
          targetId: ids.product,
          imageUrl,
          altText: "Product image",
          priority: 1,
          startsAt: new Date(Date.now() - 1000).toISOString(),
          endsAt: new Date(Date.now() + 60000).toISOString(),
        };
        const result = await atomicCommand(
          "test",
          actor.id,
          "campaign",
          "hash",
          () => saveCampaign(actor, input),
        );
        assert.equal((await storefrontContent()).length, 0);
        const record = (await detailRecord("content", result.id, actor))
          .record as any;
        await atomicCommand("test", actor.id, "publish", "hash", () =>
          decide(actor, "content", result.id, "publish", record.version, {
            note: reason,
          }),
        );
        assert.equal((await storefrontContent()).length, 1);
        await db.execute(
          sql`update merchants set status='suspended' where id=${ids.merchant}`,
        );
        assert.equal((await storefrontContent()).length, 0);
        await db.execute(
          sql`update merchants set status='active' where id=${ids.merchant}`,
        );
        await db.execute(
          sql`update admin_campaigns set starts_at=clock_timestamp()-interval '2 minutes',ends_at=clock_timestamp()-interval '1 minute' where id=${result.id}`,
        );
        await advanceCampaigns();
        assert.equal(
          (
            await query(
              sql`select status from admin_campaigns where id=${result.id}`,
            )
          )[0].status,
          "archived",
        );
      },
    );
    await t.test(
      "HTTP admin routes and legacy replies share authorization, version checks and atomic retries",
      async () => {
        const original = supabaseAdmin.auth.getUser.bind(supabaseAdmin.auth);
        const token =
          "test." +
          Buffer.from(
            JSON.stringify({ aal: "aal2", iat: actor.issuedAt }),
          ).toString("base64url") +
          ".test";
        supabaseAdmin.auth.getUser = (async (value: string) =>
          value === token
            ? {
                data: {
                  user: {
                    id: ids.ops,
                    email: "ops@example.invalid",
                    email_confirmed_at: new Date().toISOString(),
                  },
                },
                error: null,
              }
            : { data: { user: null }, error: new Error("Invalid") }) as any;
        const wrapper = express();
        wrapper.use((_req, _res, next) => withDatabase(store, next));
        wrapper.use(createApp());
        const server = await new Promise<import("node:http").Server>(
          (resolve) => {
            const server = wrapper.listen(0, "127.0.0.1", () =>
              resolve(server),
            );
          },
        );
        const port = (server.address() as import("node:net").AddressInfo).port;
        async function request(route: string, options: RequestInit = {}) {
          return fetch(`http://127.0.0.1:${port}${route}`, {
            ...options,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              ...options.headers,
            },
          });
        }
        try {
          const me = await request("/v1/admin/me");
          assert.equal(me.status, 200);
          assert.ok(
            ((await me.json()) as any).data.roles.includes("operations_admin"),
          );
          const denied = await fetch(
            `http://127.0.0.1:${port}/v1/admin/overview`,
          );
          assert.equal(denied.status, 401);
          assert.equal((await request("/v1/admin/access")).status, 403);
          const overview = await request("/v1/admin/overview");
          assert.equal(overview.status, 200);
          assert.ok(
            Array.isArray(((await overview.json()) as any).data.queues),
          );
          const ticket = "70000000-0000-4000-8000-000000000001";
          await db.execute(
            sql`insert into support_tickets(id,user_id,subject,body) values(${ticket},${ids.buyer},'Integration support','Help requested')`,
          );
          const record = (
            (await (await request("/v1/admin/support/" + ticket)).json()) as any
          ).data.record;
          const options = {
            method: "POST",
            headers: {
              "Idempotency-Key": "legacy-reply",
              "If-Match": record.version,
            },
            body: JSON.stringify({ message: "An authorized support reply." }),
          };
          const first = await request(
            "/v1/customer-care/tickets/" + ticket + "/agent-messages",
            options,
          );
          assert.equal(first.status, 201);
          const repeat = await request(
            "/v1/customer-care/tickets/" + ticket + "/agent-messages",
            options,
          );
          assert.equal(repeat.status, 201);
          assert.equal(
            (
              await query(
                sql`select count(*)::int count from support_ticket_messages where ticket_id=${ticket}`,
              )
            )[0].count,
            1,
          );
          const stale = await request(
            "/v1/customer-care/tickets/" + ticket + "/close",
            {
              method: "POST",
              headers: {
                "Idempotency-Key": "legacy-close",
                "If-Match": record.version,
              },
              body: JSON.stringify({ note: reason }),
            },
          );
          assert.equal(stale.status, 412);
          const current = (
            (await (await request("/v1/admin/support/" + ticket)).json()) as any
          ).data.record;
          const closed = await request(
            "/v1/customer-care/tickets/" + ticket + "/close",
            {
              method: "POST",
              headers: {
                "Idempotency-Key": "legacy-close-after-refresh",
                "If-Match": current.version,
              },
              body: JSON.stringify({ note: reason }),
            },
          );
          assert.equal(closed.status, 200);
          assert.equal(
            (
              await query(
                sql`select status from support_tickets where id=${ticket}`,
              )
            )[0].status,
            "closed",
          );
        } finally {
          supabaseAdmin.auth.getUser = original;
          await new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          );
        }
      },
    );
    await t.test(
      "Invitations grant only verified recipients after delivery",
      async () => {
        const recipient = {
          ...actor,
          id: ids.buyer,
          email: "buyer@example.invalid",
        };
        const [inv] = await query(
          sql`insert into admin_invitations(email,roles,invited_by) values('buyer@example.invalid',ARRAY['support_agent'],${security.id}) returning id`,
        );
        await acceptDeliveredInvitation(recipient, true);
        assert.equal(
          (
            await query(
              sql`select role from user_roles where user_id=${ids.buyer} and role='support_agent'`,
            )
          ).length,
          0,
        );
        await db.execute(
          sql`update admin_invitations set delivered_at=clock_timestamp() where id=${inv.id}`,
        );
        await acceptDeliveredInvitation(recipient, false);
        assert.equal(
          (
            await query(
              sql`select role from user_roles where user_id=${ids.buyer} and role='support_agent'`,
            )
          ).length,
          0,
        );
        await acceptDeliveredInvitation(recipient, true);
        assert.equal(
          (await freshStaff(recipient)).roles.includes("support_agent"),
          true,
        );
        assert.equal(
          (
            await query(
              sql`select status from admin_invitations where id=${inv.id}`,
            )
          )[0].status,
          "accepted",
        );
      },
    );
    await t.test(
      "Provider-gap detection executes without creating synthetic mismatches",
      async () => {
        assert.equal(await detectReconciliationGaps(), 0);
      },
    );
    await t.test(
      "Self-revocation is blocked and access revocation removes server roles",
      async () => {
        await assert.rejects(
          () =>
            atomicCommand("test", security.id, "self", "hash", () =>
              manageAccess(
                security,
                "revoke",
                { note: reason },
                security.id,
                "1",
              ),
            ),
          /own staff/,
        );
        const record = (await detailRecord("access", ids.ops, security))
          .record as any;
        await atomicCommand("test", security.id, "revoke", "hash", () =>
          manageAccess(
            security,
            "revoke",
            { note: reason },
            ids.ops,
            record.version,
          ),
        );
        await assert.rejects(() => freshStaff(actor), /no longer valid/);
      },
    );
    await t.test("Audit is append-only", async () => {
      await assert.rejects(() =>
        db.execute(sql`update audit_events set action='tampered'`),
      );
    });
    await t.test(
      "Cursor paging has stable keys and rejects changed filters",
      async () => {
        const page = await listRecords(
          "access",
          ListQuery.parse({ limit: 1 }),
          security,
        );
        assert.ok(page.nextCursor);
        const next = await listRecords(
          "access",
          ListQuery.parse({ limit: 1, cursor: page.nextCursor }),
          security,
        );
        assert.notEqual(page.items[0].id, next.items[0].id);
        await assert.rejects(
          () =>
            listRecords(
              "access",
              ListQuery.parse({
                limit: 1,
                q: "changed",
                cursor: page.nextCursor,
              }),
              security,
            ),
          /cursor/,
        );
      },
    );
  });
});
