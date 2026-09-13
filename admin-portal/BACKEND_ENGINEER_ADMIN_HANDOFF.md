# Admin frontend integration handoff

Implementation update: the admin backend now exists in `services/core-api/src/modules/admin`. This document retains the integration contract; see [delivery and rollout](../docs/operations/admin-operations-integration.md) for implemented behavior, verification, and deployment requirements.


## Delivery boundary

This is the real, API-connected admin frontend. It does not create fake marketplace state or complete commands locally. The existing Core API supports several domain commands, but `services/core-api/src/app.ts` currently has no `/v1/admin` router. The admin read models and remaining commands below must be implemented before the workspace becomes operational. Do not weaken the staff gate to make the screens visible.

The frontend uses `contracts.mjs` as its action/role/lifecycle registry; `admin-contracts.d.ts` defines the read shapes; `ui.mjs` lists domain-specific display fields and queue columns. Return an explicit empty array for an empty collection. Missing/unavailable data is not a zero balance or a successful financial result.

## Customer, vendor, and admin responsibilities

- Vendor registration → staff decision → merchant selling eligibility. Registration state and selling status are distinct. A rejected registration becomes `not_registered` and is correctable in the vendor portal.
- Vendor catalogue submission → moderation → discovery. The backend determines whether merchant eligibility, listing status, and stock permit shopper visibility/purchase.
- Customer order → Core API inventory/payment → vendor fulfilment → signed carrier event → customer tracking. This is not a sequence of manual admin approvals.
- Customer return → merchant or authorized support decision → receipt → separate refund processing. Escalation creates an independently reviewable dispute; a support decision cannot claim provider settlement.
- Ledger eligibility → payout review by a different operator → provider dispatch → provider confirmation. The admin must never write ledger balances or manually mark a transfer successful.
- Store profile, stock, shopper notifications, and approved catalogue reads remain owned by the existing services. New admin decisions must publish the appropriate domain/outbox events so vendor and customer views observe confirmed changes.

## Authentication and transport

`GET /v1/admin/me` returns `Envelope<Viewer>` from verified server roles, never user-editable auth metadata. It is the gate for every workspace. It returns `requireMfa` and creation capabilities `content:create` / `access:invite` as applicable. Check MFA assurance on the server as well as in the UI. Roles are the existing enum: operations_admin, catalogue_moderator, support_agent, finance_reviewer, security_admin.

Every API request sends `Authorization: Bearer <access token>`, uses no-store caching, and omits cookies. POST/PATCH commands send an `Idempotency-Key`; record commands also send `If-Match` with the record's `version`. Enforce concurrency on the server, including domain routes that predate this portal. Return 409/412 for stale or ineligible records and 403 for denied access. Return `{success:true,data:...}` only after committing the command; errors use `{success:false,error:{code,message}}`. An optional exposed `X-Request-ID` is displayed for troubleshooting.

Re-evaluate role, entity access, lifecycle, record version, and business eligibility inside the mutation transaction. `allowedActions` is a UI affordance, never authorization. For money commands, omit permissions and return `actionBlockReason` while the dedicated payments module is deferred or not provider-tested. Do not activate it merely because an existing payout route is callable.

The UI requires a version before rendering decisions, hides self-revocation/role editing, and prevents payout self-approval. The backend must enforce these rules, protect the last security administrator, revoke affected sessions, and enforce separation of duties independently.

## Workspace reads (new)

- `GET /v1/admin/overview` → `Envelope<Overview>`. Metrics, reporting timestamp, scoped queue counts, and recent activity must come from real records. Supply only data the viewer may access.
- `GET /v1/admin/:section?limit=25&sort=updated_desc&q=...&status=...&cursor=...` → `Envelope<Page>`. Sections: merchants, catalogue, orders, customers, returns, disputes, support, refunds, payouts, reconciliation, content, access, audit. Sort supports updated_desc, created_desc, created_asc. Cursor must be opaque, stable, and scoped to the filters; include `nextCursor:null` at the end. `total` is optional, not inferred from page size.
- `GET /v1/admin/:section/:id` → `Envelope<Detail>`. Include `record`, `activity`, `media`, and `documents`; notes for merchants/orders/customers/returns/disputes/support; messages for support; variants for catalogue; items and tracking for orders; entries for finance workspaces. Dates are ISO 8601, IDs are strings, and money is integer NGN minor-unit strings. Never round through unsafe JavaScript numbers.
- `GET /v1/admin/:section/:id/documents/:documentId/access` → `{url,name,expiresAt}`. Authorize document ownership and viewer access; issue short-lived HTTPS access links. Do not send raw storage object keys as public URLs, signed documents in list responses, or unmasked bank credentials.
- `GET /v1/admin/:section/:id/assignees` → `{items:[{id,name,email}]}`. Return only eligible staff for that case type.
- `GET /v1/admin/services` → `{services:[{name,status}]}`. Report measured health of allowed services. Do not expose credentials or internal infrastructure details.

