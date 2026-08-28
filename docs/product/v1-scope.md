# SellFastBuyFast v1 Product Scope

## Product position

SellFastBuyFast is a proposed curated Nigerian marketplace for approved consumer goods. The supplied UI references establish the experience standard: bold, fast, image-led shopping with a deep-green and gold identity. They are visual references, not an exhaustive functional specification, and product authenticity or quality claims require documented evidence.

## V1 outcome

A buyer can discover approved products, buy items from one approved merchant, track delivery, request a return, and receive a supported refund. A merchant can complete verification, manage products and stock, fulfil orders, see earnings, and request a payout. Operations staff can approve merchants, moderate catalogues, resolve exceptions, and reconcile money.

## In scope

### Buyer mobile app

- Email/phone signup, secure login, account deletion request, and address book.
- Home feed, category browsing, search, filters, product variants, product detail, store pages, cart, saved items, and notifications.
- One-merchant cart and checkout using Paystack only.
- Card and bank-transfer methods supported by the approved Paystack integration.
- Delivery options supplied by the supported logistics provider; tracking events shown when available.
- Order history, cancellation before fulfilment, return request, support ticket, and refund status.

### Merchant portal

- Merchant onboarding, business/KYC document submission, bank-account verification, terms acceptance, and approved/rejected/suspended state.
- Product, variant, image, price, stock, and order-fulfilment management.
- Sales and settlement views based on ledger data, not estimated dashboard totals.
- Payout requests for eligible balance only.

### Operations portal

- Least-privilege staff roles; merchant review; catalogue moderation; order/dispute queue; payout review; content management; finance reconciliation; and immutable audit trails.

## Explicitly out of scope for v1

- Multi-merchant carts or split checkout.
- Cash-on-delivery.
- Stored cash wallet, peer-to-peer transfers, or customer withdrawals.
- Flutterwave or automated payment-provider failover.
- International settlement, buyer-facing currency conversion, subscriptions, or BNPL.
- Automated dispute resolution, marketplace lending, delivery fleet management, and seller self-serve advertising.

## Product rules that must be approved before coding

| Decision | Proposed v1 rule | Owner |
| --- | --- | --- |
| Merchant assortment | Curated categories and prohibited-goods list | Commercial + Legal |
| Commission | Category-level percentage, snapshotted per order line | Finance |
| Delivery | Defined cities/zones, carrier SLA, fee policy, lost-parcel owner | Operations |
| Cancellation | Buyer may cancel only before merchant fulfilment acceptance | Operations |
| Return window | Seven calendar days from verified delivery evidence is the working proposal | Legal + Operations |
| Refund destination | Original payment method; no cash balance | Finance + Legal |
| Payout availability | Only cleared, undisputed, eligible ledger balance | Finance |
| Identity/KYC | Exact required documentation and review evidence | Legal + Risk |

These rules are proposals, not approved policy. Each owner must record approval, effective date, policy version, exception process, and customer/merchant communication before the dependent flow is released.

## Launch-blocking policy details

- Define return exclusions, item condition, evidence standards, return-delivery responsibility, inspection, appeal, and statutory-right interaction.
- Define partial-refund and delivery-fee treatment, approval thresholds, completion timelines, and the funding source when merchant funds are unavailable.
- Define payout frequency, minimums, limits, reserves, holds, failed/reversed-transfer accounting, chargebacks, and negative merchant liability recovery.
- Confirm provider collection and settlement permissions, tax and invoicing treatment, KYC/AML responsibilities, prohibited goods, privacy terms, and records retention in writing.
- Select delivery coverage, service levels, loss/damage ownership, evidence rules, escalation times, and a manual fallback before offering a delivery promise.

## UX implementation rules

- Reuse the reference visual system: deep green, restrained gold, warm off-white surfaces, generous spacing, and product-first imagery.
- Treat every image as a reference asset unless licensing and product-authenticity rights are confirmed.
- Build accessible components first: 44px minimum touch targets, labelled controls, dynamic text support, contrast testing, loading/empty/error states, and screen-reader descriptions.
- Reconcile the current reference catalog before implementation: it depicts 40 labelled screens, while the earlier document describes 38, and it contains Facebook login although the prior scope names Apple and Google only.

## Success measures

- Checkout payment success rate, excluding issuer declines.
- Order-to-delivery tracking coverage and delivery-on-time rate.
- Merchant verification turnaround time.
- Return rate, dispute resolution time, refund time, and payout reconciliation accuracy.
- Search-to-product-view, add-to-cart, and order-conversion funnels.

Availability, fraud prevention, authenticity, delivery, refunds, payout timing, regulatory approval, and app-store acceptance must not be marketed as guaranteed outcomes.
