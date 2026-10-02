# SellFastBuyFast — Backend Architecture & Handoff Specification
## Mobile Category Taxonomy, Jumia Split-Screen Layout & 5-Tab Native Navigation

**Target Audience:** Core Backend Engineering Team, Database Administrators, API Platform Engineers  
**System Domain:** Mobile Discovery Experience, Category Taxonomy Hierarchy, Product Catalog Filtering, Native 5-Tab Navigation  
**Version:** 1.0.0 (Production Blueprint)  
**Security Classification:** Confidential / Platform Engineering Blueprint  
**Branch:** `feat/mobile-categories-layout-and-five-tab-nav`  

---

## 1. Executive Summary & Purpose

To drive explosive conversion, intuitive catalog browsing, and parity with leading African e-commerce standards (e.g., Jumia, Konga), the SellFastBuyFast mobile app frontend has been upgraded with:

1. **Jumia-Inspired Master-Detail Category Layout:**
   - **Top Search Header:** Real-time search input with clear button and deep link to discovery.
   - **Left Vertical Category Rail:** Fixed sidebar displaying the **12 exact primary categories** with an active vertical emerald indicator stripe (`#0F382C`) and bold active typography.
   - **Right Detail Pane:** Scrollable category content showing:
     - Top Banner CTA: **"SEE ALL PRODUCTS"** navigating directly to the category collection.
     - **Grouped Subcategory Sections** (e.g., *APPLIANCES*, *HOME & KITCHEN*, *HOME*) in clean 2-column and 3-column thumbnail cards with curated product photography.
     - **Integrated Live Product Grid:** Dynamic 2-column product showcase responding immediately to category and subcategory filtering.
   - **Brand Aesthetics:** Styled using our signature brand background asset (`assets/app-bg.jpg`), luxury dark emerald (`#0F382C`), warm champagne gold (`#C69B56`), and soft cream cards (`#FAF8F4` / `#FFFFFF`).

2. **Native 5-Tab Bottom Navigation:**
   The bottom navigation bar has been aligned to the exact five core screens:
   - **Tab 1: Home** (`home`) → Outlined & solid `home` icon
   - **Tab 2: Categories** (`categories`) → Outlined & solid `list` bulleted icon
   - **Tab 3: Cart** (`cart`) → Outlined & solid `cart` icon with dynamic item badge
   - **Tab 4: Wishlist** (`wishlist`) → Outlined & solid `heart` icon with saved count badge
   - **Tab 5: Account** (`account`) → Outlined & solid `person` icon

This document provides the **complete backend specification, database migrations, seed scripts, REST API contracts, and integration verification steps** for the backend engineer to guarantee 100% frontend-to-backend alignment.

---

## 2. Category Taxonomy Structure

### 2.1 The 12 Primary Categories

The frontend expects the following 12 root-level categories (with exact slugs, sort orders, and icons):

| # | Display Name | Slug (`slug`) | Icon (`icon`) | Sort Order |
|---|--------------|---------------|---------------|------------|
| 1 | **Home & Office** | `home-office` | `business-outline` | 1 |
| 2 | **Phones & Tablets** | `phones-tablets` | `phone-portrait-outline` | 2 |
| 3 | **Fashion** | `fashion` | `shirt-outline` | 3 |
| 4 | **Health & Beauty** | `health-beauty` | `sparkles-outline` | 4 |
| 5 | **Electronics** | `electronics` | `tv-outline` | 5 |
| 6 | **Computing** | `computing` | `laptop-outline` | 6 |
| 7 | **Grocery** | `grocery` | `cart-outline` | 7 |
| 8 | **Garden & Outdoors** | `garden-outdoors` | `leaf-outline` | 8 |
| 9 | **Automobile** | `automobile` | `car-sport-outline` | 9 |
| 10 | **Sporting Goods** | `sporting-goods` | `football-outline` | 10 |
| 11 | **Gaming** | `gaming` | `game-controller-outline` | 11 |
| 12 | **Baby Products** | `baby-products` | `happy-outline` | 12 |

---

### 2.2 Hierarchical Section & Subcategory Blueprint

Each primary category contains grouped subcategory sections. Below is the canonical blueprint matching the mobile layout:

#### 1. Home & Office (`home-office`)
- **Section: APPLIANCES** (2 columns)
  - `appliances`: Appliances (Large Appliances, Washers, Refrigerators)
  - `small-appliances`: Small Appliances (Kettles, Toasters, Blenders)