All values above are the `data` member of the success envelope. Detail tabs are linked by `#/section/id?tab=...`; the same detail response supplies their data. The queue's filters travel with record links and are restored by the Back link. Only the current fetched page is exported, clearly labelled; there is no misleading all-records export.

## Auxiliary writes

| Endpoint | Body | Required permission |
| --- | --- | --- |
| POST `/v1/admin/:section/:id/notes` | `{note}` (3–2000 trimmed characters) | record `add_note` |
| POST `/v1/admin/:section/:id/assign` | `{assigneeId,note}` | record `assign` |
| POST `/v1/customer-care/tickets/:id/agent-messages` (existing) | `{message}` (1–5000 trimmed characters) | record `reply_ticket`, support/operations role, open/pending ticket |
| POST `/v1/admin/content` | `CampaignInput` | viewer `content:create`, operations role |
| PATCH `/v1/admin/content/:id` | `CampaignInput` | record `edit_content`, draft only |
| POST `/v1/admin/access/invitations` | `{email,roles,note}` | viewer `access:invite`, security role |
| POST `/v1/admin/access/:id/roles` | `{roles,note}` | record `edit_roles`, security role, not self |

Campaign placements are home_hero, home_collection, category_feature. Destinations are category/product/merchant IDs; the backend validates existence, visibility, image ownership/trust, and schedule consistency. Saving always produces a draft; publishing is a separate command. Browser-local date inputs are converted to ISO timestamps. Schedule activation/deactivation needs a worker and storefront invalidation. Editing a published campaign is intentionally unavailable: archive it and create a reviewed replacement.

Invitations send a real email only after authorization and validation. Prevent duplicate active invitations, reserve permission grants server-side, expire invitation tokens, and audit delivery/redeeming/revocation. Internal notes must not enter customer-visible message threads. Agent replies are customer-visible and use the existing notification workflow.

## Record commands

The following table is generated from the frontend's `ACTIONS` registry. All requests use POST. A reason of 10–500 trimmed characters and an explicit confirmation are collected by the UI. The frontend includes the reason even for legacy receipt/close/dispatch routes. Extend those endpoints to retain it in their audit events before launch; current handlers do not yet persist that field.

| Action | Endpoint | Source state | Backend status |
| --- | --- | --- | --- |
| `restrict_customer` | `/v1/admin/customers/:id/restrict` | active | New endpoint required |
| `restore_customer` | `/v1/admin/customers/:id/restore` | restricted | New endpoint required |
| `review_privacy` | `/v1/admin/customers/:id/privacy-review` | deletion_requested | New endpoint required |
| `approve_return` | `/v1/customer-care/returns/:id/decision` | requested | Exists; verify version/audit contract |
| `reject_return` | `/v1/customer-care/returns/:id/decision` | requested | Exists; verify version/audit contract |
| `unpublish_product` | `/v1/admin/catalogue/:id/withdraw` | published | New endpoint required |
| `approve_merchant` | `/v1/vendor/merchant/:id/registration/decision` | in_review | Exists; verify version/audit contract |
| `reject_merchant` | `/v1/vendor/merchant/:id/registration/decision` | in_review | Exists; verify version/audit contract |
| `suspend_merchant` | `/v1/admin/merchants/:id/suspend` | registered | New endpoint required |
| `restore_merchant` | `/v1/admin/merchants/:id/restore` | suspended | New endpoint required |
| `publish_product` | `/v1/catalog-management/products/:id/moderate` | pending_approval | Exists; verify version/audit contract |
| `reject_product` | `/v1/catalog-management/products/:id/moderate` | pending_approval | Exists; verify version/audit contract |
| `escalate_order` | `/v1/admin/orders/:id/escalate` | processing, in_transit | New endpoint required |
| `receive_return` | `/v1/customer-care/returns/:id/received` | approved | Exists; verify version/audit contract |
| `escalate_return` | `/v1/admin/returns/:id/escalate` | requested, rejected | New endpoint required |
| `resolve_dispute` | `/v1/admin/disputes/:id/resolve` | open, under_review | New endpoint required |
| `close_ticket` | `/v1/customer-care/tickets/:id/close` | open, pending | Exists; verify version/audit contract |
| `reopen_ticket` | `/v1/admin/support/:id/reopen` | closed, resolved | New endpoint required |
| `request_refund` | `/v1/admin/refunds/:id/review` | review_required | New endpoint required |
| `approve_payout` | `/v1/payouts/:id/approve` | pending_approval | Exists; verify version/audit contract |
| `reject_payout` | `/v1/payouts/:id/reject` | pending_approval | Exists; verify version/audit contract |
| `dispatch_payout` | `/v1/payouts/:id/dispatch` | approved | Exists; verify version/audit contract |
| `investigate` | `/v1/admin/reconciliation/:id/investigate` | unmatched | New endpoint required |
| `recheck` | `/v1/admin/reconciliation/:id/recheck` | investigating | New endpoint required |
| `publish_content` | `/v1/admin/content/:id/publish` | draft, scheduled | New endpoint required |
| `archive_content` | `/v1/admin/content/:id/archive` | published, scheduled | New endpoint required |
| `revoke_access` | `/v1/admin/access/:id/revoke` | active, invited | New endpoint required |

