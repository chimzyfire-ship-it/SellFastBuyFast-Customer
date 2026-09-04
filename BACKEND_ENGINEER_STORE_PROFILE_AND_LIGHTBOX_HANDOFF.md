# SellFastBuyFast: Store Profile, Warehouse Courier Pickup, and Lightbox Modal Routing Handoff

**Author:** Staff UI/UX & Frontend Systems Engineer  
**Recipient:** Backend & Platform Engineering Team  
**Date:** September 4, 2026  
**Scope:** Store Profile & Settings Rebranding, 3PL Courier Dispatch Pickup Schema, Vacation Mode, Lightbox Modal Resolution, and API Synchronization  

---

## 1. Executive Summary

In this release, the vendor workspace has undergone two major architectural upgrades:
1. **Modal Event Bubbling & Routing Bug Fix:** Fixed an event-bubbling suppression issue (`event.stopPropagation()`) in product photo lightboxes and action modals that was trapping click events, preventing close actions (`[✕]` and `[Close]`) and routing to Product Studio (`[Edit in Studio]`). Modals now dismiss reliably on button clicks and backdrop touches, and directly hydrate Product Studio with the selected product's specifications.
2. **Rebranding & Overhaul of "Business & KYC" $\to$ "Store Profile":** Replaced the legacy KYC form with a comprehensive, enterprise merchant settings console modeled after modern multi-vendor commerce systems (Shopify, Stripe, Amazon Seller Central). The view is organized into 6 core modules:
   - **Storefront Identity & Public Branding** (Business Name, Handle/Custom Slug with preview URL and 1-click copy, Tagline/Bio, Logo, Banner)
   - **Physical Warehouse & Courier Pickup Address** (Street Address, LGA, Nigerian State, Dispatch Officer Name, Dispatch Contact Phone for GIG/Fez/Red Star couriers)
   - **Customer Support Channels** (Support Email, Support Hotline, WhatsApp Business line with live test link)
   - **Legal Entity & KYC Compliance** (CAC RC/BN number, FIRS TIN, Director NIN, and verification badge)
   - **Fulfillment Operations & Vacation Mode** (Dispatch SLA lead times, Vacation Mode toggle switch to pause incoming orders)
   - **Account Credentials & Session** (Signed-in email, Merchant ID, Role, Sign Out)

---

## 2. Root Cause Analysis: Lightbox Modal Close & Edit Routing

### The Defect
Merchants reported that clicking either the top-right `[✕]` or the bottom `[Close]` button in the high-resolution Product Lightbox modal failed to close the modal. Furthermore, clicking `[Edit in Studio]` failed to navigate into Product Studio.

### Root Cause
1. **Global Event Delegation Suppression:** The portal architecture binds interactive action handlers at the top level via `document.addEventListener('click', ...)`, identifying targets via `data-action="..."`. The modal dialog container had an inline `onclick="event.stopPropagation()"` attribute. This halted click events inside the dialog, preventing the click from bubbling to the document listener.
2. **Modal State Retention on Studio Navigation:** In the `edit-product` click handler, `state.modal` was not being reset to `null`. As a result, even if navigation was requested, the lightbox modal remained rendered on top of the Product Studio workspace.

### The Fix Applied
- **Removed `onclick="event.stopPropagation()"`** from all 7 modal dialogs across the portal.
- **Added Backdrop Click Interception:** At the very top of `document.addEventListener('click')`, backdrop clicks are detected via `event.target.classList.contains('modal-backdrop')` to dismiss modals naturally.
- **Explicit Modal Reset on Edit:** The `edit-product` handler immediately executes `state.modal = null;`, clears form errors, populates `state.productDraft`, navigates to `add-product`, scrolls to top smoothly, and triggers a confirmation toast.

---

## 3. Database Schema & Data Model Alignment

### PostgreSQL `public.merchants` Table Alignment

The frontend now surfaces and writes directly to existing PostgreSQL schema columns in `public.merchants`:

```sql
-- Schema Reference: public.merchants
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS slug CITEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS business_name TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS contact_email CITEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'Lagos State',
  ADD COLUMN IF NOT EXISTS lga TEXT NOT NULL DEFAULT 'Eti-Osa',
  ADD COLUMN IF NOT EXISTS address TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS dispatch_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS fulfillment_sla TEXT DEFAULT 'same_day',
  ADD COLUMN IF NOT EXISTS vacation_mode BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cac_number TEXT,
  ADD COLUMN IF NOT EXISTS tin_number TEXT,
  ADD COLUMN IF NOT EXISTS director_nin TEXT,
  ADD COLUMN IF NOT EXISTS status merchant_status_type NOT NULL DEFAULT 'active';
```

### Column Dictionary & Semantics

