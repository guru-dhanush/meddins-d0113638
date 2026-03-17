-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

-- Enums
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('patient', 'provider', 'organization', 'member'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Utility function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- User roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update own role" ON public.user_roles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
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
DO $$ BEGIN
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
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
DO $$ BEGIN
CREATE POLICY "Anyone can view orgs" ON public.organizations FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Owner can update org" ON public.organizations FOR UPDATE USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Owner can insert org" ON public.organizations FOR INSERT WITH CHECK (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org_id AND owner_id = _user_id)
$$;

-- Org members
CREATE TABLE IF NOT EXISTS public.org_members (
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
DO $$ BEGIN
CREATE POLICY "Org owners can manage members" ON public.org_members FOR ALL
  USING (public.is_org_owner(auth.uid(), organization_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Members can view own membership" ON public.org_members FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Provider profiles
CREATE TABLE IF NOT EXISTS public.provider_profiles (
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
DO $$ BEGIN
CREATE POLICY "Anyone can view providers" ON public.provider_profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Providers can update own" ON public.provider_profiles FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Providers can insert own" ON public.provider_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Org owners can update org provider profiles" ON public.provider_profiles FOR UPDATE
  USING (public.is_org_owner(auth.uid(), organization_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS update_provider_profiles_updated_at ON public.provider_profiles;
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
DROP TRIGGER IF EXISTS trg_sync_provider_location ON public.provider_profiles;
CREATE TRIGGER trg_sync_provider_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_provider_location();

-- Services
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Services viewable by everyone" ON public.services FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Providers can manage own services" ON public.services FOR ALL
  USING (EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = provider_id AND user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
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
DO $$ BEGIN
CREATE POLICY "Patients can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = patient_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Providers can view their bookings" ON public.bookings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = bookings.provider_id AND user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Patients can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = patient_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Providers can update bookings" ON public.bookings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = bookings.provider_id AND user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Patients can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = patient_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Org owners can view org provider bookings" ON public.bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.provider_profiles pp
    WHERE pp.id = bookings.provider_id AND pp.organization_id IS NOT NULL
    AND public.is_org_owner(auth.uid(), pp.organization_id)
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Org owners can update org provider bookings" ON public.bookings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.provider_profiles pp
    WHERE pp.id = bookings.provider_id AND pp.organization_id IS NOT NULL
    AND public.is_org_owner(auth.uid(), pp.organization_id)
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Patients can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = patient_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Availability
CREATE TABLE IF NOT EXISTS public.availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true
);
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Availability viewable by everyone" ON public.availability FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Providers can manage own availability" ON public.availability FOR ALL
  USING (EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = provider_id AND user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Requirements
CREATE TABLE IF NOT EXISTS public.requirements (
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
DO $$ BEGIN
CREATE POLICY "Anyone can view open requirements" ON public.requirements FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Patients can create requirements" ON public.requirements FOR INSERT WITH CHECK (auth.uid() = patient_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Patients can update own requirements" ON public.requirements FOR UPDATE USING (auth.uid() = patient_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS update_requirements_updated_at ON public.requirements;
CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON public.requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.requirement_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.requirement_responses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Requirement owner and responder can view" ON public.requirement_responses FOR SELECT
  USING (auth.uid() = provider_id OR EXISTS (SELECT 1 FROM public.requirements WHERE id = requirement_id AND patient_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Providers can respond" ON public.requirement_responses FOR INSERT WITH CHECK (auth.uid() = provider_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Posts
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  image_url TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  community_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Post likes
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Anyone can view likes" ON public.post_likes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can like" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can unlike" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
DROP TRIGGER IF EXISTS update_likes_count_on_insert ON public.post_likes;
CREATE TRIGGER update_likes_count_on_insert AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();
DROP TRIGGER IF EXISTS update_likes_count_on_delete ON public.post_likes;
CREATE TRIGGER update_likes_count_on_delete AFTER DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

-- Post comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Anyone can view comments" ON public.post_comments FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can comment" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
DROP TRIGGER IF EXISTS update_comments_count_on_insert ON public.post_comments;
CREATE TRIGGER update_comments_count_on_insert AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();
DROP TRIGGER IF EXISTS update_comments_count_on_delete ON public.post_comments;
CREATE TRIGGER update_comments_count_on_delete AFTER DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- Bookmarks
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
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
DO $$ BEGIN
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
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
DO $$ BEGIN
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Conversation participants can update messages" ON public.messages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete own messages" ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations(participant_1, participant_2);

DO $$ BEGIN
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Connections
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, receiver_id)
);
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Users can view own connections" ON public.connections FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can send connection requests" ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update own connections" ON public.connections FOR UPDATE
  USING (auth.uid() = receiver_id OR auth.uid() = requester_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete own connections" ON public.connections FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS update_connections_updated_at ON public.connections;
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AI Chat
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Users can view own ai conversations" ON public.ai_conversations FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create own ai conversations" ON public.ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update own ai conversations" ON public.ai_conversations FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete own ai conversations" ON public.ai_conversations FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Users can view own ai messages" ON public.ai_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = ai_messages.conversation_id AND user_id = auth.uid())
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create own ai messages" ON public.ai_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = ai_messages.conversation_id AND user_id = auth.uid())
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete own ai messages" ON public.ai_messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = ai_messages.conversation_id AND user_id = auth.uid())
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS update_ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_created BOOLEAN DEFAULT true,
  booking_confirmed BOOLEAN DEFAULT true,
  booking_cancelled BOOLEAN DEFAULT true,
  booking_reminder_24h BOOLEAN DEFAULT true,
  booking_reminder_1h BOOLEAN DEFAULT true,
  connection_request BOOLEAN DEFAULT true,
  message_received BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Users can view own prefs" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can insert own prefs" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update own prefs" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Health records
CREATE TABLE IF NOT EXISTS public.health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'other',
  file_url TEXT,
  file_type TEXT,
  folder TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Users can view own health records" ON public.health_records FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create own health records" ON public.health_records FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can update own health records" ON public.health_records FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete own health records" ON public.health_records FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Health record shares
CREATE TABLE IF NOT EXISTS public.health_record_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES public.health_records(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(record_id, shared_with)
);
ALTER TABLE public.health_record_shares ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Users can view shares they created or received" ON public.health_record_shares FOR SELECT
  USING (auth.uid() = shared_by OR auth.uid() = shared_with);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can create shares" ON public.health_record_shares FOR INSERT WITH CHECK (auth.uid() = shared_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can delete shares they created" ON public.health_record_shares FOR DELETE USING (auth.uid() = shared_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Prescriptions
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diagnosis TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Patients can view own prescriptions" ON public.prescriptions FOR SELECT USING (auth.uid() = patient_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Providers can view their prescriptions" ON public.prescriptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = prescriptions.provider_id AND user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Providers can create prescriptions" ON public.prescriptions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = provider_id AND user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Prescription items
CREATE TABLE IF NOT EXISTS public.prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Users can view prescription items" ON public.prescription_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.prescriptions p WHERE p.id = prescription_items.prescription_id
    AND (p.patient_id = auth.uid() OR EXISTS (SELECT 1 FROM public.provider_profiles pp WHERE pp.id = p.provider_id AND pp.user_id = auth.uid()))
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Providers can create prescription items" ON public.prescription_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prescriptions p
    JOIN public.provider_profiles pp ON pp.id = p.provider_id
    WHERE p.id = prescription_id AND pp.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Communities
CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon_url TEXT,
  banner_url TEXT,
  category TEXT NOT NULL DEFAULT 'health',
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'restricted', 'private')),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count INTEGER NOT NULL DEFAULT 1,
  post_count INTEGER NOT NULL DEFAULT 0,
  rules JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Anyone can view public communities" ON public.communities FOR SELECT
  USING (visibility IN ('public', 'restricted'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Authenticated users can create communities" ON public.communities FOR INSERT
  WITH CHECK (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Creator can update community" ON public.communities FOR UPDATE USING (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Creator can delete community" ON public.communities FOR DELETE USING (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS update_communities_updated_at ON public.communities;
CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add community_id FK to posts (only if not exists)
DO $$ BEGIN
ALTER TABLE public.posts ADD CONSTRAINT posts_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_posts_community ON public.posts(community_id) WHERE community_id IS NOT NULL;

-- Community members
CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('creator', 'moderator', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'banned')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
CREATE POLICY "Authenticated can view community members" ON public.community_members FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can join communities" ON public.community_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Creator can manage members" ON public.community_members FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_members.community_id AND c.creator_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users can leave or creator can kick" ON public.community_members FOR DELETE TO authenticated
  USING ((auth.uid() = user_id AND role != 'creator') OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_members.community_id AND c.creator_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auth trigger
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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('org-assets', 'org-assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('provider-documents', 'provider-documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('community-media', 'community-media', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('health-records', 'health-records', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ BEGIN
CREATE POLICY "Authenticated upload post media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-media');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Anyone view post media" ON storage.objects FOR SELECT USING (bucket_id = 'post-media');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users delete own post media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Anyone view org assets" ON storage.objects FOR SELECT USING (bucket_id = 'org-assets');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Org owners upload assets" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'org-assets' AND EXISTS (
    SELECT 1 FROM public.organizations WHERE id::text = (storage.foldername(name))[1] AND owner_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Authenticated upload chat attachments" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Anyone view chat attachments" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Users delete own chat attachments" ON storage.objects FOR DELETE
  USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Upload provider docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'provider-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "View own provider docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'provider-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Anyone can view community media" ON storage.objects FOR SELECT USING (bucket_id = 'community-media');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Authenticated users can upload community media" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'community-media' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Upload own health records" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'health-records' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "View own health records" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'health-records' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
CREATE POLICY "Delete own health records" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'health-records' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';