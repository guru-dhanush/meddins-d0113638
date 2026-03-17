
-- Add storage RLS policies for community-media bucket
CREATE POLICY "Authenticated users can upload community media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'community-media');

CREATE POLICY "Anyone can view community media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-media');

CREATE POLICY "Users can update own community media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own community media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text);
