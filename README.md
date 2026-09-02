# SellFastBuyFast

A curated Nigerian marketplace with an Expo shopper app, an Express Core API, and Supabase PostgreSQL/Auth. Live payments are intentionally deferred behind an explicit configuration boundary until the dedicated payment module is implemented and sandbox-tested.

## Official Repository Ecosystem

| Surface | Repository | Stack | Description |
| :--- | :--- | :--- | :--- |
| **Customer App** | [SellFastBuyFast-Customer](https://github.com/chimzyfire-ship-it/SellFastBuyFast-Customer) | Expo / React Native | Shopper discovery, bag, multi-step checkout & tracking. |
| **Admin Portal** | [SellFastBuyFast-Admin](https://github.com/chimzyfire-ship-it/SellFastBuyFast-Admin) | Portal prototype | Ops workflow prototype; production role-aware portal remains a separate delivery item. |
| **Vendor Portal** | [SellFastBuyFast-Vendor](https://github.com/chimzyfire-ship-it/SellFastBuyFast-Vendor) | Static web app | Authenticated merchant catalogue, fulfilment, returns, profile, and verification workspace. |

---

## Architectural Documentation

Full system specifications, domain models, and financial integrity rules are maintained in [`docs/`](docs/):

- [Architecture Index & Overview](docs/README.md)
- [Backend, Database & Infra Strategy](docs/architecture/backend-database-and-infrastructure-strategy.md)
- [System Architecture & Boundaries](docs/architecture/system-architecture.md)
- [Data Model & Authorization](docs/architecture/data-model-and-authorization.md)
- [Financial Domain & Ledger Rules](docs/architecture/financial-domain.md)
- [Product Scope (v1)](docs/product/v1-scope.md)
- [Screen Routing & State Inventory](docs/product/screen-routing.md)
- [Delivery Roadmap](docs/roadmap/delivery-roadmap.md)

---

## Development Setup

```bash
# Shopper app
npm install
npx expo start

# Core API
cd services/core-api
npm install
npm run dev

# In a second terminal, run background jobs
npm run dev:worker
```

Copy `.env.example` into your local environment and set the Supabase, database, API URL, and CORS values. Keep `PAYMENT_MODE=mock` and `EXPO_PUBLIC_PAYMENT_MODE=mock` until the separate payment integration phase. Apply the migrations in `supabase/migrations/` to the intended Supabase project before starting the API. On a physical device, `EXPO_PUBLIC_API_URL` must use your computer's reachable LAN address rather than `localhost`.

In mock payment mode, checkout is deliberately unavailable and the Core API rejects it before creating an order or reserving inventory. Existing Paystack integration code is dormant and can only be activated with an explicit `paystack` mode during the dedicated payment work.

The shopper app now uses authenticated Core API flows for support-ticket threads, return requests, disputes, notifications, order history, and shipment details. The Core API exposes server-controlled merchant product creation, inventory updates, submission, staff moderation, fulfilment, return decisions, and vendor workspace reads. Mock catalogue fallback remains disabled by default; set `EXPO_PUBLIC_ENABLE_MOCKS=true` only for a UI-only catalogue demo.

## Vendor portal

The vendor portal in `vendor-portal/` authenticates with Supabase in the browser and sends every business read or mutation through the Core API. It does not query Supabase tables directly.

```bash
cp vendor-portal/config.example.js vendor-portal/config.js
cd vendor-portal
python3 -m http.server 4173
```

Set the public Supabase URL, public anon key, and Core API URL in the ignored `vendor-portal/config.js`. Do not put a database URL, service-role key, Paystack key, or any other server secret in that file. The portal provides real catalogue/stock, product-submission, fulfilment, return-decision, business-profile, verification, and team-roster screens. Payouts, settlement balances, bank setup, refunds, and provider actions are visibly deferred until the dedicated payment module is built.
