# Frontend Handoff: Secure Store Profile, Registration, Vacation, and KYC Upload Integration

**Audience:** Vendor Portal frontend engineer

**Backend delivery:** Core API store-profile lifecycle contract and migration `20260904000006_merchant_profile_lifecycle.sql`

## 1. Read this before merging UI work

The backend is now the only source of truth for merchant data. The current Vendor Portal contains local-only profile saving, an RLS-bypassing Supabase fallback, a registration-state simulator, and placeholder KYC values. Those behaviors must be removed in the same release as this integration.

Deploy in this order:

1. Apply migration `20260904000006_merchant_profile_lifecycle.sql` to the target Supabase project.
2. Set `KYC_ENCRYPTION_KEY` on the Core API to a base64-encoded 32-byte secret, then deploy the API.
3. Deploy the Vendor Portal changes in this handoff.

The new profile and registration endpoints are strict. Sending legacy fields such as `status`, `registrationState`, `vacationMode`, `cacNumber`, `tinNumber`, or `directorNin` to `PATCH /profile` returns `VALIDATION_ERROR`.

## 2. Authoritative lifecycle

The client renders state returned by `overview.merchant.registrationState`; it never chooses the state itself.

```text
not_registered
  └─ owner submits complete profile + private documents ──> in_review
                                                         │
                              operations approves ──────┼──> registered + active
                              operations rejects ────────└──> not_registered + rejected
```

Rules:

- `not_registered`: show the onboarding stepper and editable legal-entity inputs. The primary button is **Submit Registration for Review**.
- `in_review`: show a non-editable pending-review state. Do not allow another registration submission or present a “verified” badge.
- `registered`: show the verified badge. Legal fields are read-only; regular store-profile fields remain editable for owner and manager.
- The merchant cannot set `registered`, `active`, or `suspended`. Only Operations can approve/reject a registration.
- Vacation mode is independent of merchant `status`. Do not set `status: 'suspended'` when a merchant pauses orders.

The existing `set-profile-reg-state` segment control is a QA simulator, not a production feature. Remove it from production builds. If QA needs it, gate it behind a non-production feature flag and clearly label it as a visual-only mock; it must not mutate `state.merchant` or local storage.

## 3. Data loading and permissions

On workspace load, continue to use:

```text
GET /v1/vendor/me
GET /v1/vendor/merchant/:merchantId/overview
```

`overview.data` now includes:

```ts
type Merchant = {
  id: string;
  merchantId: string; // compatibility alias; use id internally
  slug: string;
  businessName: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  contactEmail: string;
  contactPhone: string;
  whatsappPhone: string | null;
  address: string;
  lga: string;
  state: NigerianState;
  dispatchContactName: string | null;
  dispatchContactPhone: string | null;
  fulfillmentSla: 'same_day' | 'next_day' | '48_hours';
  vacationMode: boolean;
  registrationState: 'not_registered' | 'in_review' | 'registered';
  status: 'pending_verification' | 'active' | 'suspended' | 'rejected';
  updatedAt: string;
};

type Viewer = {
  memberRole: 'owner' | 'manager' | 'staff';
  isOwner: boolean;
  canEditProfile: boolean;       // owner or manager
  canSubmitRegistration: boolean; // owner only
};
```

Use `viewer.canEditProfile` and `viewer.canSubmitRegistration`, not client-side role guesses. A manager may edit ordinary profile fields and vacation mode, but cannot access legal identity details or submit legal registration.

For an owner, fetch the legal display data only when rendering the legal card:

```text
GET /v1/vendor/merchant/:merchantId/verification
```

It returns only `cacNumber`, `tinNumber`, `directorNinLast4`, review status/reason, and timestamps. The full NIN is never returned. Render it as `•••• •••• ${directorNinLast4}`. Do not render fabricated CAC/TIN/NIN defaults.

## 4. Remove local database and cache fallbacks

Delete the Store Profile paths that make Supabase table calls from the browser:

