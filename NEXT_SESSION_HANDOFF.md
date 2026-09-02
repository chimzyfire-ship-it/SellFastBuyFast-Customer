# Next Session Handoff

Created: 2026-09-01

## Continuation Update

Work resumed from this handoff on 2026-09-01. The user explicitly decided that all real payment/provider behavior must remain mock/deferred and be completed later as a dedicated module.

New implementation since the original stop point:

- `PAYMENT_MODE=mock` and `EXPO_PUBLIC_PAYMENT_MODE=mock` are the documented defaults.
- Paystack is considered configured only when server payment mode is explicitly `paystack` and a secret key exists.
- In mock mode, Core API checkout fails before order creation, payment-attempt creation, or inventory reservation.
- The shopper payment modal explains the deferred boundary and cannot contact Paystack in mock mode.
- Added authenticated `/v1/customer-care` routes for ticket threads, returns, and disputes.
- Added authenticated `/v1/notifications` routes for listing and read state.
- Added persisted `support_ticket_messages`, ticket categories, query indexes, and one-open-return-per-order protection to the unapplied hardening migration.
- Shopper support, return, refund-status, notification, and shipment screens no longer fabricate agent replies, courier milestones, payment references, or completed refunds.
- Order detail API now returns shipment and shipment-event data.
- Added `/v1/catalog-management` merchant product creation, inventory, submission, audit, and staff moderation routes.
- Replaced the vendor prototype with an authenticated API-backed portal for catalogue/stock, product submission, fulfilment, returns, merchant profile, verification, and team roster. The browser uses Supabase only for authentication; all business data uses Core API routes.
- Added `/v1/vendor` workspace, profile, verification, returns, and team read routes. Merchant owner authorization is scoped to the specific merchant, not a global role.
- Core API build/type-check passes, 14 focused tests pass, Expo Doctor passes 18/18, Expo web export passes, and `git diff --check` passes.

Remote migrations and deployments are still intentionally untouched.

## Original Stop Point

The user explicitly asked to stop all work at this point and continue in a later session. Do not resume repository investigation, apply a migration, deploy anything, change Paystack settings, or run additional installs until the next session intentionally resumes work.

This document records the exact known state at the stop point. The only action taken after the stop request was creating this file.

## User Goal And Constraints

The project is being turned into a production-oriented Nigerian marketplace, SellFastBuyFast. The desired critical path is:

1. Expo shopper app authenticates with Supabase.
2. Shopper reads catalogue through the Core API.
3. Checkout reserves stock transactionally.
4. Shopper completes Paystack-hosted payment.
5. Core API independently verifies the payment and handles signed webhooks idempotently.
6. Orders progress through fulfilment and merchant payouts with balanced ledger entries.

Important user preferences:

- Finish useful work without over-engineering.
- Avoid unnecessary package installs and long waits.
- Do not force-upgrade Expo merely to silence an audit.
- Do not undo or discard existing uncommitted work.
- Do not expose or commit credentials.
- Keep all live payment, Paystack, payout-transfer, and refund-provider work deferred as one dedicated future module.

## Environment Observed

- Workspace: `/Users/apple/Projects/Shoplancia`
- Platform: macOS `12.7.6` Monterey on a 2015 MacBook Pro.
- Node: `v20.19.6`.
- `xcodebuild -version` produced no installed Xcode version during the last check. This affects local iOS native builds, not JavaScript, web, Android, or EAS cloud builds.
- Supabase CLI was previously checked and reported `2.116.0`.
- The inspected `supabase/` directory contains only `.temp/` and `migrations/`; no `supabase/config.toml` was observed.
- The current root Expo app is the canonical shopper app. `apps/shopper-mobile/` is a stale duplicate and has not been removed.

## What Has Been Implemented Locally

### Core API

The API is Express and TypeScript under `services/core-api/`, not NestJS. It owns all writes to orders, financial data, inventory, and payouts.

Implemented API/security behavior:

