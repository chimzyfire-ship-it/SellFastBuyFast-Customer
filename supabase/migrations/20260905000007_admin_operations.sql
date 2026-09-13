-- Server-owned operations metadata. No client role grants or financial shortcuts.
CREATE TABLE public.admin_customer_controls (
  id uuid PRIMARY KEY REFERENCES public.profiles(id),
  restricted boolean NOT NULL DEFAULT false,
  deletion_requested_at timestamptz,
  privacy_review_started_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.admin_staff_access (
  id uuid PRIMARY KEY REFERENCES public.profiles(id),
  status text NOT NULL CHECK (status IN ('active','revoked')),
  valid_after timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email = lower(trim(email))),
  roles text[] NOT NULL CHECK (cardinality(roles)>0 AND roles <@ ARRAY['operations_admin','security_admin','support_agent','catalogue_moderator','finance_reviewer']::text[]),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','accepted','revoked','expired')),
  invited_by uuid NOT NULL REFERENCES public.profiles(id),
  accepted_by uuid REFERENCES public.profiles(id),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_invitation_open_email ON public.admin_invitations(email) WHERE status='invited';
CREATE TABLE public.admin_case_metadata (
  section text NOT NULL, resource_id uuid NOT NULL,
  assigned_to uuid REFERENCES public.profiles(id), priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','high','urgent')),
  due_at timestamptz, escalated_at timestamptz,
  PRIMARY KEY(section,resource_id)
);
CREATE TABLE public.admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), section text NOT NULL, resource_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES public.profiles(id), note text NOT NULL CHECK(length(trim(note)) BETWEEN 3 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_notes_record ON public.admin_notes(section,resource_id,created_at);
CREATE TABLE public.admin_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
  placement text NOT NULL CHECK(placement IN ('home_hero','home_collection','category_feature')),
  target_type text NOT NULL CHECK(target_type IN ('category','product','merchant')), target_id uuid NOT NULL,
  image_url text NOT NULL, alt_text text NOT NULL, priority integer NOT NULL DEFAULT 0 CHECK(priority BETWEEN 0 AND 100),
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL CHECK(ends_at>starts_at),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','published','archived')),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_campaign_schedule ON public.admin_campaigns(status,starts_at,ends_at);
CREATE TABLE public.admin_refund_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id),
  return_id uuid REFERENCES public.return_requests(id), dispute_id uuid REFERENCES public.disputes(id),
  amount_minor bigint NOT NULL CHECK(amount_minor>0), reason text NOT NULL,
  status text NOT NULL DEFAULT 'review_required' CHECK(status IN ('review_required','approved','processed')),
  requested_by uuid REFERENCES public.profiles(id), reviewed_by uuid REFERENCES public.profiles(id),
  refund_id uuid UNIQUE REFERENCES public.refunds(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(return_id IS NOT NULL OR dispute_id IS NOT NULL)
);
CREATE UNIQUE INDEX admin_refund_review_order ON public.admin_refund_reviews(order_id) WHERE status IN ('review_required','approved');
CREATE TABLE public.admin_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider_event_id uuid UNIQUE REFERENCES public.provider_events(id),
  provider_reference text NOT NULL, kind text NOT NULL CHECK(kind IN ('payment','payout')),
  order_id uuid REFERENCES public.orders(id), payout_id uuid REFERENCES public.payouts(id),
  provider_amount_minor bigint, ledger_amount_minor bigint, reason text NOT NULL,
  status text NOT NULL DEFAULT 'unmatched' CHECK(status IN ('unmatched','investigating','recheck_pending','matched')),
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_reconciliation_queue ON public.admin_reconciliation(status,updated_at,id);
ALTER TABLE public.idempotency_keys ADD COLUMN request_hash text;
ALTER TABLE public.disputes ADD COLUMN return_id uuid REFERENCES public.return_requests(id);
CREATE UNIQUE INDEX disputes_open_order ON public.disputes(order_id) WHERE status IN ('open','under_review');
CREATE INDEX audit_record_history ON public.audit_events(resource_type,resource_id,created_at,id);

CREATE FUNCTION public.admin_bump_version() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.admin_version := OLD.admin_version+1; NEW.updated_at := clock_timestamp(); RETURN NEW; END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','merchants','products','orders','return_requests','disputes','support_tickets','refunds','payouts','admin_invitations','admin_campaigns','admin_refund_reviews','admin_reconciliation'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN admin_version bigint NOT NULL DEFAULT 1',t);
    EXECUTE format('CREATE TRIGGER admin_version_update BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.admin_bump_version()',t);
    EXECUTE format('CREATE INDEX %I ON public.%I(updated_at,id)',t||'_admin_queue',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['admin_customer_controls','admin_staff_access','admin_invitations','admin_case_metadata','admin_notes','admin_campaigns','admin_refund_reviews','admin_reconciliation'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  END LOOP;
END $$;
CREATE FUNCTION public.admin_immutable_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Operational history is append-only' USING ERRCODE='42501'; END $$;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON public.audit_events FOR EACH ROW EXECUTE FUNCTION public.admin_immutable_event();
CREATE TRIGGER notes_immutable BEFORE UPDATE OR DELETE ON public.admin_notes FOR EACH ROW EXECUTE FUNCTION public.admin_immutable_event();
