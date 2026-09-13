# Admin backend delivery

Deployment update (2026-09-06): migrations 7–9 and the API/portals are now deployed. Supabase runs non-payment maintenance every minute, with a verified successful heartbeat. See [the non-payment release](nonpayment-release.md) for the current production status; the implementation-time limits below describe the earlier local-only handoff.

The admin portal now connects to persistent Core API operations. Customer orders and vendor fulfilment continue through their normal API workflows; staff intervene for approvals, moderation, exceptions, support, and access control. Routine purchases do not require manual admin approval.

## Implemented

- `/v1/admin/me` verifies current server-owned staff roles. Protected operations enforce MFA (always required in production), with session cutoffs after role changes or revocation.
- All 13 record queues have scoped, paginated read models and connected details; overview and service configuration complete the 15 workspaces. Money in admin responses uses decimal strings. Private identity values and bank account numbers are excluded.
- Merchant registration, listing moderation, customer restrictions, delivery escalation, returns, disputes, support replies, internal notes, assignments, and staff access use real persisted records. Existing domain endpoints remain the source of lifecycle mutations.
- Admin commands require a reason where applicable, `If-Match` record revision, and `Idempotency-Key`. Record locks, audit entries, notifications and request receipts commit together. Failed commands roll back; identical successful retries return the original result, while changed input with the same key returns a conflict.
- Audit and internal notes are append-only. Document access checks the relationship and staff permission; private storage links expire after 120 seconds. Existing external evidence links are identified as external and do not claim an expiry.
- Campaign drafts, schedules, publication and archiving persist in PostgreSQL. Public `/v1/catalog/content` independently checks timing and target eligibility on every read. The customer home and category screens consume all three placements, with real product, merchant and category destinations.
- Customer privacy requests persist through `/v1/customer-care/account/deletion-request`. Restrictions and deletion requests block new checkout. Privacy review records a review; it does not erase regulated transaction history or delete the identity automatically.
- Security administrators can invite internal staff through the email outbox. A verified email recipient receives roles only after delivery, before expiry, and while the inviter retains security authority. MFA still gates operations. Role editing prevents self-change and removal of the last security administrator.
- Scheduled workers publish/expire campaigns, deliver invitations with retry, and identify provider events without a matching balanced journal. Rechecks verify provider outcomes without posting money or pretending a mismatch is resolved.

## Explicit financial boundary

The original handoff defers the dedicated payment-provider release. `ADMIN_FINANCE_ENABLED` defaults to false. Existing payout review/dispatch and finance rechecks require both this flag and configured Paystack mode. Do not enable these solely to make buttons appear.

A buyer-favouring dispute decision or received return creates a durable refund review and preserves the escrow hold. Provider refund dispatch remains unavailable (`REFUND_PROCESSING_DEFERRED`); no fake refund or ledger settlement is created. Complete provider refund integration and provider sandbox acceptance before enabling that capability. A merchant-favouring dispute decision restores the prior eligible order state without bypassing the normal escrow release conditions.

## Database rollout

Apply the existing migrations followed by:

1. `20260905000007_admin_operations.sql`: operational tables, revision triggers, indexes, private grants, immutable audit, idempotency fingerprints, and linked disputes.
2. `20260905000008_admin_read_models.sql`: explicit safe read models through a service-role-only security-invoker view.

Use the repository's SQL migration workflow, not Drizzle schema push. SQL owns checks, triggers, partial indexes, grants and views. Drizzle contains the corresponding table/column definitions.

Before applying migration 7 to an existing database, inspect duplicate active disputes:

```sql
SELECT order_id, count(*) FROM disputes
WHERE status IN ('open', 'under_review')
GROUP BY order_id HAVING count(*) > 1;
```

Resolve any duplicates through an audited operational decision; the unique index intentionally rejects ambiguous active cases. Do not delete records to force the migration through.

Deploy migrations before the new API and worker: authentication now reads the staff-access table. Run the API and persistent worker from the same release. Vercel API requests alone do not run scheduled worker loops. Back up the database and use staging acceptance before production rollout.

## Configuration

Core API and worker, server-only:

| Setting | Purpose |
| --- | --- |
| `ADMIN_CURSOR_SECRET` | Random secret of at least 32 characters; required in production. Rotation invalidates existing pagination cursors. |
| `ADMIN_REQUIRE_MFA` | Defaults true; cannot be disabled in production. |
| `ADMIN_FINANCE_ENABLED` | Defaults false; requires the dedicated finance acceptance process. |
| `ADMIN_PORTAL_URL` | HTTPS portal root used for staff acceptance links. |
| `ADMIN_SMTP_URL` | SMTP/SMTPS credentials for a TLS-capable mail service. |
| `ADMIN_MAIL_FROM` | Verified sender address accepted by that service. |

Existing database, Supabase service credentials, KYC encryption and CORS settings remain required. Include the portal origin in `CORS_ORIGINS` and the Supabase redirect allowlist. Never send the settings above, service-role keys, database credentials or provider secrets to the browser. The portal uses only its three public `ADMIN_API_URL`, `ADMIN_SUPABASE_URL`, and `ADMIN_SUPABASE_ANON_KEY` values.

Provision the first security administrator through the trusted deployment/database process against a verified real profile; public signup never grants staff roles. Subsequent access is managed in the portal. Configure Supabase authenticator enrollment and test recovery on staging.

Invitation email is asynchronous. Failed deliveries retry with backoff, up to ten attempts; monitor failed `outbox_events` and alert on exhausted attempts. After fixing delivery configuration, an operator may requeue the specific failed event using the trusted operational process. Never place link tokens or SMTP credentials in logs. Existing signed-in users with an eligible delivered invitation can redeem it through `/me`; the email link provides explicit acceptance for new sessions.

## Verification and limits

Executed locally: 34 backend tests, 55 admin frontend tests, TypeScript build, admin JavaScript syntax checks, and Babel compilation of the changed customer screens/services. The admin suite applies all repository migrations to isolated PGlite PostgreSQL and exercises real SQL and HTTP routing. Only identity verification in the HTTP test is substituted; test fixtures never populate the live database or ship in the product.

Coverage includes current-role/MFA checks, private-data exclusion, exact money, atomic retry/rollback, stale revisions, internal-note separation, dispute holds, campaign eligibility/expiry, invitation admission, access revocation, immutable audit, cursor binding, and existing support endpoint integration.

These checks do not establish production load capacity, multi-process PostgreSQL contention behavior, visual/device acceptance, or live Supabase/SMTP/Paystack acceptance. No live migrations, deployment, staff emails, or provider transactions were performed during implementation. Run authenticated staging acceptance across the staff roles, private evidence links, invitation delivery/MFA, and customer/vendor flows before launch.
