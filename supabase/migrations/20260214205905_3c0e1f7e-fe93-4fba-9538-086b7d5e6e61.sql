
-- Add richer profile fields to provider_profiles
ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS education jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS work_experience jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS specializations text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS consultation_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS home_visit_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS license_number text,
ADD COLUMN IF NOT EXISTS license_expiry date,
ADD COLUMN IF NOT EXISTS accepting_new_patients boolean DEFAULT true;
