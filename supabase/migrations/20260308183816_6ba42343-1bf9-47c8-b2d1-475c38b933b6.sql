
-- 1. Add consultation_mode to availability
ALTER TABLE public.availability ADD COLUMN consultation_mode text NOT NULL DEFAULT 'in_clinic';

-- 2. Create service_pricing table for per-mode pricing
CREATE TABLE public.service_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  consultation_mode text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(service_id, consultation_mode)
);

ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can view service pricing
CREATE POLICY "Anyone can view service pricing"
  ON public.service_pricing FOR SELECT
  USING (true);

-- RLS: Providers can manage own service pricing
CREATE POLICY "Providers can manage own service pricing"
  ON public.service_pricing FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.services s
    JOIN public.provider_profiles pp ON pp.id = s.provider_id
    WHERE s.id = service_pricing.service_id AND pp.user_id = auth.uid()
  ));

CREATE POLICY "Providers can update own service pricing"
  ON public.service_pricing FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.services s
    JOIN public.provider_profiles pp ON pp.id = s.provider_id
    WHERE s.id = service_pricing.service_id AND pp.user_id = auth.uid()
  ));

CREATE POLICY "Providers can delete own service pricing"
  ON public.service_pricing FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.services s
    JOIN public.provider_profiles pp ON pp.id = s.provider_id
    WHERE s.id = service_pricing.service_id AND pp.user_id = auth.uid()
  ));

-- 3. Add service_id and consultation_mode to bookings
ALTER TABLE public.bookings ADD COLUMN service_id uuid REFERENCES public.services(id);
ALTER TABLE public.bookings ADD COLUMN consultation_mode text;

-- 4. Add consultation_modes to services (which modes this service is available in)
ALTER TABLE public.services ADD COLUMN consultation_modes text[] DEFAULT '{}';
