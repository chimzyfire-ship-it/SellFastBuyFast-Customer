-- ============================================================================
-- Pro Product Studio and Shopper Simulator: taxonomy, shipping metadata,
-- multi-variant options, richer moderation state, and discovery indexes.
-- ============================================================================

ALTER TYPE public.product_status_type ADD VALUE IF NOT EXISTS 'rejected' AFTER 'published';

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS brand TEXT NOT NULL DEFAULT 'SellFast Signature',
    ADD COLUMN IF NOT EXISTS condition TEXT NOT NULL DEFAULT 'brand_new',
    ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6, 2) NOT NULL DEFAULT 0.85,
    ADD COLUMN IF NOT EXISTS dimensions_cm TEXT NOT NULL DEFAULT '33 × 21 × 12',
    ADD COLUMN IF NOT EXISTS return_policy TEXT NOT NULL DEFAULT '7_day_escrow',
    ADD COLUMN IF NOT EXISTS warranty TEXT NOT NULL DEFAULT '30_days',
    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.profiles(id),
    ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS quality_score INTEGER NOT NULL DEFAULT 100;

ALTER TABLE public.products
    DROP CONSTRAINT IF EXISTS products_condition_check,
    ADD CONSTRAINT products_condition_check
        CHECK (condition IN ('brand_new', 'open_box', 'refurbished')),
    DROP CONSTRAINT IF EXISTS products_weight_kg_check,
    ADD CONSTRAINT products_weight_kg_check CHECK (weight_kg > 0),
    DROP CONSTRAINT IF EXISTS products_return_policy_check,
    ADD CONSTRAINT products_return_policy_check
        CHECK (return_policy IN ('7_day_escrow', 'inspection_only')),
    DROP CONSTRAINT IF EXISTS products_warranty_check,
    ADD CONSTRAINT products_warranty_check
        CHECK (warranty IN ('no_warranty', '30_days', '6_months', '1_year')),
    DROP CONSTRAINT IF EXISTS products_quality_score_check,
    ADD CONSTRAINT products_quality_score_check CHECK (quality_score BETWEEN 0 AND 100);

ALTER TABLE public.product_variants
    ADD COLUMN IF NOT EXISTS option_size TEXT,
    ADD COLUMN IF NOT EXISTS option_color TEXT;

ALTER TABLE public.inventory_levels
    ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 3;
ALTER TABLE public.inventory_levels
    DROP CONSTRAINT IF EXISTS inventory_levels_low_stock_threshold_check,
    ADD CONSTRAINT inventory_levels_low_stock_threshold_check CHECK (low_stock_threshold >= 0);

-- New merchants inherit the same 5% platform commission used by checkout.
ALTER TABLE public.merchants
    ALTER COLUMN commission_rate_bps SET DEFAULT 500;

CREATE INDEX IF NOT EXISTS products_merchant_status_idx
    ON public.products (merchant_id, status);
CREATE INDEX IF NOT EXISTS products_category_published_idx
    ON public.products (category_id) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS products_search_idx
    ON public.products USING GIN (
      to_tsvector('english',
        COALESCE(title, '') || ' ' || COALESCE(brand, '') || ' ' || COALESCE(description, '')
      )
    );
CREATE INDEX IF NOT EXISTS product_variants_product_idx
    ON public.product_variants (product_id);
CREATE INDEX IF NOT EXISTS product_media_product_sort_idx
    ON public.product_media (product_id, sort_order ASC);