| Column | Type | Validation / Constraints | Purpose |
|---|---|---|---|
| `slug` | `CITEXT` | Unique, lowercase, kebab-case (`^[a-z0-9-]+$`) | Public storefront URL handle (`sellfastbuyfast.com/store/[slug]`) |
| `business_name` | `TEXT` | Required, 2–100 chars | Customer-facing trade brand name |
| `description` | `TEXT` | Optional, up to 1000 chars | Merchant store bio, warranty summary, specialty |
| `logo_url` | `TEXT` | Valid HTTPS URI | Store avatar badge |
| `banner_url` | `TEXT` | Valid HTTPS URI | Storefront header background image |
| `contact_email` | `CITEXT` | Valid RFC 5322 email | Buyer customer support email |
| `contact_phone` | `TEXT` | E.164 or Nigerian format (`+234...`) | Customer support telephone hotline |
| `whatsapp_phone` | `TEXT` | E.164 (`+234...`) | Direct WhatsApp support link generated on buyer receipts |
| `address` | `TEXT` | Required | Physical warehouse / facility where couriers pick up orders |
| `lga` | `TEXT` | Required | Local Government Area for logistics routing zone calculations |
| `state` | `TEXT` | Valid Nigerian State | State jurisdiction for 3PL dispatch |
| `dispatch_contact_name` | `TEXT` | Optional | Name of warehouse supervisor meeting courier riders |
| `dispatch_contact_phone` | `TEXT` | Optional | Direct phone line for courier rider when arriving at facility |
| `fulfillment_sla` | `TEXT` | Enum: `'same_day'`, `'next_day'`, `'48_hours'` | Dispatch SLA commitment |
| `vacation_mode` | `BOOLEAN` | Default: `FALSE` | When `TRUE`, storefront checkout is disabled and status is paused |
| `cac_number` | `TEXT` | e.g., `RC-1849202` or `BN-3948201` | Corporate Affairs Commission registration |
| `tin_number` | `TEXT` | 10–14 digits (`24891024-0001`) | FIRS Tax Identification Number |
| `director_nin` | `TEXT` | 11 digits | National Identity Number of primary director |

---

## 4. API Endpoints & Contracts

### 4.1 Update Merchant Store Profile & Pickup Address
Updates public storefront details, warehouse address, customer care channels, and fulfillment settings.

- **Method:** `PATCH`
- **Route:** `/v1/vendor/merchant/:merchantId/profile`
- **Authentication:** `Bearer <JWT>` (Must have `owner` or `manager` role in `merchant_members`)
- **Headers:** `Idempotency-Key: vendor-profile-<uuid>`

#### Request Body
```json
{
  "businessName": "Chimzy Luxury Footwear & Fashion",
  "slug": "chimzy-luxury",
  "description": "Authorized distributor of premium handcrafted Italian leather shoes, formal footwear, and executive accessories with 7-day buyer escrow protection.",
  "logoUrl": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
  "bannerUrl": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200",
  "contactEmail": "concierge@chimzyluxury.ng",
  "contactPhone": "+234 803 456 7890",
  "whatsappPhone": "+234 812 345 6789",
  "address": "Suite 4B, 14 Admiralty Way, Lekki Phase 1",
  "lga": "Eti-Osa",
  "state": "Lagos State",
  "dispatchContactName": "Tunde Bakare (Fulfillment Lead)",
  "dispatchContactPhone": "+234 803 123 4567",
  "fulfillmentSla": "same_day",
  "vacationMode": false,
  "cacNumber": "RC-1892041",
  "tinNumber": "24891024-0001",
  "directorNin": "83920194821"
}
```

#### Response: `200 OK`
```json
{
  "success": true,
  "data": {
    "merchantId": "8f307373-c6f3-4217-bc7e-2cfc38234857",
    "businessName": "Chimzy Luxury Footwear & Fashion",
    "slug": "chimzy-luxury",
    "status": "active",
    "vacationMode": false,
    "updatedAt": "2026-09-04T09:40:00.000Z"
  }
}
```

#### Error Codes
- `400 BAD_REQUEST`: Slug contains invalid characters or required address fields missing.
- `409 SLUG_ALREADY_EXISTS`: The requested slug handle is already claimed by another vendor.
- `403 FORBIDDEN`: Active user lacks administrative permission on this merchant record.

---

### 4.2 Vacation Mode Toggle
- **Method:** `POST`
- **Route:** `/v1/vendor/merchant/:merchantId/vacation-mode`
- **Request Body:**
  ```json
  {
    "enabled": true,
    "reason": "Annual warehouse stock audit"
  }
  ```
- **Fulfillment Engine Action:**
  - When `enabled: true`, the merchant's listings remain queryable in browse/search feeds with a `[Store Away on Break]` notice, but `[Add to Cart]` and `[Buy Now]` are temporarily blocked.
  - Active orders in `processing` remain subject to standard fulfillment SLAs and must be dispatched before vacation shutdown.

---

## 5. Security, Validation & RLS Directives

1. **Row-Level Security (RLS) on `public.merchants`:**
   ```sql
   -- Allow public read of active merchants
   CREATE POLICY "Public can view active merchants"
     ON public.merchants FOR SELECT
     USING (status = 'active');

   -- Allow merchant owners/managers to update their own record
   CREATE POLICY "Merchants can update own profile"
     ON public.merchants FOR UPDATE
     USING (
       auth.uid() IN (
         SELECT user_id FROM public.merchant_members
         WHERE merchant_id = merchants.id AND role IN ('owner', 'manager')
       )
     );
   ```

2. **Slug Hygiene:**
   Slugs must be lowercased, stripped of diacritics, and restricted to `^[a-z0-9]+(-[a-z0-9]+)*$`. Reserved prefixes (`admin`, `api`, `support`, `auth`, `portal`, `checkout`) must be disallowed.

3. **Courier API Waybill Webhooks (GIG / Fez / Red Star):**
   When generating automated shipping labels upon merchant order acceptance, the dispatch engine MUST read the pickup address directly from `merchants.address`, `merchants.lga`, and `merchants.state`, passing `dispatch_contact_name` and `dispatch_contact_phone` as the shipper contact.

---

## 6. Frontend Verification & Deployment Details

- **Repositories Synchronized:**
  - `SellFastBuyFast-Vendor` (`main`): Live bundle deployed to Vercel production.
  - `SellFastBuyFast-Customer` (`feat/vendor-operations-portal` and `main`): Fully merged.
- **Production URL:** [https://sell-fast-buy-fast-vendor.vercel.app](https://sell-fast-buy-fast-vendor.vercel.app)
- **Zero Vibe Emojis:** Verified across all UI modules, cards, toasts, and headers.
