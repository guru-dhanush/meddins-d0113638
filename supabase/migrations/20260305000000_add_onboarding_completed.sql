-- Add onboarding_completed flag to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Mark existing users as onboarded (they already went through select-role)
UPDATE public.profiles SET onboarding_completed = true
WHERE user_id IN (SELECT user_id FROM public.user_roles);