- `state.client.from('merchants').update(...)`
- `state.client.from('merchant_members')...`
- the merchant, products, orders, and categories direct-query fallback in `loadWorkspace()` / `loadMerchantData()`
- `sfbf_profile_cache` reads/writes and any merge that lets browser cache overwrite an API response

The migration removes public merchant-table access. Direct table reads or writes are expected to fail. Supabase in the vendor browser is for authentication and the short-lived signed KYC upload only; every merchant/business read or mutation uses the Core API.

Do not optimistic-save profile state. Disable the relevant button while the request is in flight, replace canonical merchant state only with the returned `data`, and show success only after a successful API response. On failure, preserve form values, show the server message, and do not mutate `state.merchant`, `state.overview.merchant`, or `localStorage`.

## 5. Store-profile update

Use this only for non-legal, persisted profile fields.

```text
PATCH /v1/vendor/merchant/:merchantId/profile
Idempotency-Key: vendor-profile-<uuid>
```

The request is partial and strict. Omit fields that did not change. Use `null`, not `''`, to clear an optional image, description, WhatsApp number, or dispatch contact.

```ts
type StoreProfilePatch = Partial<{
  businessName: string;             // 2–100 characters
  slug: string;                     // server normalizes; 3–80 normalized chars
  description: string | null;       // max 1,000
  logoUrl: string | null;           // HTTPS only
  bannerUrl: string | null;         // HTTPS only
  contactEmail: string;
  contactPhone: string;             // Nigerian mobile; API normalizes to +234…
  whatsappPhone: string | null;     // Nigerian mobile
  address: string;
  lga: string;
  state: NigerianState;
  dispatchContactName: string | null;
  dispatchContactPhone: string | null;
  fulfillmentSla: 'same_day' | 'next_day' | '48_hours';
}>;
```

The response is `{ success: true, data: Merchant }`. Merge this canonical `Merchant` into both `state.merchant` and `state.overview.merchant`; do not retain client-only fields.

The API accepts owner and manager edits. It normalizes spaces, local Nigerian phone formats, and Unicode slug input. Treat the server response as authoritative, including any normalized phone or slug. Reserved slugs and duplicate slugs must be displayed as validation errors.

## 6. Server-side profile drafts

Replace the browser-only **Save as Draft** implementation with the API endpoints below. A profile draft can contain only non-sensitive StoreProfilePatch fields—never CAC, TIN, NIN, document files, document paths, `registrationState`, `vacationMode`, `status`, or `isDraft`.

```text
GET    /v1/vendor/merchant/:merchantId/profile/draft
PUT    /v1/vendor/merchant/:merchantId/profile/draft
DELETE /v1/vendor/merchant/:merchantId/profile/draft
```

`PUT` uses the same partial profile-field format as `PATCH /profile` and requires an `Idempotency-Key`.

```json
{
  "businessName": "Chimzy Luxury Footwear & Fashion",
  "slug": "chimzy-luxury",
  "address": "Suite 4B, 14 Admiralty Way, Lekki Phase 1",
  "state": "Lagos State"
}
```

The response is:

```json
{ "success": true, "data": { "draft": { "...": "..." }, "updatedAt": "2026-09-04T10:00:00.000Z" } }
```

Implementation behavior:

- Load the draft after the authoritative merchant data. Populate blank/onboarding form controls from it, but visually mark it as unsaved.
- **Save as Draft** serializes only non-empty, permitted values and waits for `PUT` success before displaying a toast.
- **Discard Changes** clears local form edits, calls `DELETE /profile/draft`, then restores the last API merchant object. For a network failure, retain the form and show an error instead of claiming it was discarded.
- Do not merge a draft over a registered merchant indefinitely. After a successful `PATCH /profile` or registration submission, clear the draft UI. The API deletes it after a registration submission.

## 7. Registration and private KYC upload

### 7.1 Upload both documents first

The prior `idDocumentUrl` and `utilityBillUrl` text inputs must be replaced by file controls. Do not accept public document URLs.

