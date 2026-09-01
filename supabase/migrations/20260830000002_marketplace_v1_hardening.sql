-- ============================================================================
-- Migration 2: Marketplace V1 Hardening
-- Fulfilment, returns, disputes, support, refunds, notifications,
-- outbox, idempotency, delivery zones, payout ledger account.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Enums
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE public.shipment_status_type AS ENUM (
        'pending', 'packed', 'in_transit', 'delivered', 'return_in_transit'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.return_status_type AS ENUM (
        'requested', 'approved', 'rejected', 'received', 'refund_initiated', 'completed'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.dispute_status_type AS ENUM (
        'open', 'under_review', 'resolved_buyer', 'resolved_merchant', 'closed'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.ticket_status_type AS ENUM (
        'open', 'pending', 'resolved', 'closed'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.refund_status_type AS ENUM (
        'initialized', 'successful', 'failed'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.outbox_status_type AS ENUM (
        'pending', 'processing', 'processed', 'failed'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE public.outbox_status_type ADD VALUE IF NOT EXISTS 'processing' AFTER 'pending';

ALTER TYPE public.payout_status_type ADD VALUE IF NOT EXISTS 'rejected' AFTER 'approved';

-- ----------------------------------------------------------------------------
-- 2. Fulfilment Tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    carrier TEXT NOT NULL DEFAULT 'platform_default',
    tracking_code TEXT,
    status public.shipment_status_type NOT NULL DEFAULT 'pending',
    pickup_evidence_url TEXT,
    delivery_evidence_url TEXT,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.shipment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
    status public.shipment_status_type NOT NULL,
    note TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state TEXT NOT NULL,
    lga TEXT NOT NULL,
    fee_minor BIGINT NOT NULL CHECK (fee_minor >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS delivery_zones_state_lga_idx
    ON public.delivery_zones (state, lga);

-- ----------------------------------------------------------------------------
-- 3. Returns, Disputes, Support
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    evidence_url TEXT,
    status public.return_status_type NOT NULL DEFAULT 'requested',
    decided_by UUID REFERENCES public.profiles(id),
    decision_note TEXT,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    status public.dispute_status_type NOT NULL DEFAULT 'open',
    resolution_note TEXT,
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    body TEXT,
    status public.ticket_status_type NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 4. Refunds
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_attempt_id UUID NOT NULL REFERENCES public.payment_attempts(id) ON DELETE RESTRICT,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency TEXT NOT NULL DEFAULT 'NGN',
    reason TEXT NOT NULL,
    status public.refund_status_type NOT NULL DEFAULT 'initialized',
    provider_ref_code TEXT,
    initiated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 5. Notifications
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 6. Outbox & Idempotency
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status public.outbox_status_type NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_error TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.outbox_events
    ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    key TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    response_status INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 7. Inventory Integrity Constraints
-- ----------------------------------------------------------------------------

ALTER TABLE public.inventory_levels
    DROP CONSTRAINT IF EXISTS inventory_levels_non_negative,
    ADD CONSTRAINT inventory_levels_non_negative
        CHECK (available_quantity >= 0 AND reserved_quantity >= 0);

ALTER TABLE public.inventory_reservations
    DROP CONSTRAINT IF EXISTS inventory_reservations_order_id_fkey,
    ADD CONSTRAINT inventory_reservations_order_id_fkey
        FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.payouts
    ADD COLUMN IF NOT EXISTS provider_reference TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS payouts_provider_reference_idx
    ON public.payouts (provider_reference)
    WHERE provider_reference IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 8. Ledger: Payout In-Transit Account
-- ----------------------------------------------------------------------------

INSERT INTO public.ledger_accounts (account_code, account_name, account_type, currency)
VALUES
    ('2020', 'Merchant Payout In Transit', 'liability', 'NGN'),
    ('2030', 'Customer Refunds Payable', 'liability', 'NGN')
ON CONFLICT (account_code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. updated_at Maintenance Trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'shipments', 'delivery_zones', 'return_requests', 'disputes',
        'support_tickets', 'refunds'
    ]
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at_%1$s ON public.%1$I', t);
        EXECUTE format(
            'CREATE TRIGGER set_updated_at_%1$s BEFORE UPDATE ON public.%1$I
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 10. Row Level Security
-- ----------------------------------------------------------------------------

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own order shipments" ON public.shipments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.orders o
                WHERE o.id = shipments.order_id AND o.buyer_id = auth.uid())
    );

CREATE POLICY "Buyers can view own shipment events" ON public.shipment_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.shipments s
                JOIN public.orders o ON o.id = s.order_id
                WHERE s.id = shipment_events.shipment_id AND o.buyer_id = auth.uid())
    );

CREATE POLICY "Public can view active delivery zones" ON public.delivery_zones
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Buyers can view own returns" ON public.return_requests
    FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Parties can view own disputes" ON public.disputes
    FOR SELECT USING (
        auth.uid() = opened_by OR EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = disputes.order_id AND o.buyer_id = auth.uid())
    );

CREATE POLICY "Users can view own tickets" ON public.support_tickets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Buyers can view own order refunds" ON public.refunds
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.orders o
                WHERE o.id = refunds.order_id AND o.buyer_id = auth.uid())
    );

CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications read" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);
