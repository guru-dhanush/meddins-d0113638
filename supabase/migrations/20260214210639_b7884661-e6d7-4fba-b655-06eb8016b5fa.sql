
-- Update handle_new_user to also create provider_profiles for providers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'patient'));
  
  -- Auto-create provider_profiles for providers
  IF COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'patient') = 'provider' THEN
    INSERT INTO public.provider_profiles (user_id, provider_type, hourly_rate)
    VALUES (NEW.id, 'doctor', 0);
  END IF;
  
  RETURN NEW;
END;
$function$;
