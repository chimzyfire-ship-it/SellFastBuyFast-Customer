-- ============================================================================
-- Vendor operations handoff: persisted buyer-protection window and escrow COA.
-- This migration is additive and also makes already-delivered orders eligible
-- for the completion worker after their original seven-day window.
-- ============================================================================

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS return_window_ends_at TIMESTAMPTZ;

UPDATE public.orders o
SET return_window_ends_at = s.delivered_at + INTERVAL '7 days'
FROM public.shipments s
WHERE s.order_id = o.id
  AND o.status = 'delivered'
  AND o.return_window_ends_at IS NULL
  AND s.delivered_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_completion_sweep_idx
    ON public.orders (return_window_ends_at)
    WHERE status = 'delivered';

CREATE INDEX IF NOT EXISTS return_requests_open_order_idx
    ON public.return_requests (order_id)
    WHERE status NOT IN ('rejected', 'completed');

INSERT INTO public.ledger_accounts (account_code, account_name, account_type, currency)
VALUES
    ('2001', 'Platform Escrow Holding', 'liability', 'NGN'),
    ('4010', 'Platform Delivery Fee Revenue', 'revenue', 'NGN')
ON CONFLICT (account_code) DO NOTHING;
