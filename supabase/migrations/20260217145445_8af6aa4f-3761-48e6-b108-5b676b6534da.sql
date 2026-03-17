
-- 1. Fix user_roles RLS: allow anyone to read roles (needed for viewing other user profiles)
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Anyone can view roles"
  ON public.user_roles FOR SELECT
  USING (true);

-- 2. Create the trigger on auth.users to auto-create profiles
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill profiles for existing auth users who don't have one
INSERT INTO public.profiles (user_id, full_name, avatar_url)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''),
  COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', NULL)
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT DO NOTHING;
