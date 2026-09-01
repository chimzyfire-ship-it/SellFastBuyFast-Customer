# SellFastBuyFast

A curated Nigerian marketplace with an Expo shopper app, an Express Core API, Supabase PostgreSQL/Auth, and Paystack-hosted payments.

## Official Repository Ecosystem

| Surface | Repository | Stack | Description |
| :--- | :--- | :--- | :--- |
| **Customer App** | [SellFastBuyFast-Customer](https://github.com/chimzyfire-ship-it/SellFastBuyFast-Customer) | Expo / React Native | Shopper discovery, bag, multi-step checkout & tracking. |
| **Admin Portal** | [SellFastBuyFast-Admin](https://github.com/chimzyfire-ship-it/SellFastBuyFast-Admin) | Portal prototype | Ops workflow prototype; production role-aware portal remains a separate delivery item. |
| **Vendor Portal** | [SellFastBuyFast-Vendor](https://github.com/chimzyfire-ship-it/SellFastBuyFast-Vendor) | Portal prototype | Merchant workflow prototype; production role-aware portal remains a separate delivery item. |

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

Copy `.env.example` into your local environment and set real Supabase, database, Paystack, API URL, and CORS values. Apply the migrations in `supabase/migrations/` to the target Supabase project before starting the API. On a physical device, `EXPO_PUBLIC_API_URL` must use your computer's reachable LAN address rather than `localhost`.

The shopper app uses Paystack-hosted checkout, verifies payment through the Core API, and intentionally has mock catalogue fallback disabled by default. Set `EXPO_PUBLIC_ENABLE_MOCKS=true` only for a UI-only demo.
