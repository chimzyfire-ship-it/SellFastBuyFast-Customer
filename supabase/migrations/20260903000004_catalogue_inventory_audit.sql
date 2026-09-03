-- ============================================================================
-- Catalogue/Product Studio handoff: immutable inventory movements, moderation
-- history, and per-product SKU uniqueness.
-- ============================================================================

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS compare_price_minor BIGINT;

ALTER TABLE public.products
    DROP CONSTRAINT IF EXISTS products_compare_price_minor_check;
ALTER TABLE public.products
    ADD CONSTRAINT products_compare_price_minor_check
    CHECK (compare_price_minor IS NULL OR compare_price_minor > base_price_minor);

ALTER TABLE public.product_variants
    DROP CONSTRAINT IF EXISTS product_variants_sku_key;
ALTER TABLE public.product_variants
    DROP CONSTRAINT IF EXISTS product_variants_sku_unique;
DROP INDEX IF EXISTS public.product_variants_sku_unique;

CREATE UNIQUE INDEX IF NOT EXISTS product_variants_product_sku_unique
    ON public.product_variants (product_id, sku)
    WHERE sku IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    delta INTEGER NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'merchant_set',
        'checkout_reserve',
        'checkout_release',
        'order_fulfilled',
        'return_restock',
        'admin_adjustment'
    )),
    reference_id TEXT,
    actor_id UUID REFERENCES public.profiles(id),
    note TEXT,
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS inventory_transactions_variant_created_idx
    ON public.inventory_transactions (variant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.product_moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN (
        'submitted',
        'published',
        'rejected',
        'reapproval_required'
    )),
    note TEXT,
    actor_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS product_moderation_logs_product_created_idx
    ON public.product_moderation_logs (product_id, created_at DESC);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_moderation_logs ENABLE ROW LEVEL SECURITY;