- Central configuration and runtime validation in `services/core-api/src/lib/config.ts`.
- Structured API errors in `services/core-api/src/lib/errors.ts`.
- Paystack HTTP client and signature helper in `services/core-api/src/lib/paystack.ts`.
- Supabase JWT authentication plus role and merchant-membership checks in `services/core-api/src/middleware/auth.ts`.
- In-memory request-rate limiting in `services/core-api/src/middleware/rateLimit.ts`.
- Database-persisted idempotency middleware in `services/core-api/src/middleware/idempotency.ts`.
- Raw request body capture for the exact Paystack webhook path before JSON parsing in `services/core-api/src/app.ts`.
- API server startup in `services/core-api/src/server.ts` and separate background-worker startup in `services/core-api/src/worker.ts`.

Implemented API route groups:

- `/health`
- `/v1/catalog`
- `/v1/orders`
- `/v1/payments`
- `/v1/fulfilment`
- `/v1/payouts`

### Checkout, Inventory, And Orders

Implemented under `services/core-api/src/modules/orders/`:

- Checkout runs in a database transaction.
- Product variants and inventory rows are locked before stock changes.
- Reservation decrements available stock and increments reserved stock.
- Reservation expiry can release stock through the worker.
- Order transitions are constrained by `orderStateMachine.ts`.
- Checkout creates a payment reference and tries to initialize a hosted Paystack transaction.
- Order listing, details, and cancellation are exposed through the Core API.
- Critical writes use idempotency keys.

### Payments

Implemented under `services/core-api/src/modules/payments/`:

- Hosted Paystack transaction initialization.
- Server-side verification by payment reference.
- HMAC-SHA512 verification of `x-paystack-signature` for Paystack webhooks.
- Provider event persistence/idempotency through `provider_events`.
- Reprocessing of transient webhook failures instead of permanently marking them processed.
- Server-side amount and currency validation before an order is marked paid.
- Payment success records ledger entries and transitions stock/order state atomically.

Important deferred payment behavior:

- Existing Paystack/payment code is dormant under mock mode. A paid cancellation or late payment can create a `refund.requested` outbox event only after real payments are deliberately re-enabled later; no Paystack refund processor/API route has been implemented. Do not present refunds as operational.

### Ledger, Fulfilment, And Payouts

Implemented:

- Double-entry transaction helper and account setup in `services/core-api/src/modules/ledger/ledger.service.ts`.
- Merchant available, pending, hold, and payout-related account handling.
- Fulfilment operations in `services/core-api/src/modules/fulfilment/` for accept, pack, ship, deliver, and complete.
- Payout request, approval, rejection, dispatch, and reconciliation in `services/core-api/src/modules/payouts/`.
- Outbox and scheduled worker routines in `services/core-api/src/workers/workers.ts` for reservation expiry, payout dispatch, and payout reconciliation.

Important payout prerequisite:

- Payout dispatch requires an already verified `merchant_bank_accounts` record with a valid `paystack_recipient_code`. Recipient creation/verification UI and API routes are not implemented.

### Database And Migration

Baseline migration:

- `supabase/migrations/20260829000001_initial_schema.sql`

New migration, written but NOT applied to any remote database:

- `supabase/migrations/20260830000002_marketplace_v1_hardening.sql`

The hardening migration adds or changes:

- Delivery zones, shipments, return requests, refunds, disputes, support tickets, notifications, outbox events, provider events, and idempotency records.
- New status types and status values needed by the backend.
- Inventory reservation and foreign-key hardening.
- Payout provider-reference fields and payout status support.
- RLS on internal tables intended for Core API/database access rather than direct client mutation.
- RLS policies and indexing needed by the new API behavior.

The Drizzle representation is in `services/core-api/src/db/schema.ts`. Do not assume the migration has been applied just because local TypeScript builds pass.

### Expo Shopper App

Implemented in the root Expo project:

