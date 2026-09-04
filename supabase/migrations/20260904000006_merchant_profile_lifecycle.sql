-- Merchant store-profile lifecycle, private courier pickup metadata, and
-- server-side drafts. Legal-identity data intentionally remains in
-- merchant_verifications rather than the public merchant record.

DO $$ BEGIN
    CREATE TYPE public.merchant_registration_state_type AS ENUM (
        'not_registered',
        'in_review',
        'registered'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.merchants
    ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT,
    ADD COLUMN IF NOT EXISTS dispatch_contact_name TEXT,
    ADD COLUMN IF NOT EXISTS dispatch_contact_phone TEXT,
    ADD COLUMN IF NOT EXISTS fulfillment_sla TEXT NOT NULL DEFAULT 'same_day',
    ADD COLUMN IF NOT EXISTS vacation_mode BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS registration_state public.merchant_registration_state_type
        NOT NULL DEFAULT 'not_registered';

-- Existing active merchants predate the explicit registration lifecycle and
-- have already passed the platform's active-status gate.
UPDATE public.merchants
SET registration_state = 'registered'
WHERE status = 'active' AND registration_state = 'not_registered';

ALTER TABLE public.merchants
    DROP CONSTRAINT IF EXISTS merchants_fulfillment_sla_check,
    ADD CONSTRAINT merchants_fulfillment_sla_check
        CHECK (fulfillment_sla IN ('same_day', 'next_day', '48_hours'));

ALTER TABLE public.merchant_verifications
    ADD COLUMN IF NOT EXISTS director_nin_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS director_nin_last4 TEXT;

ALTER TABLE public.merchant_verifications
    DROP CONSTRAINT IF EXISTS merchant_verifications_director_nin_last4_check,
    ADD CONSTRAINT merchant_verifications_director_nin_last4_check
        CHECK (director_nin_last4 IS NULL OR director_nin_last4 ~ '^[0-9]{4}$');

CREATE TABLE IF NOT EXISTS public.merchant_profile_drafts (
    merchant_id UUID PRIMARY KEY REFERENCES public.merchants(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- KYC evidence is uploaded with short-lived signed URLs issued by the Core API.
-- The bucket is private; `*_document_url` remains a legacy column name but now
-- stores a bucket-relative object path, never a public URL.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'merchant-kyc',
    'merchant-kyc',
    FALSE,
    10485760,
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE INDEX IF NOT EXISTS merchants_registration_state_idx
    ON public.merchants (registration_state);
CREATE INDEX IF NOT EXISTS merchants_checkout_eligibility_idx
    ON public.merchants (status, registration_state, vacation_mode);

DROP TRIGGER IF EXISTS set_updated_at_merchant_profile_drafts ON public.merchant_profile_drafts;
CREATE TRIGGER set_updated_at_merchant_profile_drafts
    BEFORE UPDATE ON public.merchant_profile_drafts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- The Core API is the only supported merchant-data boundary. A table-level
-- public policy would expose operational contacts and every future column.
DROP POLICY IF EXISTS "Public can view active merchants" ON public.merchants;
ALTER TABLE public.merchant_profile_drafts ENABLE ROW LEVEL SECURITY;
