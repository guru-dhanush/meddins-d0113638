
-- Add banner_url to profiles
ALTER TABLE public.profiles ADD COLUMN banner_url text DEFAULT NULL;

-- Create profile-media storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-media', 'profile-media', true);

-- Storage policies for profile-media
CREATE POLICY "Authenticated users can upload profile media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-media');

CREATE POLICY "Anyone can view profile media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-media');

CREATE POLICY "Users can update own profile media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own profile media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);