- `src/lib/supabase.js` requires public Supabase environment variables instead of hardcoded configuration.
- `src/context/AppContext.js` uses the real Supabase session rather than a fabricated signed-in user.
- `src/services/apiClient.js` provides authenticated Core API access.
- `src/services/catalogService.js` reads catalogue through the Core API.
- `src/services/checkoutService.js` starts real checkout.
- `src/services/orderService.js` reads server orders and cancels through the API.
- `src/screens/checkout/PaystackPaymentScreen.js` opens hosted Paystack checkout using `expo-web-browser`.
- `src/screens/checkout/CheckoutProcessingScreen.js` polls server verification and only clears the cart after server-confirmed payment state.
- `src/screens/orders/CancelOrderScreen.js` uses the server cancellation flow.
- `app.json` defines the `sellfastbuyfast` scheme used for the payment callback.

Payment callback details:

- The current callback scheme is `sellfastbuyfast://payment/callback`.
- The API/client configuration uses `PAYSTACK_CALLBACK_URL` and the Expo scheme.
- Paystack must be configured and tested in a sandbox before relying on this callback in production.

Mock behavior:

- `.env.example` sets `EXPO_PUBLIC_ENABLE_MOCKS=false`.
- A local ignored `.env.local` was created with real public configuration and mocks disabled.
- Mock products intentionally cannot complete a real checkout because they have no real merchant/product/variant IDs.

### Documentation And Product Copy

- `README.md` now describes the Express Core API, Supabase, and hosted Paystack flow.
- `overall progress.md` was updated with implementation status.
- Unsupported user-facing claims about escrow/guarantees were removed from edited shopper and vendor copy.
- `vendor-portal/` is now an authenticated Core-API portal. It requires a local ignored `config.js` copied from `config.example.js`; it has no hardcoded Supabase configuration or direct table access.

## Work Not Yet Implemented

These are real gaps, not merely optional polish:

1. No remote migration has been applied or validated.
2. No deployed API or separately running production worker exists from this session.
3. No real Supabase/Paystack end-to-end test has been performed.
4. `admin-portal/` is still a static direct-Supabase prototype. The vendor portal is now API-backed; it still needs a real Supabase/API environment and remote migration before it can be exercised end-to-end.
5. `apps/shopper-mobile/` remains a stale duplicate Expo app.
6. Return, dispute, support-ticket, and notification customer flows now have authenticated Core API routes. Staff-side case resolution, return logistics, and the dedicated payment/refund module remain incomplete.
7. Refund outbox delivery to Paystack is not implemented.
8. Merchant bank recipient creation/verification is not implemented.
9. The vendor portal consumes merchant catalogue-management and fulfilment routes. The admin portal still does not consume the moderation routes.
10. Worker behavior has not been exercised against a real database or Paystack sandbox.
11. There are only focused unit tests; there are no database integration, migration, webhook, or device checkout E2E tests.

## Validation Already Run

The following completed successfully earlier in this session:

```sh
npm --prefix services/core-api run build
npm --prefix services/core-api run lint
npm --prefix services/core-api test
npm --prefix services/core-api audit --omit=dev --audit-level=high
npx expo-doctor
npx expo export --platform web
git diff --check
```

Results:

- Core API build passed.
- Core API `lint` passed. It currently runs `tsc --noEmit`; it is not an ESLint run.
- Core API unit tests originally passed: 7 tests. The continuation now passes 10 focused tests.
- Core API production dependency audit reported 0 vulnerabilities.
- Expo Doctor passed 18/18 checks.
- Expo web export passed.
- `git diff --check` passed.

Not validated:

- Migration syntax against the actual target database.
- Remote RLS behavior.
- Direct database connectivity.
- Any Paystack API call, callback, webhook, transfer, or refund.
- A physical-device deep-link callback.
- Any deployment platform configuration.

## Expo 54 / Expo 57 Decision

- `expo-haptics` was a separate SDK 54 compatibility issue and was corrected to the SDK 54-compatible version. It is not the reason to move to Expo 57.
- Root `npm audit --omit=dev --audit-level=high` previously reported upstream Metro/Expo toolchain advisories. Its automated resolution proposed a forced move to `expo@57.0.18`.
- Do not run `npm audit fix --force` solely to remove those advisories.
- Stay on Expo 54 unless a deliberate, separately tested SDK upgrade is approved. Expo Doctor is currently healthy.
- This Mac can run the JavaScript toolchain, web, Android, and EAS cloud builds for Expo 57. The concern is local iOS native build tooling: Monterey cannot use current Xcode releases, and no Xcode toolchain was detected in the last check.

