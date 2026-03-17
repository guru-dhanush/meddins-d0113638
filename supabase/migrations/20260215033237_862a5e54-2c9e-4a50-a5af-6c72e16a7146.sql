
-- Create requirements table for patient job postings
CREATE TABLE public.requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  provider_type public.provider_type NOT NULL,
  location text,
  duration_type text NOT NULL DEFAULT 'one-time',
  budget_range text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create requirement_responses table
CREATE TABLE public.requirement_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_responses ENABLE ROW LEVEL SECURITY;

-- Requirements RLS policies
CREATE POLICY "Anyone can view open requirements"
  ON public.requirements FOR SELECT
  USING (status = 'open' OR patient_id = auth.uid());

CREATE POLICY "Patients can insert own requirements"
  ON public.requirements FOR INSERT
  WITH CHECK (auth.uid() = patient_id AND public.has_role(auth.uid(), 'patient'));

CREATE POLICY "Patients can update own requirements"
  ON public.requirements FOR UPDATE
  USING (auth.uid() = patient_id);

-- Requirement responses RLS policies
CREATE POLICY "Providers can insert responses"
  ON public.requirement_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.provider_profiles
      WHERE id = requirement_responses.provider_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can view responses to their requirements"
  ON public.requirement_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.requirements
      WHERE id = requirement_responses.requirement_id
        AND patient_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view own responses"
  ON public.requirement_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_profiles
      WHERE id = requirement_responses.provider_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can update response status"
  ON public.requirement_responses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.requirements
      WHERE id = requirement_responses.requirement_id
        AND patient_id = auth.uid()
    )
  );

-- Trigger for updated_at on requirements
CREATE TRIGGER update_requirements_updated_at
  BEFORE UPDATE ON public.requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
