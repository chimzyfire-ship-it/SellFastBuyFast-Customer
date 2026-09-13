# SellFastBuyFast Operations

Admin frontend for the existing SellFastBuyFast Core API and Supabase Auth. All marketplace reads and writes go through authenticated Core API requests. There is no demo mode, sample dataset, local business-state adapter, or direct browser database access.

The interface includes 15 role-aware workspaces, queue search/filter/sort/pagination, connected record details, review decisions, secure document access, internal notes, support replies, campaign drafts, staff invitations, session security, and current-page CSV export. See [the integration handoff](BACKEND_ENGINEER_ADMIN_HANDOFF.md) for the backend dependencies and [the read-model types](admin-contracts.d.ts).

## Local setup

```sh
cd admin-portal
cp config.example.js config.local.js
# Set the three public values in config.local.js.
npm start
```

Open `http://127.0.0.1:4174`. There is no dependency installation or build step. The Supabase browser client is vendored from the workspace's installed `@supabase/supabase-js` 2.109.0 package, with its license in `lib/`. The identity client is served locally; Google Fonts is optional and has system-font fallbacks.

A configured Supabase account alone does **not** open the workspace: `GET /v1/admin/me` must return verified staff roles. The Core API implements the `/v1/admin` router. Apply the admin database migrations and configure the API and worker before connecting the portal. See [backend delivery and rollout](../docs/operations/admin-operations-integration.md).

## Deployment

Deploy this directory as a static Vercel project with its included runtime configuration function. Set `ADMIN_API_URL`, `ADMIN_SUPABASE_URL`, and `ADMIN_SUPABASE_ANON_KEY` in that project's environment. These are public browser settings. Do not use service-role keys or payment/database credentials.

Configure the portal origin in Core API `CORS_ORIGINS` and in the Supabase Auth redirect allowlist. Supabase password recovery uses PKCE and returns to the portal's root URL. Require HTTPS outside localhost. Configure the backend to accept `Authorization`, `Content-Type`, `Idempotency-Key`, and `If-Match`; expose `X-Request-ID`. Require MFA server-side for protected staff operations.

No deployment or live business mutation is performed by the frontend development workflow.

## Verification

```sh
npm run check
npm test
```

Tests cover contracts, role boundaries, safe formatting, API headers and failures, all workspace rendering paths, decision dialogs, and retry/conflict handling. Isolated test harnesses are confined to `tests/` and are not loaded by the product. Browser rendering and authenticated end-to-end testing require an available browser and the real admin endpoints; neither is represented as passing by these tests.

Implementation verification on 2026-09-05: 55 automated checks passed, JavaScript syntax checks passed, and `git diff --check` passed. The browser runtime reported no available browser, so visual/responsive and live authenticated acceptance checks remain outstanding. The Vercel deployment excludes tests, handoff documents, and local configuration files.

Production deployment (2026-09-06): https://sell-fast-buy-fast-admin.vercel.app. The Core API and migrations are deployed and scheduled maintenance is healthy. [Current release status](../docs/operations/nonpayment-release.md) identifies the owner-admin setup status and remaining email-provider and carrier configuration.
