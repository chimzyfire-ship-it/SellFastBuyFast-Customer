---
name: backend-architect
description: Architectural and implementation guardrails for SellFastBuyFast backend, PostgreSQL data models, Paystack payments, and double-entry ledger bookkeeping.
---

# Backend Architect Skill

## System Principles

1. **Centralized Business Logic**: Client applications (Expo mobile app, Next.js vendor portal, Next.js admin portal) NEVER mutate financial, order, inventory, or payout tables directly. All writes are executed through the Core API (`/v1/...`).
2. **Double-Entry Financial Invariant**: Every monetary event (payment, commission deduction, merchant balance hold, payout settlement, refund) must create balanced `journal_entries` and `journal_lines` where `SUM(debits) == SUM(credits)`.
3. **Integer Minor Units for Currency**: Never use floating point numbers for money. Store all amounts as `bigint` minor units (e.g. Kobo for NGN: ₦1,500.00 = `150000`).
4. **Transactional Stock Reservation**: Stock is reserved inside a database transaction during checkout with a time-bounded expiration. Stock is committed upon verified payment or released upon cancellation/expiration.
5. **Paystack Security**: All webhook events must verify the HMAC-SHA512 signature (`x-paystack-signature`) against `PAYSTACK_SECRET_KEY` before processing. Webhook processing must be idempotent using `provider_events`.

## Architecture Layers

```
Client (Expo / Next.js)
        │ (HTTPS / Bearer JWT)
        ▼
Core REST API (Node / Express / Fastify)
   ├── Middleware: Supabase JWT Auth & RBAC
   ├── Input Validation: Zod Schemas
   ├── Domain Services: Orders, Catalog, Ledger, Payments
   └── Database Layer: Drizzle ORM / Postgres Pooler
        │
        ▼
Supabase Platform (PostgreSQL 17 + Auth + S3 Storage)
```

## API Conventions

- **Prefix**: All endpoints are prefixed with `/v1/`.
- **Response Format**:
  - Success: `{ "success": true, "data": { ... } }`
  - Error: `{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable message" } }`
- **Idempotency**: Critical write endpoints accept an `Idempotency-Key` header.
- **Error Codes**: Use stable string codes (e.g. `INSUFFICIENT_STOCK`, `UNAUTHORIZED`, `PAYMENT_FAILED`, `LEDGER_UNBALANCED`).

## Database Connection Best Practices

- Use Supabase connection pooling (port 6543 / Supavisor) for API server requests.
- Use direct connection (port 5432) for schema migrations only.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` to frontend client bundles.
