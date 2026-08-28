# System Architecture

## Chosen architecture: modular monolith with asynchronous workers

SellFastBuyFast should start as one domain-focused backend, not a collection of microservices. Payments, orders, inventory, disputes, and payouts are strongly connected transactional concerns. Keeping them together reduces distributed transaction risk and simplifies auditability.

The backend is modular internally and communicates with external systems through adapters. Modules can be extracted only when a real scaling, ownership, or reliability need is measured.

```text
Expo Shopper App        Next.js Merchant Portal        Next.js Operations Portal
        \                         |                           /
         \---------------- HTTPS / API ----------------------/
                              |
                    NestJS Core API (TypeScript)
  AuthZ | Catalogue | Cart/Order | Payment | Ledger | Payout | Dispute | Admin
                              |
          +-----------+-----------+------------+-------------+
          |           |           |            |             |
     Supabase     Worker Queue  Object      Paystack       Logistics
 PostgreSQL/Auth  + scheduler   Storage     adapter        adapter
     /Realtime
```

## Repository structure

```text
apps/
  shopper-mobile/       Expo Router + React Native
  merchant-web/         Next.js merchant portal
  operations-web/       Next.js back-office portal
services/
  core-api/             NestJS HTTP API and domain modules
  worker/               queue consumers and scheduled jobs
packages/
  domain/               shared types, validation schemas, state machines
  ui/                   tokens and reusable UI primitives
  api-client/           generated, authenticated API client
  config/               lint, TypeScript, test configuration
infra/                  migrations, deployment, environment templates
docs/
```

Use `pnpm` workspaces and Turborepo. Share domain types and validation, never database credentials or privileged functions, with mobile/web applications.

## Platform choices

| Layer | Choice | Reason |
| --- | --- | --- |
| Mobile | Expo + React Native + Expo Router | Native app experience with a maintainable TypeScript codebase and EAS delivery. |
| Web | Next.js | Mature admin/merchant forms, tables, server rendering, and role-based web UX. |
| API | NestJS on container hosting | Clear module boundaries, request validation, background jobs, and long-lived operational control. |
| Database | Supabase PostgreSQL | Relational integrity, managed backups, Auth, Storage, migrations, and controlled Realtime. |
| Queue | Postgres-backed queue initially | Durable jobs with one operational datastore; move to managed Redis/SQS only when required. |
| Storage | Supabase Storage with private buckets | Signed upload/download URLs, malware scan pipeline, and document segregation. |
| Observability | Sentry + OpenTelemetry-compatible logs/metrics | Trace a buyer request through API, worker, provider, and database. |

Deploy API and workers as separate containers with at least two API replicas in production. Configure health checks, rolling releases, autoscaling by CPU/request load, and a separate worker concurrency policy for finance tasks.

## Trust boundaries

### Client applications

Clients use Supabase Auth for session identity and call the Core API for business commands. They may read only deliberately public or owner-scoped data. They never receive provider secret keys, service-role keys, payout controls, or direct write access to financial tables.

### Core API

The API verifies the Supabase JWT, maps identity to a server-controlled role/permission set, validates input, performs database transactions, writes audit records, and emits outbox events. It is the only actor permitted to issue provider API calls or create ledger/payout/dispute state changes.

### Workers

Workers consume durable jobs for provider calls, emails/push notifications, image scanning, search indexing, scheduled release eligibility checks, and reconciliation. A worker re-checks the current database state inside a transaction before acting; jobs are retryable and idempotent.

## API conventions

- Version all endpoints: `/v1/...`.
- Commands use server-generated IDs, input validation, actor context, and an `Idempotency-Key` for all write operations.
- Use cursor pagination, not offset pagination, for lists that can grow.
- Return stable error codes (`PAYMENT_PENDING`, `STOCK_UNAVAILABLE`, `PAYOUT_NOT_ELIGIBLE`) separate from display copy.
- Public product search is a read model; financial/order data is never public.
- Persist provider events before processing them, acknowledge webhooks quickly, and process them asynchronously.

## Scale path

1. Scale API replicas and worker concurrency independently.
2. Add read replicas/search indexing when catalogue reads affect transactional latency.
3. Extract search/feed and notifications first if needed; retain orders, ledger, payments, and payout logic in one financial core.
4. Partition historical audit/events only after retention and query patterns are understood.

Microservices are not a v1 milestone.
