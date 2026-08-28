# Data Model and Authorization

## Modeling rules

- UUID primary keys, `timestamptz`, explicit UTC handling, soft deletion where evidence must remain, and `bigint` minor-unit amounts.
- Do not store money in floating point. Store `amount_minor` and ISO `currency`.
- Snapshot sell-side product data, tax/commission rule, address, delivery quote, and policy version on order lines.
- Use database constraints and transactions for financial invariants; application validation is an additional layer.

## Required tables by domain

| Domain | Core tables |
| --- | --- |
| Identity | `profiles`, `roles`, `permissions`, `user_roles`, `addresses`, `consent_records`, `account_deletion_requests` |
| Merchant | `merchants`, `merchant_members`, `merchant_verifications`, `merchant_bank_accounts`, `merchant_policy_acceptances` |
| Catalogue | `categories`, `brands`, `products`, `product_variants`, `product_media`, `inventory_levels`, `inventory_reservations`, `catalogue_moderation_events` |
| Shopping | `carts`, `cart_items`, `wishlists`, `promotions`, `promotion_redemptions`, `delivery_quotes` |
| Orders | `orders`, `order_lines`, `order_status_events`, `fulfilments`, `shipments`, `shipment_events` |
| Payments | `payment_attempts`, `provider_events`, `refunds`, `payment_reconciliations` |
| Finance | `ledger_accounts`, `journal_entries`, `journal_lines`, `payouts`, `payout_events`, `payout_holds` |
| Returns/support | `return_requests`, `return_evidence`, `return_shipments`, `disputes`, `dispute_events`, `support_tickets` |
| Operations | `admin_actions`, `audit_events`, `outbox_events`, `background_jobs`, `feature_flags` |

## Key relational decisions

- A `profiles` record represents a person; roles are separate assignments, not a mutable `current_role` text column.
- A person may have more than one merchant membership; merchant permissions are separate from platform-staff permissions.
- `orders` is the buyer-level order. In v1 it has exactly one merchant. `order_lines` holds product/variant, quantity, prices, commission, and fulfilment snapshot.
- Product image URLs are not stored as a raw array. `product_media` records bucket path, sort order, alt text, scan state, and ownership.
- Merchant bank accounts are encrypted at rest using an application-managed envelope/key-management strategy; access is tightly audited. Store verified recipient/provider tokens separately from plaintext account data.
- Preserve bank-account change requests, prior masked beneficiary details, verification result, actor, approver, effective time, cooldown, and notifications as separate immutable events.

## Authorization model

Roles: `buyer`, `merchant_owner`, `merchant_staff`, `support_agent`, `catalogue_moderator`, `finance_reviewer`, `operations_admin`, `security_admin`.

Use permissions, not a single universal super-admin role. Critical actions require separation of duties: the staff member who creates or recommends a payout cannot approve it; the actor resolving a dispute cannot silently change its financial entry.

### Supabase RLS

RLS protects direct data access, but it is not the payment workflow engine.

- Public users may read only active, approved catalogue data.
- Buyers may read their own profile, cart, orders, return requests, and notifications.
- Merchant users may read only their merchant's products, fulfilments, verification status, balances, and payout history; they cannot edit ledger or payout status.
- Operations access is mediated by the Core API. Avoid a self-referencing `profiles` RLS policy; use server-controlled JWT claims or a narrowly reviewed `SECURITY DEFINER` authorization function.
- Service-role credentials are available only to API/worker runtime, never browser/mobile builds.

## Database invariants

- An order cannot become paid without a unique, verified successful payment attempt.
- Available merchant balance cannot fall below zero.
- A payout amount cannot exceed available balance, and creating one atomically moves the amount into payout hold.
- Journal entries must balance to zero for each currency.
- Provider event IDs/references and command idempotency keys are unique in their proper scope.
- Order-line stock cannot be oversold; reserve stock transactionally at checkout and release it on expiration/failure.
- Audit events are append-only and record actor, role, minimized request metadata, redacted before/after values where appropriate, and correlation ID. Sensitive audit exports require access logging and an approved retention/deletion rule.
- Refunds, chargebacks, payout failures, and reversals must post compensating journals. If merchant funds are insufficient, record a recoverable liability and block payout eligibility; never force a cached balance below zero or rewrite historical entries.

## Storage buckets

| Bucket | Access | Content |
| --- | --- | --- |
| `product-media` | Public read only after moderation | product images |
| `merchant-kyc` | Private, API-signed only | CAC/KYC documents |
| `return-evidence` | Private, case-scoped | buyer/merchant proof |
| `support-attachments` | Private, ticket-scoped | support files |

All uploads require type/size validation, malware scanning before publication, content moderation where appropriate, and signed URLs with short expiry for private files.
