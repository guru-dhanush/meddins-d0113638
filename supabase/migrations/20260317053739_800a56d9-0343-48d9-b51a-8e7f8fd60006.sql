-- Add missing columns to existing tables

-- profiles: add banner_url
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- provider_profiles: add currency
ALTER TABLE public.provider_profiles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- availability: add consultation_mode
ALTER TABLE public.availability ADD COLUMN IF NOT EXISTS consultation_mode TEXT;

-- services: add consultation_mode, consultation_modes
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS consultation_mode TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS consultation_modes TEXT[] DEFAULT '{}';

-- health_records: add record_date, folder_id
ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS record_date DATE DEFAULT CURRENT_DATE;

-- User settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_visibility TEXT DEFAULT 'public',
  show_online_status BOOLEAN DEFAULT true,
  connection_requests TEXT DEFAULT 'everyone',
  message_privacy TEXT DEFAULT 'everyone',
  hide_from_search BOOLEAN DEFAULT false,
  connection_visibility TEXT DEFAULT 'public',
  default_consultation_mode TEXT DEFAULT 'online',
  booking_auto_confirm BOOLEAN DEFAULT false,
  booking_buffer_minutes INTEGER DEFAULT 0,
  cancellation_policy TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Health record folders table
CREATE TABLE IF NOT EXISTS public.health_record_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.health_record_folders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Users can view own folders" ON public.health_record_folders FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create own folders" ON public.health_record_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update own folders" ON public.health_record_folders FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete own folders" ON public.health_record_folders FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add folder_id FK to health_records
ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.health_record_folders(id) ON DELETE SET NULL;

-- Follow-ups table
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  follow_up_date DATE NOT NULL,
  reason TEXT,
  auto_booked BOOLEAN DEFAULT false,
  new_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Patients can view own follow ups" ON public.follow_ups FOR SELECT USING (auth.uid() = patient_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Providers can view their follow ups" ON public.follow_ups FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = follow_ups.provider_id AND user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Providers can create follow ups" ON public.follow_ups FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = provider_id AND user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service pricing table (for multi-mode pricing)
CREATE TABLE IF NOT EXISTS public.service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  consultation_mode TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_id, consultation_mode)
);
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Anyone can view service pricing" ON public.service_pricing FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Providers can manage own service pricing" ON public.service_pricing FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.services s
    JOIN public.provider_profiles pp ON pp.id = s.provider_id
    WHERE s.id = service_id AND pp.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';