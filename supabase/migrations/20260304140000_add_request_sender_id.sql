-- Add request_sender_id column to conversations table
-- This tracks who initiated the message request so only the receiver sees Accept/Decline
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS request_sender_id uuid REFERENCES auth.users(id);

-- Backfill existing request conversations: use the first message sender as the requester
UPDATE public.conversations c
SET request_sender_id = (
  SELECT m.sender_id
  FROM public.messages m
  WHERE m.conversation_id = c.id
  ORDER BY m.created_at ASC
  LIMIT 1
)
WHERE c.is_request = true AND c.request_sender_id IS NULL;
