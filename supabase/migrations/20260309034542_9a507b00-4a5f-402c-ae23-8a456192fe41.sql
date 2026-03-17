
-- Create call_logs table
CREATE TABLE public.call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  duration_seconds integer DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- RLS: caller and callee can read their own logs
CREATE POLICY "Users can view own call logs"
  ON public.call_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- RLS: authenticated users can insert call logs
CREATE POLICY "Users can insert call logs"
  ON public.call_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Enable realtime for call_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;
