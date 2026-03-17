
-- 1. Add 'member' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'member';

-- 2. Add verification columns to provider_profiles
ALTER TABLE public.provider_profiles 
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS consultation_modes text[],
  ADD COLUMN IF NOT EXISTS verification_document_url text,
  ADD COLUMN IF NOT EXISTS verification_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS booking_mode text NOT NULL DEFAULT 'public';

-- 3. Allow users to update their own role (needed for member -> provider upgrade)
CREATE POLICY "Users can update own role"
  ON public.user_roles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Create provider-documents storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-documents', 'provider-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies for provider-documents
CREATE POLICY "Authenticated users can upload provider documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'provider-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own provider documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'provider-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own provider documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'provider-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
