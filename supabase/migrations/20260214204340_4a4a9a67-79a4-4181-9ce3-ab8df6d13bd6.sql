
-- Roles enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('patient', 'provider');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Provider type enum
CREATE TYPE public.provider_type AS ENUM ('doctor', 'nurse', 'caretaker');

-- Provider profiles
CREATE TABLE public.provider_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  provider_type provider_type NOT NULL,
  bio TEXT DEFAULT '',
  qualifications TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_available BOOLEAN DEFAULT true,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider profiles viewable by everyone" ON public.provider_profiles FOR SELECT USING (true);
CREATE POLICY "Providers can update own profile" ON public.provider_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Providers can insert own profile" ON public.provider_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Services offered by providers
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services viewable by everyone" ON public.services FOR SELECT USING (true);
CREATE POLICY "Providers can manage own services" ON public.services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = provider_id AND user_id = auth.uid())
  );

-- Booking status enum
CREATE TYPE public.booking_status AS ENUM ('pending', 'accepted', 'declined', 'completed', 'cancelled');

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  health_concern TEXT DEFAULT '',
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Providers can view their bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = provider_id AND user_id = auth.uid())
  );
CREATE POLICY "Patients can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Providers can update booking status" ON public.bookings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = provider_id AND user_id = auth.uid())
  );
CREATE POLICY "Patients can update own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = patient_id);

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Patients can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- Availability slots
CREATE TABLE public.availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true
);
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Availability viewable by everyone" ON public.availability FOR SELECT USING (true);
CREATE POLICY "Providers can manage own availability" ON public.availability
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = provider_id AND user_id = auth.uid())
  );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_provider_profiles_updated_at BEFORE UPDATE ON public.provider_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and role on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'patient'));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
