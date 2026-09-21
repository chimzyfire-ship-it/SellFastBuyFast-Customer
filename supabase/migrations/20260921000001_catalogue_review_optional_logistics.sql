-- Listing accuracy is decided by moderation. Preserve missing logistics as
-- missing instead of inventing weights or dimensions during submission.
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_weight_kg_check,
  ALTER COLUMN weight_kg DROP NOT NULL,
  ALTER COLUMN weight_kg DROP DEFAULT,
  ALTER COLUMN dimensions_cm SET DEFAULT '';