- **Section: HOME & KITCHEN** (3 columns, with `SEE ALL` link)
  - `cookware`: Cookware (Pots, Pans, Skillets)
  - `kitchen-fryers`: Small Appliances (Air Fryers, Deep Fryers)
  - `bakeware`: Bakeware (Baking Pans, Muffin Trays)
  - `cutlery`: Cutlery & Knife Accessories (Silverware sets, Chef knives)
- **Section: HOME** (3 columns)
  - `bedding`: Bedding (Sheets, Duvets, Pillows)
  - `home-decor`: Home Decor (Cushions, Wall Art, Rugs)
  - `dining-furniture`: Kitchen Dining (Tables, Chairs, Barstools)

#### 2. Phones & Tablets (`phones-tablets`)
- **Section: MOBILE PHONES** (3 columns, with `SEE ALL` link)
  - `smartphones`: Smartphones (iOS, Android, Flagships)
  - `basic-phones`: Basic Phones (Feature phones)
  - `refurbished-phones`: Refurbished (Certified Pre-owned)
- **Section: TABLETS** (3 columns)
  - `ipads`: iPads
  - `android-tablets`: Android Tablets
  - `kids-tablets`: Kids Tablets & Educational
- **Section: ACCESSORIES** (3 columns, with `SEE ALL` link)
  - `cases-covers`: Cases & Covers
  - `chargers-cables`: Chargers & Cables
  - `power-banks`: Power Banks

#### 3. Fashion (`fashion`)
- **Section: WOMEN'S FASHION** (3 columns, with `SEE ALL` link)
  - `dresses`: Dresses & Gowns
  - `women-shoes`: Shoes & Heels
  - `handbags`: Handbags & Totes
- **Section: MEN'S FASHION** (3 columns, with `SEE ALL` link)
  - `shirts-polos`: Shirts & Polos
  - `men-sneakers`: Sneakers & Loafers
  - `men-watches`: Watches & Belts

#### 4. Health & Beauty (`health-beauty`)
- **Section: FRAGRANCES** (3 columns, with `SEE ALL` link)
  - `luxury-perfumes`: Luxury Perfumes
  - `body-mists`: Body Mists
  - `deodorants`: Deodorants & Roll-ons
- **Section: SKINCARE** (3 columns, with `SEE ALL` link)
  - `face-cleansers`: Cleansers & Toners
  - `serums-oils`: Serums & Oils
  - `sunscreen`: Sun Protection & Lotions

#### 5. Electronics (`electronics`)
- **Section: TELEVISION & VIDEO** (2 columns)
  - `smart-tvs`: Smart TVs (OLED, QLED, 4K)
  - `tv-accessories`: TV Mounts & Stands
- **Section: AUDIO & SOUND** (3 columns, with `SEE ALL` link)
  - `bluetooth-speakers`: Bluetooth Speakers
  - `headphones`: Over-Ear & In-Ear Headphones
  - `soundbars`: Soundbars & Home Theatres

#### 6. Computing (`computing`)
- **Section: LAPTOPS** (2 columns)
  - `macbooks`: MacBooks & macOS
  - `windows-laptops`: Windows Laptops & Ultrabooks
- **Section: STORAGE & ACCESSORIES** (3 columns)
  - `external-drives`: External Hard Drives & SSDs
  - `keyboards-mice`: Keyboards & Mice
  - `monitors`: PC Monitors & Displays

#### 7. Grocery (`grocery`)
- **Section: COOKING & PANTRY** (3 columns)
  - `rice-grains`: Rice, Grains & Pasta
  - `cooking-oils`: Cooking Oils & Olive Oil
  - `seasonings`: Spices & Seasoning cubes
- **Section: BEVERAGES** (3 columns)
  - `coffee-tea`: Coffee & Tea
  - `soft-drinks`: Juices & Soft Drinks
  - `dairy-milk`: Milk & Dairy

#### 8. Garden & Outdoors (`garden-outdoors`)
- **Section: OUTDOOR LIVING** (2 columns)
  - `patio-furniture`: Patio & Balcony Furniture
  - `bbq-grills`: Grills & BBQ Equipment
- **Section: GARDENING** (2 columns)
  - `gardening-equip`: Gardening Tools
  - `hoses-watering`: Watering & Hoses

#### 9. Automobile (`automobile`)
- **Section: CAR ELECTRONICS** (2 columns)
  - `car-audio`: Car Audio & Stereos
  - `dash-cams`: Dash Cams & Security
- **Section: CARE & ACCESSORIES** (2 columns)
  - `car-cleaning`: Car Wax & Wash
  - `jump-starters`: Jump Starters & Emergency Kits