For each selected file, validate in the UI before calling the API:

- MIME type: `application/pdf`, `image/jpeg`, or `image/png`
- Size: at most 10 MiB

Request a short-lived upload capability:

```text
POST /v1/vendor/merchant/:merchantId/registration/upload-url
Idempotency-Key: vendor-registration-upload-<uuid>

{ "kind": "identity_document", "contentType": "application/pdf", "sizeBytes": 123456 }
```

`kind` is `identity_document` or `utility_bill`. The response contains:

```ts
{ path: string; token: string; signedUrl: string; expiresInSeconds: 120 }
```

Use the authenticated Supabase client and the returned short-lived token to upload; for example:

```js
const { error } = await state.client.storage
  .from('merchant-kyc')
  .uploadToSignedUrl(upload.path, upload.token, file, { contentType: file.type });
if (error) throw error;
```

Keep only the returned object `path` in ephemeral form state. Never store the source `File`, NIN, path, signed URL, or upload token in localStorage, URL parameters, analytics, debug logs, or error reporting.

If an upload URL expires, request a new one and retry that file. Do not retry the final registration submission until both uploads have succeeded.

### 7.2 Submit for review

Only an owner can call this endpoint. It atomically saves the full merchant profile, encrypts the NIN, records verification evidence, clears the server draft, and transitions the merchant to `in_review`. It deliberately does **not** mark the merchant active or registered.

```text
POST /v1/vendor/merchant/:merchantId/registration
Idempotency-Key: vendor-registration-submit-<uuid>
```

```json
{
  "businessName": "Chimzy Luxury Footwear & Fashion",
  "slug": "chimzy-luxury",
  "description": "Authorized distributor of premium handcrafted Italian leather shoes.",
  "logoUrl": "https://cdn.example.com/logo.png",
  "bannerUrl": null,
  "contactEmail": "concierge@chimzyluxury.ng",
  "contactPhone": "+2348034567890",
  "whatsappPhone": "+2348123456789",
  "address": "Suite 4B, 14 Admiralty Way, Lekki Phase 1",
  "lga": "Eti-Osa",
  "state": "Lagos State",
  "dispatchContactName": "Tunde Bakare",
  "dispatchContactPhone": "+2348031234567",
  "fulfillmentSla": "same_day",
  "cacNumber": "RC-1892041",
  "tinNumber": "24891024-0001",
  "directorNin": "83920194821",
  "idType": "national_id",
  "idDocumentPath": "<path returned for identity_document>",
  "utilityBillPath": "<path returned for utility_bill>"
}
```

The primary button logic is:

- `not_registered` + `canSubmitRegistration`: validate, upload documents, then call `POST /registration`.
- `in_review`: disabled, with **Registration under review** and the backend `rejectionReason`/status where applicable.
- `registered`: call `PATCH /profile` for normal profile changes; do not include legal fields.
- non-owner: show profile read-only if `canEditProfile` is false; a manager can use `PATCH /profile` but not see/edit legal data or call registration.

After `202 Accepted`, use `data.merchant` as the canonical state, clear the NIN and file inputs immediately, show **Registration submitted for Operations review**, and render `in_review`. Do not claim the merchant is verified, active, or “fully registered.”

## 8. Vacation mode

Use a distinct operation once normal profile changes have completed:

```text
POST /v1/vendor/merchant/:merchantId/vacation-mode
Idempotency-Key: vendor-vacation-<uuid>

{ "enabled": true, "reason": "Annual warehouse stock audit" }
```

The reason is required (3–500 characters). Present a confirmation dialog that collects it when toggling either on or off. Use the returned `Merchant` to update state. The endpoint is available only to an active, registered merchant and owner/manager.

Do not include `vacationMode` in `PATCH /profile`, and never translate it into `status: 'suspended'`. Existing paid orders remain fulfillable; the backend blocks only new checkout attempts.

## 9. Shopper-facing integration

`GET /v1/catalog/products` and `GET /v1/catalog/products/:id` now return:

