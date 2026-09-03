# Vendor Operations Backend Integration

Apply migration `20260903000003_vendor_operations_escrow.sql` before deploying the Core API. It persists each delivery's seven-day buyer-protection deadline, backfills current delivered orders, and creates the escrow and delivery-fee ledger accounts.

Run the API and worker as separate processes:

```sh
npm run start --prefix services/core-api
npm run start:worker --prefix services/core-api
```

Set the Vendor Portal's `VENDOR_API_URL` to the public HTTPS Core API URL and include the portal's origin in `CORS_ORIGINS`. The portal uses Supabase only for sign-in; all merchant, fulfilment, return, inventory, and financial data now comes through `/v1` API routes.

## Carrier delivery webhooks

Configure an HMAC-SHA256 secret for each enabled carrier using a JSON environment variable. Carrier keys are normalized to lowercase kebab case.

```sh
LOGISTICS_WEBHOOK_SECRETS='{"gig-logistics":"replace-with-gigl-secret","dhl-express":"replace-with-dhl-secret"}'
```

Each carrier posts raw JSON to `POST /v1/fulfilment/webhooks/:carrier` with an `x-logistics-signature` header containing the SHA-256 HMAC of the exact request body (a `sha256=` prefix is accepted).

```json
{
  "eventId": "carrier-event-unique-id",
  "event": "DELIVERED_TO_RECIPIENT",
  "orderId": "platform-order-uuid",
  "deliveryEvidenceUrl": "https://carrier.example/proof/waybill.jpg",
  "occurredAt": "2026-09-03T14:20:00.000Z",
  "note": "Recipient signature captured"
}
```

The API deduplicates events, rejects unsigned or malformed callbacks, and only final-delivery events can move an in-transit shipment to delivered. Merchant roles never receive a delivery-completion route.

## Escrow completion

At payment verification, product subtotal is credited to platform escrow. The hourly worker selects delivered orders whose persisted return deadline has elapsed and have no open return. In one transaction it posts the escrow release, credits marketplace commission and the merchant's available balance, then marks the order complete. A row lock rechecks the return state before any funds are released.