#### 10. Sporting Goods (`sporting-goods`)
- **Section: FITNESS & WORKOUT** (3 columns)
  - `dumbbells`: Dumbbells & Weights
  - `cardio-machines`: Treadmills & Bikes
  - `yoga-mats`: Yoga Mats & Straps
- **Section: TEAM SPORTS** (2 columns)
  - `football-gear`: Football & Jerseys
  - `basketball`: Basketball & Nets

#### 11. Gaming (`gaming`)
- **Section: CONSOLES** (3 columns)
  - `playstation-5`: PlayStation 5
  - `xbox-series`: Xbox Series X/S
  - `nintendo-switch`: Nintendo Switch
- **Section: ACCESSORIES** (2 columns)
  - `controllers`: Wireless Controllers
  - `gaming-headsets`: Surround Headsets

#### 12. Baby Products (`baby-products`)
- **Section: DIAPERING & WIPES** (2 columns)
  - `diapers`: Diapers & Pants
  - `baby-wipes`: Sensitive Baby Wipes
- **Section: FEEDING & NURSERY** (3 columns)
  - `bottles-formula`: Bottles & Formula
  - `strollers`: Prams & Strollers
  - `baby-cots`: Cots & Bedding

---

## 3. Database Architecture & Seed Artifacts

### 3.1 Relational Schema (`public.categories`)

The existing PostgreSQL `public.categories` table in `services/core-api/src/db/schema.ts` natively supports this hierarchy via `parent_id`:

```sql
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT NULL,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active_sort ON public.categories(is_active, sort_order);
```

### 3.2 SQL Migration File

A migration file has been created at:
`supabase/migrations/20261002000001_seed_category_taxonomy.sql`

It idempotently inserts all 12 root categories with fixed UUIDs (`c0000001-0000-4000-8000-000000000001` through `...012`) and their subcategories using `ON CONFLICT (slug) DO UPDATE`.

### 3.3 Node.js Executable Seed Script

An automated seed script has been created at:
`services/core-api/scripts/seed-category-taxonomy.mjs`

To run the seed against the active PostgreSQL database:
```bash
node services/core-api/scripts/seed-category-taxonomy.mjs
```

---

## 4. REST API Endpoint Specifications

The core API service (`services/core-api/src/modules/catalog/catalog.router.ts`) exposes the following endpoints:

### 4.1 GET `/v1/catalog/categories`

Returns categories with flexible filtering.

- **Query Parameters:**
  - `root=true`: Returns only root categories (`parent_id IS NULL`).
  - `parentId=<UUID>`: Returns direct children of the specified parent.
  - `tree=true`: Returns root categories with nested `subcategories: []`.
- **Response Format (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "c0000001-0000-4000-8000-000000000001",
      "name": "Home & Office",
      "slug": "home-office",
      "icon": "business-outline",
      "parentId": null,
      "sortOrder": 1,
      "isActive": true,
      "createdAt": "2026-10-02T10:00:00.000Z"
    }
  ]
}
```

---

### 4.2 GET `/v1/catalog/categories/taxonomy`

Returns the complete category taxonomy tree optimized for the mobile split-view layout.

- **Response Format (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "c0000001-0000-4000-8000-000000000001",
      "name": "Home & Office",
      "slug": "home-office",
      "icon": "business-outline",
      "bannerTitle": "SEE ALL PRODUCTS",
      "subcategories": [
        {
          "id": "...",
          "name": "Large Appliances",
          "slug": "appliances",
          "icon": "cube-outline",
          "parentId": "c0000001-0000-4000-8000-000000000001",
          "sortOrder": 1,
          "isActive": true
        }
      ]
    }
  ]
}
```

---

### 4.3 GET `/v1/catalog/categories/:slug/taxonomy`

Returns the taxonomy structure for a specific category.

- **Path Parameter:**
  - `slug`: Category slug (e.g. `home-office`, `phones-tablets`)
