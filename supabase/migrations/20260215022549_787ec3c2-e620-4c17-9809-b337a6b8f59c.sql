
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''));

  -- Only auto-assign role if explicitly provided (email signup), not for OAuth
  _role := (NEW.raw_user_meta_data->>'role')::app_role;
  IF _role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role);

    -- Auto-create provider_profiles for providers
    IF _role = 'provider' THEN
      INSERT INTO public.provider_profiles (user_id, provider_type, hourly_rate)
      VALUES (NEW.id, 'doctor', 0);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
