-- Storage bucket for Mi Panini custom selfies.
--
-- Bucket is public so admin can render print artwork directly via URL.
-- Per-folder RLS on storage.objects restricts users to their own UUID folder.
-- Replicate AI also fetches via public URL — no signed URL plumbing needed.

INSERT INTO storage.buckets (id, name, public)
VALUES ('panini-customs', 'panini-customs', true)
ON CONFLICT (id) DO NOTHING;

-- INSERT policy — user can upload to their own folder only
DROP POLICY IF EXISTS "User uploads own panini folder" ON storage.objects;
CREATE POLICY "User uploads own panini folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'panini-customs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- SELECT policy — user reads own folder; admin reads all via service_role bypass
DROP POLICY IF EXISTS "User reads own panini folder" ON storage.objects;
CREATE POLICY "User reads own panini folder"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'panini-customs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- UPDATE policy — user can overwrite their own files (upsert true in upload)
DROP POLICY IF EXISTS "User updates own panini folder" ON storage.objects;
CREATE POLICY "User updates own panini folder"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'panini-customs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Public bucket also needs anon read so unauthenticated viewers (the print
-- screen embedded in admin, Replicate's fetcher) can pull the image URL.
DROP POLICY IF EXISTS "Public read panini-customs" ON storage.objects;
CREATE POLICY "Public read panini-customs"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'panini-customs');
