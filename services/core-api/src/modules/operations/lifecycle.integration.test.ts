import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import express from "express";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { db, withDatabase, Database, closeDatabase } from "../../db/client.js";
import { createApp } from "../../app.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { config } from "../../lib/config.js";
import { query } from "../admin/admin.store.js";
import {
  releaseExpiredReservations,
  completeEligibleOrders,
} from "../../workers/workers.js";
import { leasedJob, validRunnerSecret } from "./runtime.js";
const id = () => crypto.randomUUID();
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

test("Non-payment purchase lifecycle through real SQL and HTTP", async (t) => {
  const pg = new PGlite({ extensions: { citext, pgcrypto, uuid_ossp } });
  t.after(async () => {
    await pg.close();
    await closeDatabase();
  });
  await pg.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT null::uuid$$;
 CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  const migrations = path.resolve(
    __dirname,
    "../../../../../supabase/migrations",
  );
  for (const file of (await readdir(migrations))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await pg.exec(await readFile(path.join(migrations, file), "utf8"));
  const database = adapt(drizzle(pg));
  await withDatabase(database, async () => {
    config.admin.cursorSecret = "isolated-test-cursor-secret-at-least32";
    config.admin.requireMfa = true;
    config.admin.financeEnabled = false;
    config.paymentMode = "mock";
    config.fulfilment.logisticsWebhookSecrets = {
      "test-carrier": "isolated-carrier-key",
      "wrong-carrier": "isolated-wrong-key",
    };
    config.operationsSecret = "isolated-runner-key-at-least-32-characters";
    const buyer = id(),
      merchantUser = id(),
      outsider = id(),
      ops = id(),
      moderator = id(),
      merchant = id(),
      product = id(),
      variant = id();
    for (const user of [buyer, merchantUser, outsider, ops, moderator])
      await db.execute(
        sql`insert into auth.users(id,email) values(${user},${user + "@example.invalid"})`,
      );
    await db.execute(
      sql`insert into user_roles(user_id,role) values(${ops},'operations_admin'),(${moderator},'catalogue_moderator')`,
    );
    await db.execute(
      sql`insert into merchants(id,slug,business_name,contact_email,contact_phone,state,lga,address,status,registration_state) values(${merchant},'lifecycle-store','Lifecycle Store','vendor@example.invalid','08000000000','Lagos','Ikeja','Test address','active','registered')`,
    );
    await db.execute(
      sql`insert into merchant_members(merchant_id,user_id,role) values(${merchant},${merchantUser},'owner')`,
    );
    await db.execute(
      sql`insert into products(id,merchant_id,title,slug,base_price_minor,status) values(${product},${merchant},'Lifecycle product','lifecycle-product',10000,'published')`,
    );
    await db.execute(
      sql`insert into product_variants(id,product_id,sku,title,price_minor) values(${variant},${product},'LIFECYCLE-SKU','Standard',10000)`,
    );
    await db.execute(
      sql`insert into inventory_levels(variant_id,available_quantity,reserved_quantity) values(${variant},8,2)`,
    );
    async function order(status: string) {
      const orderId = id();
      await db.execute(
        sql`insert into orders(id,order_number,buyer_id,merchant_id,delivery_address,subtotal_minor,total_amount_minor,status) values(${orderId},${"TEST-" + orderId},${buyer},${merchant},'{}',10000,10000,${status}::order_status_type)`,
      );
      return orderId;
    }
    const original = supabaseAdmin.auth.getUser.bind(supabaseAdmin.auth);
    const tokens = new Map<string, string>();
    for (const user of [buyer, merchantUser, outsider, ops, moderator])
      tokens.set(
        user,
        "test." +
          Buffer.from(
            JSON.stringify({
              sub: user,
              aal: "aal2",
              iat: Math.floor(Date.now() / 1000),
            }),
          ).toString("base64url") +
          ".test",
      );
    supabaseAdmin.auth.getUser = (async (token: string) => {
      const user = [...tokens.entries()].find(
        ([, value]) => value === token,
      )?.[0];
      return {
        data: {
          user: user
            ? {
                id: user,
                email: user + "@example.invalid",
                email_confirmed_at: new Date().toISOString(),
              }
            : null,
        },
        error: user ? null : new Error("Invalid token"),
      };
    }) as any;
    const wrapper = express();
    wrapper.use((_req, _res, next) => withDatabase(database, next));
    wrapper.use(createApp());
    const server = await new Promise<import("node:http").Server>(
      (resolve, reject) => {
        const server = wrapper.listen(0, "127.0.0.1", () => resolve(server));
        server.once("error", reject);
      },
    );
    t.after(async () => {
      supabaseAdmin.auth.getUser = original;
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });
    const base = `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}`;
    async function request(
      route: string,
      user: string | null = buyer,
      method = "GET",
      body?: unknown,
      key: string = id(),
      extra: Record<string, string> = {},
    ) {
      const response = await fetch(base + route, {
        method,
        headers: {
          ...(user ? { Authorization: `Bearer ${tokens.get(user)}` } : {}),
          "Content-Type": "application/json",
          "Idempotency-Key": key,
          ...extra,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: (await response.json()) as any };
    }
    await t.test('Safari no-store preflight permits its browser-added cache headers', async () => {
      const response = await fetch(base + '/v1/admin/me', {
        method: 'OPTIONS',
        headers: {Origin: 'https://sell-fast-buy-fast-admin.vercel.app', 'Access-Control-Request-Method':'GET', 'Access-Control-Request-Headers':'authorization,cache-control,pragma'},
      });
      assert.equal(response.status,204);
      const allowed = response.headers.get('access-control-allow-headers')!.toLowerCase().split(',').map(value=>value.trim());
      for (const header of ['authorization','cache-control','pragma']) assert.ok(allowed.includes(header), header);
      assert.equal(response.headers.get('access-control-allow-origin'),'https://sell-fast-buy-fast-admin.vercel.app');
    });
    await t.test(
      "Payment boundary creates no order or stock mutation",
      async () => {
        assert.equal(
          (await request("/v1/orders/checkout", buyer, "POST", {})).status,
          503,
        );
        assert.equal(
          (await query(sql`select count(*)::int n from orders`))[0].n,
          0,
        );
        assert.equal(
          (
            await query(
              sql`select available_quantity from inventory_levels where variant_id=${variant}`,
            )
          )[0].available_quantity,
          8,
        );
      },
    );
    let deliveredOrder: string;
    await t.test(
      "Only the owning vendor fulfils; retries do not duplicate milestones",
      async () => {
        // Payment-confirmed is an isolated fixture, never a product endpoint or live seed.
        deliveredOrder = await order("payment_confirmed");
        const root = "/v1/fulfilment/orders/" + deliveredOrder;
        assert.equal(
          (await request(root + "/accept", outsider, "POST", {})).status,
          403,
        );
        assert.equal(
          (await request(root + "/accept", moderator, "POST", {})).status,
          403,
        );
        const accepted = await request(
          root + "/accept",
          merchantUser,
          "POST",
          {},
          "accept-once",
        );
        assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
        assert.equal(
          (
            await request(
              root + "/accept",
              merchantUser,
              "POST",
              {},
              "accept-once",
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(root + "/ship", merchantUser, "POST", {
              carrier: "Test Carrier",
              trackingCode: "TRACK-1",
            })
          ).status,
          409,
        );
        assert.equal(
          (await request(root + "/pack", merchantUser, "POST", {})).status,
          200,
        );
        assert.equal(
          (
            await request(root + "/ship", merchantUser, "POST", {
              carrier: "Test Carrier",
              trackingCode: "TRACK-1",
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await request(root + "/deliver", merchantUser, "POST", {
              deliveryEvidenceUrl: "https://evidence.example.invalid/proof.jpg",
            })
          ).status,
          403,
        );
        assert.equal(
          (await request("/v1/orders/" + deliveredOrder, outsider)).status,
          404,
        );
        const details = await request("/v1/orders/" + deliveredOrder);
        assert.equal(details.status, 200);
        assert.equal(details.body.data.status, "in_transit");
      },
    );
    await t.test(
      "Signed delivery requires carrier ownership and replay-safe evidence",
      async () => {
        const body = {
          eventId: "DELIVERY-1",
          event: "delivered",
          orderId: deliveredOrder,
          deliveryEvidenceUrl: "https://evidence.example.invalid/proof.jpg",
        };
        const signature = (secret: string) =>
          crypto
            .createHmac("sha256", secret)
            .update(JSON.stringify(body))
            .digest("hex");
        assert.equal(
          (
            await request(
              "/v1/fulfilment/webhooks/test-carrier",
              null,
              "POST",
              body,
              id(),
              { "x-logistics-signature": "bad" },
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await request(
              "/v1/fulfilment/webhooks/wrong-carrier",
              null,
              "POST",
              body,
              id(),
              { "x-logistics-signature": signature("isolated-wrong-key") },
            )
          ).status,
          403,
        );
        const headers = {
          "x-logistics-signature": signature("isolated-carrier-key"),
        };
        const delivered = await request(
          "/v1/fulfilment/webhooks/test-carrier",
          null,
          "POST",
          body,
          id(),
          headers,
        );
        assert.equal(delivered.status, 200, JSON.stringify(delivered.body));
        assert.equal(
          (
            await request(
              "/v1/fulfilment/webhooks/test-carrier",
              null,
              "POST",
              body,
              id(),
              headers,
            )
          ).body.data.status,
          "already_processed",
        );
        assert.equal(
          (
            await query(
              sql`select count(*)::int n from notifications where user_id=${buyer} and type='order_delivered'`,
            )
          )[0].n,
          1,
        );
      },
    );
    await t.test(
      "Buyer return, vendor decision and admin receipt connect without releasing money",
      async () => {
        const created = await request(
          "/v1/customer-care/returns",
          buyer,
          "POST",
          { orderId: deliveredOrder, reason: "Delivered item is damaged" },
        );
        assert.equal(created.status, 201, JSON.stringify(created.body));
        const returnId = created.body.data.id;
        assert.equal(
          (
            await request("/v1/customer-care/returns", buyer, "POST", {
              orderId: deliveredOrder,
              reason: "Duplicate return",
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              "/v1/customer-care/returns/" + returnId + "/decision",
              merchantUser,
              "POST",
              {
                decision: "approved",
                note: "Inspected the submitted details.",
              },
            )
          ).status,
          200,
        );
        const detail = await request("/v1/admin/returns/" + returnId, ops);
        const received = await request(
          "/v1/customer-care/returns/" + returnId + "/received",
          ops,
          "POST",
          { note: "Returned package received and inspected." },
          id(),
          { "If-Match": detail.body.data.record.version },
        );
        assert.equal(received.status, 200, JSON.stringify(received.body));
        assert.equal(
          (
            await query(
              sql`select status from admin_refund_reviews where return_id=${returnId}`,
            )
          )[0].status,
          "review_required",
        );
        assert.equal(await completeEligibleOrders(), 0);
        assert.equal(
          (await query(sql`select count(*)::int n from journal_entries`))[0].n,
          0,
        );
      },
    );
    await t.test(
      "Cancellation and expiry return reserved stock exactly once",
      async () => {
        for (const mode of ["cancel", "expire"]) {
          const orderId = await order("pending_payment");
          await db.execute(
            sql`insert into inventory_reservations(order_id,variant_id,quantity,expires_at,status) values(${orderId},${variant},1,clock_timestamp()-interval '1 minute','active')`,
          );
          if (mode === "cancel") {
            assert.equal(
              (
                await request(
                  "/v1/orders/" + orderId + "/cancel",
                  buyer,
                  "POST",
                  { reason: "Changed my mind" },
                  "cancel-once",
                )
              ).status,
              200,
            );
            assert.equal(
              (
                await request(
                  "/v1/orders/" + orderId + "/cancel",
                  buyer,
                  "POST",
                  { reason: "Changed my mind" },
                  "cancel-once",
                )
              ).status,
              200,
            );
          } else {
            assert.equal(await releaseExpiredReservations(), 1);
            assert.equal(await releaseExpiredReservations(), 0);
          }
        }
        const [stock] = await query(
          sql`select available_quantity,reserved_quantity from inventory_levels where variant_id=${variant}`,
        );
        assert.equal(stock.available_quantity, 10);
        assert.equal(stock.reserved_quantity, 0);
      },
    );
    await t.test(
      "Runner is authenticated, records readiness, and does not overlap a live lease",
      async () => {
        assert.equal(validRunnerSecret("Bearer short", "short"), false);
        assert.equal(
          (await request("/internal/operations/run", null, "POST", {})).status,
          401,
        );
        assert.equal((await request("/ready", null)).status, 503);
        const result = await request(
          "/internal/operations/run",
          null,
          "POST",
          {},
          id(),
          { Authorization: "Bearer " + config.operationsSecret },
        );
        assert.equal(result.status, 200, JSON.stringify(result.body));
        assert.equal((await request("/ready", null)).status, 200);
        await db.execute(
          sql`update operations_runtime set lease_until=clock_timestamp()+interval '1 minute' where name='nonpayment-maintenance'`,
        );
        let ran = false;
        const busy = await leasedJob("nonpayment-maintenance", async () => {
          ran = true;
        });
        assert.equal(busy.status, "busy");
        assert.equal(ran, false);
        await assert.rejects(() =>
          leasedJob("failure-test", async () => {
            throw Error("test");
          }),
        );
        assert.equal(
          (
            await query(
              sql`select last_error is not null failed from operations_runtime where name='failure-test'`,
            )
          )[0].failed,
          true,
        );
      },
    );
  });
});