```ts
merchantName: string;
merchantSlug: string;
merchantVacationMode: boolean;
```

Active registered merchants remain browseable while on vacation. In shopper UI:

- Display a clear “Store temporarily away” notice when `merchantVacationMode` is true.
- Disable **Add to bag** and **Buy now** for those products.
- If the buyer already has an item and the merchant enables vacation, handle the server’s checkout rejection with a remove-item/retry path.

The Core API enforces this again under a merchant row lock during checkout with `MERCHANT_UNAVAILABLE`; the client behavior is user experience, not a security control.

## 10. Lightbox and Product Studio

No backend endpoint is required for the modal fix. Keep the existing event-delegated behavior:

- Backdrop, top-right close, and footer close must all set `state.modal = null`.
- **Edit in Studio** must clear `state.modal` before populating `state.productDraft` from the product returned by the Core API catalogue-management route.
- Do not add `event.stopPropagation()` to dialog containers.

The modal must operate only on already-loaded product data. It must not make a merchant-profile write or use a Supabase table fallback.

## 11. Errors to handle explicitly

| Code | UI response |
| --- | --- |
| `VALIDATION_ERROR` | Keep form values; show field/form error. |
| `SLUG_ALREADY_EXISTS` | Focus handle input; explain that the URL is claimed. |
| `SLUG_RESERVED` | Focus handle input; prompt for a non-reserved name. |
| `FORBIDDEN` | Switch profile to read-only and show the permission message. |
| `REGISTRATION_UNDER_REVIEW` | Render pending state; do not offer resubmit. |
| `REGISTRATION_LOCKED` | Render legal data as read-only; route corporate changes to Compliance. |
| `KYC_UPLOAD_UNAVAILABLE` | Keep selected files in memory only; allow retry. |
| `KYC_ENCRYPTION_UNAVAILABLE` | Stop submission; show a generic “registration temporarily unavailable” message and alert Operations. |
| `MERCHANT_NOT_ELIGIBLE` | Disable vacation toggle and refresh overview. |
| `MERCHANT_UNAVAILABLE` | Shopper: explain checkout is unavailable and allow bag correction. |
| `REQUEST_IN_PROGRESS` | Keep current submit state; do not generate duplicate uploads or registrations. |

## 12. Acceptance checklist

### Store profile

- [ ] Owner and manager can update allowed fields; staff cannot.
- [ ] Server-normalized slug/phone replaces the local form value after save.
- [ ] A duplicate or reserved slug remains unsaved and shows an actionable error.
- [ ] A failed request never changes header badge, store URL, merchant state, or browser storage.

### Drafts and onboarding

- [ ] Draft survives reload through the API, not localStorage.
- [ ] Draft contains no KYC or lifecycle/status data.
- [ ] Discard deletes the server draft and restores canonical API data.
- [ ] An owner submission reaches `in_review`, never `registered` directly.
- [ ] Managers cannot submit legal registration; they cannot see the full NIN.
- [ ] Registered UI shows backend CAC/TIN and a backend-derived NIN mask, with no hard-coded identifiers.

### KYC upload

- [ ] Files over 10 MiB and unsupported types are rejected before upload.
- [ ] Both paths came from the merchant-scoped upload endpoint before registration is submitted.
- [ ] Neither file, NIN, signed URL, token, nor path is written to localStorage or logs.
- [ ] NIN input is cleared after a successful or failed terminal submission path.

### Vacation and checkout

- [ ] Vacation toggle calls only `/vacation-mode` with a reason.
- [ ] Existing order actions remain available while the merchant is away.
- [ ] Shopper browse shows away status and disabled purchase actions.
- [ ] Checkout handles a server-side `MERCHANT_UNAVAILABLE` race correctly.

### Modal regression

- [ ] Product image lightbox closes via backdrop, close icon, and Close button.
- [ ] **Edit in Studio** closes the lightbox and opens the selected product with correct variants/media.
- [ ] No modal reintroduces `stopPropagation()` on its dialog container.
