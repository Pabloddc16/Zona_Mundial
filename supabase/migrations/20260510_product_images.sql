-- Add image_url to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;

-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY IF NOT EXISTS "auth upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Allow public read
CREATE POLICY IF NOT EXISTS "public read product images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'product-images');

-- Allow authenticated users to update/delete their uploads
CREATE POLICY IF NOT EXISTS "auth update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY IF NOT EXISTS "auth delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images');
