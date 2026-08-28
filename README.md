# SellFastBuyFast

A curated, multi-vendor commerce platform built with Expo React Native, Next.js, and a modular PostgreSQL + Paystack backend.

## Official Repository Ecosystem

| Surface | Repository | Stack | Description |
| :--- | :--- | :--- | :--- |
| **Customer App** | [SellFastBuyFast-Customer](https://github.com/chimzyfire-ship-it/SellFastBuyFast-Customer) | Expo / React Native | Shopper discovery, bag, multi-step checkout & tracking. |
| **Admin Portal** | [SellFastBuyFast-Admin](https://github.com/chimzyfire-ship-it/SellFastBuyFast-Admin) | Next.js / Tailwind | Ops command center, merchant KYC review, disputes. |
| **Vendor Portal** | [SellFastBuyFast-Vendor](https://github.com/chimzyfire-ship-it/SellFastBuyFast-Vendor) | Next.js / Tailwind | Merchant store manager, inventory, and order fulfillment. |

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
# Install dependencies
npm install

# Start the Expo Shopper app
npx expo start
```
