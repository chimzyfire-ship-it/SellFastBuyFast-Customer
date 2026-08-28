# Financial Domain, Payment, Refund, and Payout Design

## Principle

The system must distinguish a provider's settlement balance from SellFastBuyFast's internal accounting. SellFastBuyFast must not call a payment-provider settlement arrangement `escrow` unless the approved provider contract and written legal advice explicitly establish that structure.

## V1 payment model

1. Buyer checks out a cart containing items from exactly one merchant.
2. Core API reserves inventory, creates an order and a `payment_attempt`, and requests a Paystack checkout session.
3. The app completes provider-hosted payment. The app's callback is informational only.
4. Paystack webhook is signature-verified, stored once, and processed idempotently. The API also verifies the provider transaction before marking the attempt successful.
5. A successful payment posts balanced internal ledger entries: buyer payment clearing, platform liability, commission revenue, delivery liability, and merchant pending balance.
6. Carrier delivery evidence starts the approved return window. Eligibility, not a timer alone, determines when merchant funds move from pending to available.
7. Merchant requests payout from available balance. The API creates a payout record and financial hold, then the worker initiates the provider transfer. Provider webhook/reconciliation determines final status.

## Why no split payment in v1

Split settlement to a merchant subaccount conflicts with the plan to defer merchant availability until a return window closes. Use a platform collection model only if the provider agreement and applicable legal advice permit it. Re-evaluate provider-native marketplace splits later, after the commercial settlement model is approved.

## Ledger rules

Use immutable, balanced double-entry journal lines. Do not update balances as the source of truth. A cached balance may be maintained for reads but must be reproducible from the ledger.

Required accounts include:

- payment clearing
- merchant pending payable (by merchant)
- merchant available payable (by merchant)
- merchant payout hold (by merchant)
- platform commission revenue
- delivery-fee liability/revenue according to contract
- refund payable/clearing
- payment-provider fees
- chargeback/dispute reserve when introduced

Every journal has a business reference (`order`, `refund`, `payout`, or adjustment), currency, amount in minor units, actor/process, idempotency key, and creation time. Corrections are compensating entries, never mutation or deletion.

## State machines

### Payment attempt

`created -> initiated -> pending -> succeeded | failed | cancelled | expired`

Only a verified provider event or provider verification response can produce `succeeded`.

### Order

`draft -> awaiting_payment -> paid -> merchant_accepted -> packed -> shipped -> delivered -> return_window -> completed`

Exception paths: `cancel_requested`, `cancelled`, `return_requested`, `return_in_transit`, `return_received`, `refunded`, `disputed`.

### Seller balance

`pending -> available -> payout_held -> paid_out`

Funds can move from `pending` or `available` to `reserved` for a dispute, chargeback, refund exposure, or risk hold. Only an authorised resolution can return reserved funds to their prior eligible state or apply compensating ledger entries. A displayed balance may not conceal a merchant liability: if a chargeback or refund exceeds funds held, record a separate recoverable negative liability, suspend payout eligibility, and follow the approved recovery policy rather than mutating the ledger.

### Payout

`requested -> risk_review -> approved -> submitting -> provider_pending -> paid | failed | reversed | rejected`

Do not represent a payout as paid merely because the transfer request was accepted. Reconcile provider reference and webhook status.

## Refund and dispute controls

- A return request records reason, evidence, requested resolution, timestamps, and policy snapshot.
- Merchant response, return shipment, receipt/inspection, and decision are separate events.
- Partial refund and delivery-refund rules must be explicit.
- A refund is initiated through the payment provider and becomes final only after provider confirmation/reconciliation.
- Operations staff require reason codes; high-risk actions require dual approval and phishing-resistant MFA.
- The approved policy must define partial refunds, delivery-fee treatment, statutory rights, customer communication, service targets, appeal paths, and who funds a refund when merchant funds are insufficient.
- A failed payout releases its hold only after provider status and reconciliation prove that funds did not leave control. A reversed payout posts compensating entries and returns to risk review; neither event may silently increase available balance.

## Reconciliation

Run at least daily on an approved business timezone and settlement cutoff, with named ownership and escalation targets:

1. Fetch provider transactions, transfers, refunds, fees, and reversals for the prior period.
2. Match by provider reference and expected amount/currency.
3. Flag unmatched, duplicate, delayed, and amount-mismatched records.
4. Block automated payout/release actions when the relevant reconciliation is unresolved.
5. Produce an immutable daily report signed by the job run/version.

## Finance approval prerequisites

Before live money movement, obtain written approval on provider settlement model, merchant agreement, refund policy, tax/invoicing treatment, safeguarding/escrow terminology, payout limits, chargeback reserves, and personal-data handling. This is a product/operational requirement, not legal advice.
