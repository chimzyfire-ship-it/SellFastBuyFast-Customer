-- Durable leases let the scheduled HTTP runner and a dedicated worker coexist.
CREATE TABLE public.operations_runtime (
  name text PRIMARY KEY,
  lease_token uuid,
  lease_until timestamptz NOT NULL DEFAULT to_timestamp(0),
  last_started_at timestamptz,
  last_succeeded_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operations_runtime ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operations_runtime FROM anon, authenticated;
GRANT ALL ON public.operations_runtime TO service_role;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('return-evidence','return-evidence',false,10485760,ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
       ('shipment-evidence','shipment-evidence',false,10485760,ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
