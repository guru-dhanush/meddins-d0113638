
CREATE TABLE public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  -- Privacy
  profile_visibility text NOT NULL DEFAULT 'public',
  show_online_status boolean NOT NULL DEFAULT true,
  connection_requests text NOT NULL DEFAULT 'everyone',
  message_privacy text NOT NULL DEFAULT 'everyone',
  hide_from_search boolean NOT NULL DEFAULT false,
  -- Booking (provider-only)
  default_consultation_mode text NOT NULL DEFAULT 'in_clinic',
  booking_auto_confirm boolean NOT NULL DEFAULT false,
  booking_buffer_minutes integer NOT NULL DEFAULT 0,
  cancellation_policy text DEFAULT '',
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);
