-- Create storage bucket for AI-generated content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-generations',
  'ai-generations',
  true,
  104857600, -- 100MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];

-- Allow public read access to the bucket
DROP POLICY IF EXISTS "Public read access for ai-generations" ON storage.objects;
CREATE POLICY "Public read access for ai-generations"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-generations');

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload to ai-generations" ON storage.objects;
CREATE POLICY "Authenticated users can upload to ai-generations"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ai-generations' AND auth.role() = 'authenticated');

-- Allow service role to upload (for API routes)
DROP POLICY IF EXISTS "Service role can upload to ai-generations" ON storage.objects;
CREATE POLICY "Service role can upload to ai-generations"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ai-generations');

-- Allow users to delete their own files
DROP POLICY IF EXISTS "Users can delete own files in ai-generations" ON storage.objects;
CREATE POLICY "Users can delete own files in ai-generations"
ON storage.objects FOR DELETE
USING (bucket_id = 'ai-generations' AND auth.uid()::text = (storage.foldername(name))[1]);
