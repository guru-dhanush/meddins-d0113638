
-- Add structured profile fields to profiles table
ALTER TABLE public.profiles ADD COLUMN education jsonb DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN certifications jsonb DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN skills text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN work_experience jsonb DEFAULT '[]';

-- Add is_request flag to conversations table
ALTER TABLE public.conversations ADD COLUMN is_request boolean DEFAULT false;
