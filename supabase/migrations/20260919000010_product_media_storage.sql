-- Product Studio obtains merchant-scoped signed upload URLs from Core API.
-- Public object reads support admin previews and published shopper cards;
-- listing visibility remains controlled by product moderation in the catalogue.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-media', 'product-media', true, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- No client INSERT/UPDATE policy: only server-authorized signed uploads.
