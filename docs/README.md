# SellFastBuyFast Build Documentation

This folder is the implementation source of truth for the SellFastBuyFast target architecture. It supersedes earlier enterprise-style specifications and intentionally chooses a Nigeria-first, single-provider MVP, adding complexity only after operational and financial controls are proven.

**Document status:** Draft target architecture, version 0.9, issued 22 August 2026. Open commercial, legal, finance, privacy, and operational decisions remain launch blockers until approved by their accountable owners.

## Read in this order

1. [Product scope](product/v1-scope.md) - what v1 does, does not do, and the business decisions required before build.
2. [System architecture](architecture/system-architecture.md) - applications, services, boundaries, deployment, and scale path.
3. [Financial domain](architecture/financial-domain.md) - payment, release, refunds, payout, and reconciliation rules.
4. [Data model and authorization](architecture/data-model-and-authorization.md) - required tables, ownership, state machines, and RLS strategy.
5. [Operations and security](operations/security-and-operations.md) - security controls, runbooks, compliance work, and observability.
6. [Backend, Database & Infra Strategy](architecture/backend-database-and-infrastructure-strategy.md) - database rationale, $0 cost modeling, Railway/Supabase topology, and Ethnikraft adaptation.
7. [Delivery roadmap](roadmap/delivery-roadmap.md) - implementation phases and exit criteria.

## Architecture decision in one sentence

Build a TypeScript modular monolith in a `pnpm`/Turborepo monorepo: Expo React Native for shoppers, Next.js for merchant and operations web apps, a NestJS API for every privileged business action, and Supabase for PostgreSQL, Auth, Storage, and Realtime.

This is deliberately not microservices. It gives the team one transactional source of truth and a clean way to extract payment, search, or notification workers later if traffic or team size makes that worthwhile.

## Non-negotiable guardrails

- No client can write orders, payment state, ledger entries, payouts, roles, verification results, or disputes directly.
- No automatic merchant settlement until the payment provider contract, settlement timing, and legal treatment of held funds have been approved in writing.
- Every money movement has an immutable ledger entry, provider reference, idempotency key, actor, and audit record.
- A cart is restricted to one merchant in v1. Multi-merchant checkout is a later, explicitly funded project.
- Cash wallet, cash-on-delivery, multi-currency checkout, and a second payment gateway are out of scope for v1.
- No document, interface, or sales material may promise guaranteed availability, fraud prevention, payment or payout timing, delivery timing, refund outcomes, regulatory approval, or app-store acceptance.
- Terms such as `escrow`, `insured`, `verified`, and `guaranteed` require written legal/compliance approval and supporting operational evidence before publication.
