
-- Create connections table for LinkedIn-style connect flow
CREATE TABLE public.connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, receiver_id)
);

-- Enable RLS
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Either party can view their connections
CREATE POLICY "Users can view own connections"
  ON public.connections FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Users can send connection requests
CREATE POLICY "Users can send connection requests"
  ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Receiver can accept/reject, requester can cancel
CREATE POLICY "Users can update own connections"
  ON public.connections FOR UPDATE
  USING (auth.uid() = receiver_id OR auth.uid() = requester_id);

-- Either party can delete
CREATE POLICY "Users can delete own connections"
  ON public.connections FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Trigger for updated_at
CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
