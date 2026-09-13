# Non-payment production release

Payments remain the last release phase. This deployment does not activate checkout, contact Paystack, dispatch refunds, release escrow, or send payouts. Existing payment-confirmed records can progress through fulfilment, delivery, returns and disputes. Isolated tests supply the payment-confirmed starting state; there is no public endpoint that fakes payment or inserts demonstration orders.

## Deployed surfaces

- Core API: https://sell-fast-buy-fast-core-api.vercel.app
- Admin: https://sell-fast-buy-fast-admin.vercel.app
- Vendor and hosted account recovery: https://www.sellfastbuyfast.com

The Expo source has matching account-confirmation/recovery fixes; these reach installed customer apps only through the next mobile build/update. No mobile binary was published in this release.

## Operations

Migrations 7–9 add persistent admin operations, safe read models, private evidence buckets and task leases. The linked database already had migrations 1–6. Migration preflight found no duplicate active disputes.

A single Supabase Cron task invokes the authenticated Core API maintenance endpoint every minute. Its credential lives in Supabase Vault and Vercel environment settings. PostgreSQL leases prevent overlapping maintenance runs; cancelled/expired reservations return stock once, and scheduled campaign visibility is also checked at read time. An optional dedicated worker uses the same lease. Shutdown waits for the current task before closing the pool.

The endpoint performs bounded non-payment work only. Financial workers and the explicit order-completion endpoint remain disabled through `ADMIN_FINANCE_ENABLED=false` and `PAYMENT_MODE=mock`.

- `/health` checks process liveness.
- `/ready` returns 200 only when the admin schema is readable and maintenance has succeeded within ten minutes. It returns 503 when the runner has not started, failed, or become stale.
- `/internal/operations/run` requires a constant-time checked server-only bearer secret; user tokens do not grant access.
- Admin service status includes maintenance health. Monitor this, failed/exhausted invitation outbox events, Vercel function errors and Supabase Cron/HTTP failures. A failed network invocation is retried by the next minute's schedule; expired leases recover after five minutes.

Do not run the financial workers from an external scheduler before the dedicated payments release. Maintenance does not acknowledge unrelated outbox events as delivered.

Supabase Cron/pg_net is used within the existing infrastructure; no new queue platform or paid worker host is required. Platform references: [Supabase scheduling](https://supabase.com/docs/guides/functions/schedule-functions), [Supabase Cron](https://supabase.com/docs/guides/cron), [Vercel function and cron execution](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Authentication and external services

Supabase email confirmation remains enabled and authenticator enrollment is enabled. Production redirects point to deployed HTTPS pages instead of localhost. Customer and vendor password recovery now calls Supabase and completes on `/account-access.html`. Recovery tokens are removed from the address bar, kept out of persistent browser storage, and never logged. The new password is submitted to Supabase; there is no simulated success or default account password. Signup uses confirmation links, and the optional email-code screen verifies real codes instead of accepting arbitrary digits.

The linked Supabase project did not have custom SMTP configured. Before public onboarding, supply a verified sender and SMTP credentials through the deployment environment. The API's `ADMIN_SMTP_URL` and `ADMIN_MAIL_FROM` control staff invitation delivery; Supabase Auth needs its own SMTP configuration using the selected email provider. Do not treat Supabase's default development email service as verified production delivery. No test emails were sent.

The owner's explicitly designated account has now been provisioned with security and operations administrator roles. Password sign-in and the production admin identity endpoint were verified; MFA remains required. Provisioning is recorded in the audit history. Passwords are never stored in this repository. Subsequent staff access is handled by the portal with MFA, invitation expiry and revocation protections.

Carrier delivery callbacks require HMAC-SHA256 over the raw body and a configured carrier key. The carrier must match the carrier recorded on the shipment. Delivery timestamps cannot precede dispatch or be in the future. Callbacks are replay-safe and require delivery evidence. Merchant actors cannot mark their own shipment delivered. The actual carrier partner must be selected and its callback adapter verified against that partner's payload/signature contract. No courier booking, label generation or automatic tracking ingestion from an unnamed provider is claimed.

## Non-payment lifecycle verification

The integration suite applies all migrations to isolated PostgreSQL and exercises actual HTTP routes. It covers:

- deferred checkout creates neither orders nor stock reservations;
- only the owning vendor (or appropriately authorized staff) accepts, packs and ships;
- stages cannot be skipped; repeated accepted requests do not duplicate milestones;
- unauthorized users cannot view another buyer's order;
- invalid signatures and a different shipment carrier cannot record delivery;
- repeated delivery callbacks produce one delivery notification;
- buyer return creation locks the order correctly, follows the persisted protection deadline, and rejects duplicate active returns;
- vendor approval and admin receipt create a durable refund review without moving money;
- cancellation and expiry return reserved stock exactly once;
- protected maintenance, lease exclusion, failure recording and readiness.

Return-window calculations use the deadline saved at delivery, so later configuration changes do not shorten an existing buyer's window. Evidence buckets remain private. Paid cancellation and any refund settlement stay in the dedicated payments acceptance scope.

Verified on 2026-09-06: 41 backend tests, 55 admin tests, four recovery-page tests, TypeScript build, compilation of the modified customer authentication screens, and a full Expo web export passed. The exported shopper bundle was checked for configured server credentials; none were included. Live API/portal/public-configuration/CORS checks passed, and `/ready` reported a healthy scheduled-maintenance heartbeat. No live payment transactions, test orders, emails, or arbitrary staff grants were made. The designated owner administrator was subsequently provisioned with explicit authorization.

## Repeatable commands

From the repository root:

```sh
npm ci --prefix services/core-api
npm --prefix services/core-api run build
npm --prefix services/core-api test
npm --prefix admin-portal run check
npm --prefix admin-portal test
node services/core-api/scripts/inspect-infrastructure.mjs
node services/core-api/scripts/migrate.mjs --dry-run
```

After reviewing the target and output, deploy with the existing linked Vercel projects. `configure-release.mjs` previews environment names; `--apply` writes the reviewed settings. It preserves locally generated secrets in the ignored `.env.operations.local` file. Protect/back up this file or preserve equivalent secrets in the deployment secret manager; do not rotate them on every deployment. Configure the platform with `configure-platform.mjs auth --apply` and `configure-platform.mjs scheduler --apply`. These scripts are specific to the three URLs above.

`check-release.mjs` verifies deployed routes, public configuration, auth denial, CORS and readiness. `check-scheduler.mjs` verifies the persisted scheduled task and a successful execution. Neither creates users or marketplace test data. `check-release.mjs --run-maintenance` is an explicitly authenticated operational invocation, not a read-only check.

A source CI workflow runs the backend build, isolated PostgreSQL tests and portal checks on pull requests and main/master updates. It does not deploy or apply live migrations automatically.

For an application rollback, restore the previous Vercel deployment and keep the additive migrations in place. Do not drop operational/audit tables to roll back application code. Pause the named Cron task if a runner release must be disabled, then verify lease/readiness state before resuming.