## Configuration Required For Deployment

Use `.env.example` as the non-secret source of required variable names. Do not place actual secrets in Git, this handoff, logs, screenshots, or client-side `EXPO_PUBLIC_*` variables.

Server-side required/expected values include:

```text
DATABASE_URL
DATABASE_DIRECT_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
PAYMENT_MODE
PAYSTACK_SECRET_KEY
PAYSTACK_PUBLIC_KEY
PAYSTACK_CALLBACK_URL
PORT
NODE_ENV
CORS_ORIGINS
PLATFORM_COMMISSION_BPS
DEFAULT_DELIVERY_FEE_MINOR
RESERVATION_TTL_MINUTES
RETURN_WINDOW_DAYS
RESERVATION_SWEEP_INTERVAL_MS
OUTBOX_INTERVAL_MS
PAYOUT_RECONCILE_INTERVAL_MS
```

Client-side public values include only:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_URL
EXPO_PUBLIC_ENABLE_MOCKS
EXPO_PUBLIC_PAYMENT_MODE
```

Operational notes:

- Use the Supabase pooler connection for API traffic and direct database connection only for migration/admin work.
- Run the API and worker as separate processes/services.
- Production `CORS_ORIGINS` must contain the actual web origin(s), not permissive development defaults.
- The mobile client must use a reachable HTTPS API URL in production.
- Register the Paystack webhook as `https://<api-host>/v1/payments/webhook/paystack` after the API is deployed.
- Test the configured Paystack callback URL with a sandbox transaction before release.

## Safe Continuation Plan

### Phase 1: Re-establish State Without Modifying Anything

1. Read this file.
2. Run `git status --short` and `git diff --check`.
3. Inspect the full diff before editing or staging. Do not revert any existing change.
4. Confirm which Supabase project and deployment environment are intended. Do not infer that an available credential means permission to migrate production.
5. Confirm whether the baseline migration is already recorded remotely. Migration `20260829000001_initial_schema.sql` must not be blindly replayed against an existing database.

### Phase 2: Safely Apply Database Work

1. Back up the intended target database before schema changes.
2. Link or otherwise authenticate the Supabase CLI to the correct project without printing credentials.
3. Inspect remote migration history and the relevant existing tables/types/RLS state.
4. Review `supabase/migrations/20260830000002_marketplace_v1_hardening.sql` against that actual state before applying it.
5. Run the Supabase CLI dry-run capability if available in the installed version, then apply only missing migrations.
6. Verify post-migration tables, enums, indexes, foreign keys, RLS, and the API database role.
7. Do not mark the migration complete until a checkout transaction can create and release a reservation correctly.

### Phase 3: Seed Minimum Test Data

Create sandbox/staging data needed for a real checkout:

1. Authenticated customer user.
2. Staff/admin role as needed for fulfilment operations.
3. Merchant, active membership, and active bank account recipient code for payout testing.
4. Category, published product, default variant, and non-zero inventory.
5. Delivery zone matching the checkout address.
6. Paystack test keys and test callback/webhook configuration.

### Phase 4: Deploy And Test The Critical Path

1. Deploy the API with production server-side variables.
2. Deploy the worker separately with the same server-side database/Paystack configuration.
3. Verify `/health` from the deployed host.
4. Configure the Paystack webhook only after the deployed endpoint responds correctly.
5. Run a sandbox end-to-end test:

   1. Sign in through the Expo client.
   2. Fetch catalogue through `/v1/catalog`.
   3. Start checkout with an idempotency key.
   4. Confirm inventory moves from available to reserved.
   5. Complete hosted Paystack sandbox payment.
   6. Confirm deep-link return and server-side verification.
   7. Confirm the signed webhook is accepted exactly once.
   8. Confirm the order, payment, inventory, and balanced journal records have expected final state.
   9. Test duplicate webhook delivery.
   10. Test failed/expired checkout releases inventory.
   11. Test fulfilment and, only after bank recipient setup, payout workflow.

### Phase 5: Choose The Next Product Slice

