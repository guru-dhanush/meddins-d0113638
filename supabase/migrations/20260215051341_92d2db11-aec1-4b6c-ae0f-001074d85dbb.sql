
-- Add new columns to organizations table
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS established_year integer,
  ADD COLUMN IF NOT EXISTS specialties text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS operating_hours text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS social_facebook text,
  ADD COLUMN IF NOT EXISTS social_instagram text,
  ADD COLUMN IF NOT EXISTS social_twitter text,
  ADD COLUMN IF NOT EXISTS social_linkedin text;

-- Create org-assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-assets', 'org-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for org-assets
CREATE POLICY "Anyone can view org assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-assets');

-- Org owners can upload their own assets
CREATE POLICY "Org owners can upload assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'org-assets'
  AND EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id::text = (storage.foldername(name))[1]
    AND owner_id = auth.uid()
  )
);

-- Org owners can update their own assets
CREATE POLICY "Org owners can update assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'org-assets'
  AND EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id::text = (storage.foldername(name))[1]
    AND owner_id = auth.uid()
  )
);

-- Org owners can delete their own assets
CREATE POLICY "Org owners can delete assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'org-assets'
  AND EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id::text = (storage.foldername(name))[1]
    AND owner_id = auth.uid()
  )
);
