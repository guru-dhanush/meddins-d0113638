
-- Fix: Allow conversation participants to mark messages as read (not just sender)
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;

CREATE POLICY "Conversation participants can update messages"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

-- Add DELETE policy for message deletion (only sender can delete)
CREATE POLICY "Users can delete own messages"
ON public.messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Add columns for file/image attachments
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_type text;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat attachments
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete own chat attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