After the core path is deployed and verified, tackle one focused slice at a time:

1. Replace the static admin portal with an authenticated application that calls only Core API endpoints for mutations.
2. Add production return/refund/dispute/support-ticket APIs and an actual refund processor.
3. Add merchant bank recipient onboarding/verification.
4. Archive or remove `apps/shopper-mobile/` after confirming the root Expo app is the only supported client.
5. Add CI and database/webhook integration tests.

## Current Git Worktree At Stop Point

All of the following were uncommitted before this handoff was created. Treat them as intentional work-in-progress. Do not reset, checkout, or discard them.

Modified files:

```text
.env.example
.gitignore
README.md
app.json
overall progress.md
package-lock.json
package.json
services/core-api/package-lock.json
services/core-api/package.json
services/core-api/src/app.ts
services/core-api/src/db/client.ts
services/core-api/src/db/schema.ts
services/core-api/src/lib/supabase.ts
services/core-api/src/middleware/auth.ts
services/core-api/src/modules/catalog/catalog.router.ts
services/core-api/src/modules/ledger/ledger.service.ts
services/core-api/src/modules/orders/orders.router.ts
services/core-api/src/modules/payments/payments.router.ts
services/core-api/src/server.ts
src/components/InvoiceViewerModal.js
src/context/AppContext.js
src/lib/supabase.js
src/screens/account/AccountScreen.js
src/screens/account/PrivacyScreen.js
src/screens/checkout/CheckoutDeliveryScreen.js
src/screens/checkout/CheckoutProcessingScreen.js
src/screens/checkout/CheckoutReviewScreen.js
src/screens/checkout/OrderConfirmationScreen.js
src/screens/checkout/PaystackPaymentScreen.js
src/screens/discovery/OnboardingScreen.js
src/screens/orders/CancelOrderScreen.js
src/screens/orders/CreateSupportTicketScreen.js
src/screens/orders/OrderDetailScreen.js
src/screens/orders/OrderTrackingScreen.js
src/services/catalogService.js
vendor-portal/index.html
```

Untracked implementation files:

```text
services/core-api/src/lib/config.ts
services/core-api/src/lib/errors.ts
services/core-api/src/lib/paystack.test.ts
services/core-api/src/lib/paystack.ts
services/core-api/src/middleware/idempotency.ts
services/core-api/src/middleware/rateLimit.ts
services/core-api/src/modules/fulfilment/
services/core-api/src/modules/ledger/ledger.test.ts
services/core-api/src/modules/orders/orderStateMachine.test.ts
services/core-api/src/modules/orders/orderStateMachine.ts
services/core-api/src/modules/payments/payments.service.ts
services/core-api/src/modules/payouts/
services/core-api/src/worker.ts
services/core-api/src/workers/
src/services/apiClient.js
src/services/checkoutService.js
src/services/orderService.js
supabase/migrations/20260830000002_marketplace_v1_hardening.sql
```

This handoff file, `NEXT_SESSION_HANDOFF.md`, is also new and untracked after creation.

Ignored local files may contain configuration but must remain untracked:

```text
.env
.env.local
supabase/.temp/
```

## Last Attempted Investigation

Immediately before the user requested the stop:

- A non-writing migration/deployment audit task was launched and then cancelled because of the stop request.
- No findings from that task should be assumed.
- No remote Supabase command, migration, deployment, webhook registration, or Paystack request was performed in that interval.

## Guardrails For The Next Agent

- Do not expose secret values, even if they are present in ignored local files.
- Do not use `npm audit fix --force` or upgrade Expo as a side effect of unrelated work.
- Do not make client-side direct writes to financial, order, inventory, or payout tables.
- Keep money as integer minor units.
- Keep Paystack verification server-side and verify webhook HMAC before processing.
- Preserve idempotency and transactional stock reservation behavior when changing checkout code.
- Do not use destructive Git commands such as `git reset --hard` or `git checkout --`.
- Before committing, inspect `git status`, the complete diff, and recent commits; stage only intended files and never secrets.
- Ask a short, explicit question if the target Supabase project, deployment provider, or production-vs-staging intent is unclear.
