# Delivery Roadmap

## Phase 0 - Decisions and foundation

**Goal:** remove business and financial ambiguity before feature build.

- Approve v1 scope, merchant agreement, delivery coverage, returns, commission, and payout rules.
- Confirm payment-provider settlement architecture and create sandbox accounts.
- Create monorepo, environments, CI, migration workflow, secrets management, design tokens, and observability baseline.
- Produce reviewed schema/migrations and API contract from the architecture documents.
- Approve return/refund exceptions, negative-balance and chargeback recovery, failed/reversed payout accounting, tax/invoicing, retention/deletion, bank-change controls, and incident ownership.

**Exit:** versioned finance/legal/operations decisions with named approvers, threat model, data-retention schedule, schema review, and a working authenticated vertical slice in staging.

## Phase 1 - Catalogue and merchant onboarding

**Goal:** safely create a sellable curated catalogue.

- Auth, profile, addresses, role/permission model, merchant onboarding, document upload/scanning, operations review queue.
- Product/variant/media/inventory management and catalogue moderation.
- Buyer home, search, filters, product detail, store page, saved items, and empty/error/accessibility states.

**Exit:** approved merchant can publish a moderated product; unauthorized reads/writes are proven blocked by automated tests.

## Phase 2 - Single-merchant commerce

**Goal:** a buyer can complete a paid order safely.

- Cart, stock reservation, delivery quote, order-lines, payment attempts, Paystack adapter, provider events, notifications, and order history.
- Merchant accept/pack/ship flow and logistics tracking adapter with manual fallback.
- Payment reconciliation dashboard and operational exception queue.

**Exit:** successful, failed, expired, duplicate-webhook, and stock-race checkout scenarios pass end-to-end in staging.

## Phase 3 - Returns, finance, and payouts

**Goal:** controlled release of merchant funds and supportable buyer protection.

- Returns/disputes, delivery evidence, refund flow, internal ledger, release-eligibility scheduler, payout request/review/transfer lifecycle, audit trail, daily reconciliation.
- Finance role separation and MFA-enhanced approvals.

**Exit:** finance can reproduce balances from journal entries; payout/refund/reversal scenarios reconcile with provider sandbox records.

## Phase 4 - Production hardening and pilot

**Goal:** limited, observable real-world launch.

- Penetration/security review, backup-restore exercise, monitoring alerts, support runbooks, app-store privacy material, merchant/support training, and pilot cohort.
- Launch to selected merchants/categories/cities with manual operations oversight.

**Exit:** pilot targets are met and reconciliation/support operations are stable for an agreed period.

## Phase 5 - Deliberate expansion

Prioritize based on observed bottlenecks: multi-merchant cart, second provider, richer rewards, promotions, more carriers, advanced search, additional cities, and internationalization. Each expansion requires a design decision, financial impact review, and measurable acceptance criteria.