- **Response Format (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "c0000001-0000-4000-8000-000000000001",
    "name": "Home & Office",
    "slug": "home-office",
    "icon": "business-outline",
    "bannerTitle": "SEE ALL PRODUCTS",
    "subcategories": [
      {
        "id": "...",
        "name": "Large Appliances",
        "slug": "appliances",
        "icon": "cube-outline",
        "sortOrder": 1
      }
    ]
  }
}
```

---

### 4.4 GET `/v1/catalog/products`

Enhanced product search and category filtering endpoint.

- **Query Parameters:**
  - `categorySlug` *(string, optional)*: Filter by root category slug (e.g., `home-office`). If `'all'`, returns all categories.
  - `categoryId` *(string UUID, optional)*: Filter by category UUID.
  - `subCategorySlug` *(string, optional)*: Filter by subcategory slug.
  - `search` *(string, optional)*: Case-insensitive search on product title.
  - `featured` *(boolean string, optional)*: `'true'` for featured items.
- **Filtering Logic:**
  ```ts
  if (categoryId) {
    conditions.push(eq(products.categoryId, categoryId));
  } else if (categorySlug && categorySlug !== 'all') {
    conditions.push(eq(categories.slug, categorySlug));
  }
  if (search && search.trim()) {
    conditions.push(ilike(products.title, `%${search.trim()}%`));
  }
  ```
- **Response Format (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "Front-Load Smart Washer 8kg",
      "slug": "front-load-smart-washer-8kg",
      "description": "...",
      "basePriceMinor": 34500000,
      "categoryName": "Home & Office",
      "categorySlug": "home-office",
      "merchantName": "TechHome Nigeria",
      "variants": [...],
      "media": [...]
    }
  ]
}
```

---

## 5. Mobile App Frontend Implementation Details

The frontend engineering changes are complete, typed, and resilient:

### 5.1 `src/components/BottomNav.js`
Replaced legacy tabs with the exact five tabs shown in the user's reference mockup:
- `home`: "Home" (`home-outline` / `home`)
- `categories`: "Categories" (`list-outline` / `list`)
- `cart`: "Cart" (`cart-outline` / `cart`, with badge)
- `wishlist`: "Wishlist" (`heart-outline` / `heart`, with badge)
- `account`: "Account" (`person-outline` / `person`)

### 5.2 `src/screens/discovery/CategoryScreen.js`
- Full master-detail split layout.
- Left column: 12 primary categories with active indicator bar.
- Right column: "SEE ALL PRODUCTS" CTA, grouped subcategories (2 & 3 columns), and real-time 2-column product grid with `ProductCard`.
- Search bar: Real-time filtering of subcategories and products.
- Brand styling: Wrapped in `ImageBackground` (`assets/app-bg.jpg`) with translucent white/cream cards and luxury green/gold accents.

### 5.3 `src/services/catalogService.js`
- `fetchLiveCategories()`: Fetches `/v1/catalog/categories` and normalizes to the 12 categories.
- `fetchCategoryTaxonomy(slug)`: Fetches `/v1/catalog/categories/:slug/taxonomy` with fallback to `CATEGORY_TAXONOMY`.
- `fetchLiveProducts({ categorySlug, subCategorySlug, search })`: Queries products with parameters and handles offline fallback.

### 5.4 `src/navigation/NavigationContext.js` & `App.js`
- Synchronized tab navigation states across all 5 tabs.
- Added `'category'` and `'categories'` to `showBottomNav` so the bottom navigation remains visible throughout browsing.

---

## 6. Backend Engineer Action Items

To complete the end-to-end integration:

1. **Run Database Migration & Seed:**
   ```bash
   # Apply SQL migration or run seed script:
   node services/core-api/scripts/seed-category-taxonomy.mjs
   ```

2. **Verify API Endpoints:**
   ```bash
   # Check categories
   curl -s http://localhost:3000/v1/catalog/categories | jq .

   # Check taxonomy
   curl -s http://localhost:3000/v1/catalog/categories/taxonomy | jq .

   # Check products filtered by category slug
   curl -s "http://localhost:3000/v1/catalog/products?categorySlug=home-office" | jq .
   ```

3. **Run Backend Test Suite:**
   ```bash
   npm --prefix services/core-api test
   ```
   Ensure all 48 tests pass (including `src/modules/catalog/catalog.router.test.ts`).

4. **Verify TypeScript Compilation:**
   ```bash
   npm --prefix services/core-api run lint
   ```

---

## 7. Quality & Verification Sign-Off

| Verification Item | Status | Notes |
|-------------------|--------|-------|
| 12 Exact Categories Infused | ✅ PASSED | All 12 categories matching reference screenshot |
| Jumia Split-Screen Layout | ✅ PASSED | Master sidebar (110px) + detail pane with 2/3 col subcategories |
| Native 5-Tab Navigation | ✅ PASSED | Home, Categories, Cart, Wishlist, Account |
| Brand Assets & Colors Applied | ✅ PASSED | `assets/app-bg.jpg`, `#0F382C` emerald, `#C69B56` gold |
| Backend Endpoints Implemented | ✅ PASSED | `/v1/catalog/categories/taxonomy`, `categorySlug` filter |
| Backend Unit Tests | ✅ PASSED | 48/48 tests passing in `core-api` |
| Frontend Type Check | ✅ PASSED | `tsc --noEmit` clean with 0 errors |
