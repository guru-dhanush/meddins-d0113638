
-- Add geography column
ALTER TABLE public.provider_profiles 
ADD COLUMN IF NOT EXISTS location extensions.geography(Point, 4326);

-- Trigger function to sync location from lat/lng
CREATE OR REPLACE FUNCTION public.sync_provider_location()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := extensions.ST_SetSRID(extensions.ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::extensions.geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_sync_provider_location ON public.provider_profiles;
CREATE TRIGGER trg_sync_provider_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.provider_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_provider_location();

-- Backfill existing rows
UPDATE public.provider_profiles
SET location = extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)::extensions.geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_provider_location ON public.provider_profiles USING GIST(location);

-- nearby_providers RPC function
CREATE OR REPLACE FUNCTION public.nearby_providers(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  provider_type text,
  bio text,
  experience_years integer,
  hourly_rate numeric,
  avg_rating numeric,
  total_reviews integer,
  is_available boolean,
  specializations text[],
  city text,
  languages text[],
  accepting_new_patients boolean,
  consultation_fee numeric,
  home_visit_fee numeric,
  latitude double precision,
  longitude double precision,
  full_name text,
  avatar_url text,
  distance_km double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT 
    pp.id,
    pp.user_id,
    pp.provider_type::text,
    pp.bio,
    pp.experience_years,
    pp.hourly_rate,
    pp.avg_rating,
    pp.total_reviews,
    pp.is_available,
    pp.specializations,
    pp.city,
    pp.languages,
    pp.accepting_new_patients,
    pp.consultation_fee,
    pp.home_visit_fee,
    pp.latitude,
    pp.longitude,
    p.full_name,
    p.avatar_url,
    extensions.ST_Distance(
      pp.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(user_lng, user_lat), 4326)::extensions.geography
    ) / 1000.0 AS distance_km
  FROM provider_profiles pp
  JOIN profiles p ON p.user_id = pp.user_id
  WHERE pp.is_available = true
    AND pp.location IS NOT NULL
    AND extensions.ST_DWithin(
      pp.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(user_lng, user_lat), 4326)::extensions.geography,
      radius_km * 1000
    )
  ORDER BY distance_km;
$$;
