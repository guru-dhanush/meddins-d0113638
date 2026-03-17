
-- Prescriptions table
CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  provider_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  diagnosis text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can create prescriptions" ON public.prescriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM provider_profiles WHERE id = prescriptions.provider_id AND user_id = auth.uid())
  );

CREATE POLICY "Providers can view their prescriptions" ON public.prescriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM provider_profiles WHERE id = prescriptions.provider_id AND user_id = auth.uid())
  );

CREATE POLICY "Patients can view their prescriptions" ON public.prescriptions
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- Prescription items (medications)
CREATE TABLE public.prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  dosage text,
  frequency text,
  duration text,
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view prescription items via prescription" ON public.prescription_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prescriptions p
      WHERE p.id = prescription_items.prescription_id
      AND (p.patient_id = auth.uid() OR EXISTS (SELECT 1 FROM provider_profiles pp WHERE pp.id = p.provider_id AND pp.user_id = auth.uid()))
    )
  );

CREATE POLICY "Providers can create prescription items" ON public.prescription_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prescriptions p
      JOIN provider_profiles pp ON pp.id = p.provider_id
      WHERE p.id = prescription_items.prescription_id AND pp.user_id = auth.uid()
    )
  );

-- Follow-ups table
CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  provider_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  follow_up_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  auto_booked boolean NOT NULL DEFAULT false,
  new_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can create follow-ups" ON public.follow_ups
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM provider_profiles WHERE id = follow_ups.provider_id AND user_id = auth.uid())
  );

CREATE POLICY "Providers can view their follow-ups" ON public.follow_ups
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM provider_profiles WHERE id = follow_ups.provider_id AND user_id = auth.uid())
  );

CREATE POLICY "Patients can view their follow-ups" ON public.follow_ups
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Providers can update follow-ups" ON public.follow_ups
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM provider_profiles WHERE id = follow_ups.provider_id AND user_id = auth.uid())
  );

CREATE POLICY "Patients can update their follow-ups" ON public.follow_ups
  FOR UPDATE TO authenticated
  USING (patient_id = auth.uid());