`contracts.mjs` defines exact command bodies. Registration uses decision approve/reject; moderation publish/reject; returns approved/rejected. Dispute outcome is resolved_buyer/resolved_merchant with a note. Refund review reviews the record's persisted amount; it does not accept a newly typed amount or mark success. Reconciliation recheck queues provider verification and never directly matches a ledger entry. Customer privacy review starts a review; it does not perform deletion or assert a retention policy.

## Lifecycle alignment

Payout settlement is `successful`, not `paid`. Returns progress through requested/approved/rejected/received/refund_initiated/completed. Disputes use open/under_review/resolved_buyer/resolved_merchant/closed. Orders include pending_payment/refunded/disputed as well as the fulfilment states. Merchant registration uses not_registered/in_review/registered; suspended selling status takes precedence in the admin filter.

Refund `review_required` is a proposed review read-model state, not an existing refund enum value. Existing provider refund rows have initialized/successful/failed. Customer restriction/privacy review, campaigns, reconciliation investigations, and staff invitation states also require backend models: never reinterpret them as existing tables without adding the necessary service contracts/migrations.

## Failure and recovery semantics

No optimistic business updates. The UI waits for a confirmed successful envelope, then refetches the authoritative workspace. It aborts obsolete reads when navigating. Conflict responses block a stale form until refresh. Network failures, malformed responses, and server errors retain the request body/key and lock editable values for a same-request retry. In-flight submissions block navigation. Unconfirmed requests and draft notes/replies warn before page unload.

Request retry state and note/reply drafts live in memory, not a database or persistent browser business cache. They do not survive a full reload; server idempotency, record concurrency, and provider reconciliation remain essential. Draft campaign/access dialogs are not autosaved; users explicitly save/send them. Sign-out clears sensitive workspace state. Display density is the only application preference persisted locally, alongside the identity SDK's session storage.

## Integration acceptance

1. Provision real staff roles and MFA; confirm buyer/vendor accounts cannot enter admin. Confirm a revoked staff session cannot read or mutate another record.
2. Exercise each queue with real authorized records, including empty queues, multiple pages, search, deep links, and browser back/forward.
3. Review actual merchant registration and listing submissions and verify vendor correction states and shopper discovery change only after committed decisions.
4. Send a support reply and verify the actual shopper thread/notification. Return receipt must not claim a refund is paid. Confirm signed document expiry and ownership checks.
5. Exercise duplicate submission, timeout-after-commit, If-Match conflict, and permission revocation. No duplicate invitation, reply, refund, or payout should result.
6. Keep deferred finance actions unavailable until the dedicated provider module is ready. Then test separation of duties, dispatch, signed callbacks, reversals, and reconciliation using the provider's approved test environment.
7. Verify campaign date activation, target validation, stale edit protection, and actual storefront removal on archive.
8. Test at phone/tablet/desktop sizes, keyboard-only navigation, screen readers, reduced motion, password recovery, and MFA recovery. Browser QA was unavailable in the frontend implementation session; the executable tests are not a substitute for these checks.
