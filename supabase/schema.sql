-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║           Meddin — COMPREHENSIVE DATABASE SCHEMA                 ║
-- ║  All tables, enums, functions, triggers, RLS, storage in one file  ║
-- ║  Run this in Supabase SQL Editor to set up or reset the database   ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 0. EXTENSIONS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. ENUMS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TYPE public.app_role AS ENUM ('patient', 'provider', 'organization', 'member');


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. UTILITY FUNCTIONS (no table dependencies)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. USER ROLES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own role" ON public.user_roles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- has_role() — depends on user_roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. PROFILES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  education jsonb DEFAULT '[]',
  certifications jsonb DEFAULT '[]',
  skills text[] DEFAULT '{}',
  work_experience jsonb DEFAULT '[]',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. ORGANIZATIONS (must be BEFORE provider_profiles due to FK)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  website TEXT,
  is_verified BOOLEAN DEFAULT false,
  established_year INTEGER,
  specialties text[],
  operating_hours TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  social_facebook TEXT,
  social_instagram TEXT,
  social_twitter TEXT,
  social_linkedin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view orgs" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Owner can update org" ON public.organizations FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owner can insert org" ON public.organizations FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- is_org_owner() — depends on organizations
CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org_id AND owner_id = _user_id)
$$;

-- org_members — depends on organizations + is_org_owner
CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending',
  invited_email TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org owners can manage members" ON public.org_members FOR ALL
  USING (public.is_org_owner(auth.uid(), organization_id));
CREATE POLICY "Members can view own membership" ON public.org_members FOR SELECT
  USING (auth.uid() = user_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. PROVIDER PROFILES (depends on organizations for FK)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.provider_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL DEFAULT 'doctor',
  specialization TEXT,
  bio TEXT,
  qualifications TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  hourly_rate NUMERIC DEFAULT 0,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location extensions.geography(Point, 4326),
  is_available BOOLEAN DEFAULT true,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  languages text[] DEFAULT '{}',
  education jsonb DEFAULT '[]',
  work_experience jsonb DEFAULT '[]',
  specializations text[] DEFAULT '{}',
  consultation_fee numeric DEFAULT 0,
  home_visit_fee numeric DEFAULT 0,
  phone text,
  email text,
  city text,
  address text,
  gender text,
  date_of_birth date,
  license_number text,
  license_expiry date,
  accepting_new_patients boolean DEFAULT true,
  organization_id uuid REFERENCES public.organizations(id),
  verification_status text NOT NULL DEFAULT 'none',
  consultation_modes text[],
  verification_document_url text,
  verification_submitted_at timestamptz,
  verification_notes text,
  booking_mode text NOT NULL DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view providers" ON public.provider_profiles FOR SELECT USING (true);
CREATE POLICY "Providers can update own" ON public.provider_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Providers can insert own" ON public.provider_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org owners can update org provider profiles" ON public.provider_profiles FOR UPDATE
  USING (public.is_org_owner(auth.uid(), organization_id));
CREATE TRIGGER update_provider_profiles_updated_at BEFORE UPDATE ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_provider_location ON public.provider_profiles USING GIST(location);

CREATE OR REPLACE FUNCTION public.sync_provider_location()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := extensions.ST_SetSRID(extensions.ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::extensions.geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_sync_provider_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_provider_location();


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. SERVICES & BOOKINGS (depends on provider_profiles)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
CREATE POLICY "Providers can manage own services" ON public.services FOR ALL
  USING (EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = provider_id AND user_id = auth.uid()));

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  booking_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  health_concern TEXT DEFAULT '',
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Providers can view their bookings" ON public.bookings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = bookings.provider_id AND user_id = auth.uid()));
CREATE POLICY "Patients can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Providers can update bookings" ON public.bookings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = bookings.provider_id AND user_id = auth.uid()));
CREATE POLICY "Patients can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = patient_id);
CREATE POLICY "Org owners can view org provider bookings" ON public.bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.provider_profiles pp
    WHERE pp.id = bookings.provider_id AND pp.organization_id IS NOT NULL
    AND public.is_org_owner(auth.uid(), pp.organization_id)
  ));
CREATE POLICY "Org owners can update org provider bookings" ON public.bookings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.provider_profiles pp
    WHERE pp.id = bookings.provider_id AND pp.organization_id IS NOT NULL
    AND public.is_org_owner(auth.uid(), pp.organization_id)
  ));
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- reviews (depends on bookings + provider_profiles)
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
CREATE POLICY "Patients can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- availability (depends on provider_profiles)
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
CREATE POLICY "Providers can manage own availability" ON public.availability FOR ALL
  USING (EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = provider_id AND user_id = auth.uid()));


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 8. REQUIREMENTS (no new dependencies)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  provider_type TEXT NOT NULL DEFAULT 'doctor',
  location TEXT,
  duration_type TEXT DEFAULT 'one-time',
  budget_range TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view open requirements" ON public.requirements FOR SELECT USING (true);
