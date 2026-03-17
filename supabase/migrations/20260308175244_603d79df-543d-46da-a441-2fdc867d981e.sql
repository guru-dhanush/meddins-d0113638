
-- Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  payment_method text DEFAULT 'card',
  transaction_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments (as patient or provider)
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.provider_profiles pp ON pp.id = b.provider_id
      WHERE b.id = payments.booking_id AND pp.user_id = auth.uid()
    )
  );

-- Users can create payments for their own bookings
CREATE POLICY "Users can create own payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
