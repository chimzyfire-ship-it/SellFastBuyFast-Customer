# Catalogue and Product Studio Backend Integration

Migration `20260903000004_catalogue_inventory_audit.sql` is applied to the linked Supabase project. It adds immutable inventory transactions, product-moderation history, and SKU uniqueness scoped to each product.

All Product Studio writes use the Core API:

- `PATCH /v1/catalog-management/products/:id` updates listing details. A published listing returns to `draft` only when title, description, or category changes. Compare-price-only edits remain published.
- `PATCH /v1/catalog-management/variants/:id` persists SKU and price changes and recalculates the product's base price.
- `PATCH /v1/catalog-management/variants/:id/inventory` changes only sellable quantity; it preserves active reservations and writes a `merchant_set` inventory transaction.
- `PATCH /v1/catalog-management/media/:id` and `POST /v1/catalog-management/products/:id/media` manage Product Studio imagery. A changed or newly added image re-opens moderation for an already published listing.

Every reservation, cancellation/expiry release, verified-payment commit, and merchant stock update writes to `inventory_transactions` in the same database transaction as the quantity change. Product submission and moderation transitions write both `audit_events` and `product_moderation_logs`, and publish durable `catalog.*` events to the outbox for the search-indexing consumer.