CREATE POLICY "Patients can create requirements" ON public.requirements FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Patients can update own requirements" ON public.requirements FOR UPDATE USING (auth.uid() = patient_id);
CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON public.requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.requirement_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.requirement_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requirement owner and responder can view" ON public.requirement_responses FOR SELECT
  USING (auth.uid() = provider_id OR EXISTS (SELECT 1 FROM public.requirements WHERE id = requirement_id AND patient_id = auth.uid()));
CREATE POLICY "Providers can respond" ON public.requirement_responses FOR INSERT WITH CHECK (auth.uid() = provider_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 9. SOCIAL FEED
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  image_url TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view likes" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER update_likes_count_on_insert AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();
CREATE TRIGGER update_likes_count_on_delete AFTER DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER update_comments_count_on_insert AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();
CREATE TRIGGER update_comments_count_on_delete AFTER DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 10. MESSAGING
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1 UUID NOT NULL,
  participant_2 UUID NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_request BOOLEAN DEFAULT false,
  request_sender_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(participant_1, participant_2)
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  ));
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  ));
CREATE POLICY "Conversation participants can update messages" ON public.messages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  ));
CREATE POLICY "Users can delete own messages" ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);

CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_conversations_participants ON public.conversations(participant_1, participant_2);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 11. CONNECTIONS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, receiver_id)
);
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own connections" ON public.connections FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send connection requests" ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update own connections" ON public.connections FOR UPDATE
  USING (auth.uid() = receiver_id OR auth.uid() = requester_id);
CREATE POLICY "Users can delete own connections" ON public.connections FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 12. AI CHAT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ai conversations" ON public.ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own ai conversations" ON public.ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ai conversations" ON public.ai_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ai conversations" ON public.ai_conversations FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ai messages" ON public.ai_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = ai_messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create own ai messages" ON public.ai_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = ai_messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own ai messages" ON public.ai_messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = ai_messages.conversation_id AND user_id = auth.uid())
);
CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 13. AUTH TRIGGER
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL)
  );
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 14. RPC: Nearby providers (PostGIS)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.nearby_providers(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision DEFAULT 50
)
RETURNS TABLE (
  id uuid, user_id uuid, provider_type text, bio text,
  experience_years integer, hourly_rate numeric, avg_rating numeric,
  total_reviews integer, is_available boolean, specializations text[],
  city text, languages text[], accepting_new_patients boolean,
  consultation_fee numeric, home_visit_fee numeric,
  latitude double precision, longitude double precision,
  full_name text, avatar_url text, distance_km double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
  SELECT
    pp.id, pp.user_id, pp.provider_type, pp.bio,
    pp.experience_years, pp.hourly_rate, pp.avg_rating,
    pp.total_reviews, pp.is_available, pp.specializations,
    pp.city, pp.languages, pp.accepting_new_patients,
    pp.consultation_fee, pp.home_visit_fee,
    pp.latitude, pp.longitude,
    p.full_name, p.avatar_url,
    extensions.ST_Distance(
      pp.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(user_lng, user_lat), 4326)::extensions.geography
    ) / 1000.0 AS distance_km
  FROM provider_profiles pp
  JOIN profiles p ON p.user_id = pp.user_id
  WHERE pp.is_available = true
    AND pp.location IS NOT NULL
    AND extensions.ST_DWithin(
      pp.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(user_lng, user_lat), 4326)::extensions.geography,
      radius_km * 1000
    )
  ORDER BY distance_km;
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 15. STORAGE BUCKETS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Authenticated upload post media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-media');
CREATE POLICY "Anyone view post media" ON storage.objects FOR SELECT USING (bucket_id = 'post-media');
CREATE POLICY "Users delete own post media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

INSERT INTO storage.buckets (id, name, public) VALUES ('org-assets', 'org-assets', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Anyone view org assets" ON storage.objects FOR SELECT USING (bucket_id = 'org-assets');
CREATE POLICY "Org owners upload assets" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'org-assets' AND EXISTS (
    SELECT 1 FROM public.organizations WHERE id::text = (storage.foldername(name))[1] AND owner_id = auth.uid()
  ));
CREATE POLICY "Org owners update assets" ON storage.objects FOR UPDATE USING (
  bucket_id = 'org-assets' AND EXISTS (
    SELECT 1 FROM public.organizations WHERE id::text = (storage.foldername(name))[1] AND owner_id = auth.uid()
  ));
CREATE POLICY "Org owners delete assets" ON storage.objects FOR DELETE USING (
  bucket_id = 'org-assets' AND EXISTS (
    SELECT 1 FROM public.organizations WHERE id::text = (storage.foldername(name))[1] AND owner_id = auth.uid()
  ));

INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Authenticated upload chat attachments" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone view chat attachments" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');
CREATE POLICY "Users delete own chat attachments" ON storage.objects FOR DELETE
  USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

INSERT INTO storage.buckets (id, name, public) VALUES ('provider-documents', 'provider-documents', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Upload provider docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'provider-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "View own provider docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'provider-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Update own provider docs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'provider-documents' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 16. REFRESH SCHEMA CACHE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOTIFY pgrst, 'reload schema';
