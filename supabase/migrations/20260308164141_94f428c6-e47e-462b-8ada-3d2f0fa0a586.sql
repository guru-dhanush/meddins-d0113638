
-- Drop all existing tables (in dependency order)
DROP TABLE IF EXISTS requirement_responses CASCADE;
DROP TABLE IF EXISTS requirements CASCADE;
DROP TABLE IF EXISTS ai_messages CASCADE;
DROP TABLE IF EXISTS ai_conversations CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS post_comments CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS community_reports CASCADE;
DROP TABLE IF EXISTS event_attendees CASCADE;
DROP TABLE IF EXISTS community_events CASCADE;
DROP TABLE IF EXISTS community_flairs CASCADE;
DROP TABLE IF EXISTS muted_communities CASCADE;
DROP TABLE IF EXISTS community_members CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS availability CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS provider_profiles CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop existing enum if exists, then recreate
DROP TYPE IF EXISTS app_role CASCADE;
CREATE TYPE app_role AS ENUM ('patient', 'provider', 'organization', 'member');

-- ═══════════════════════════════════════════════════════════════════
-- 1. PROFILES
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  bio text,
  phone text,
  skills text[] DEFAULT '{}',
  education jsonb DEFAULT '[]'::jsonb,
  certifications jsonb DEFAULT '[]'::jsonb,
  work_experience jsonb DEFAULT '[]'::jsonb,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- 2. USER ROLES
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view roles" ON user_roles FOR SELECT USING (true);
CREATE POLICY "Users can insert own role" ON user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own role" ON user_roles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- 3. PROVIDER PROFILES
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.provider_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  provider_type text NOT NULL DEFAULT 'doctor',
  bio text,
  specialization text,
  experience_years integer DEFAULT 0,
  hourly_rate numeric DEFAULT 0,
  location text,
  latitude double precision,
  longitude double precision,
  license_number text,
  booking_mode text NOT NULL DEFAULT 'public',
  consultation_modes text[],
  available boolean DEFAULT true,
  is_available boolean DEFAULT true,
  avg_rating numeric DEFAULT 0,
  total_reviews integer DEFAULT 0,
  specializations text[] DEFAULT '{}',
  city text,
  languages text[] DEFAULT '{}',
  accepting_new_patients boolean DEFAULT true,
  consultation_fee numeric DEFAULT 0,
  home_visit_fee numeric DEFAULT 0,
  verification_status text NOT NULL DEFAULT 'none',
  verification_document_url text,
  verification_notes text,
  verification_submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view providers" ON provider_profiles FOR SELECT USING (true);
CREATE POLICY "Providers can insert own" ON provider_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Providers can update own" ON provider_profiles FOR UPDATE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- 4. ORGANIZATIONS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  logo_url text,
  banner_url text,
  specialties text[],
  established_year integer,
  operating_hours text,
  latitude double precision,
  longitude double precision,
  social_facebook text,
  social_instagram text,
  social_linkedin text,
  social_twitter text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view orgs" ON organizations FOR SELECT USING (true);
CREATE POLICY "Owner can insert org" ON organizations FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update org" ON organizations FOR UPDATE USING (auth.uid() = owner_id);

-- ═══════════════════════════════════════════════════════════════════
-- 5. SERVICES (provider services)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric DEFAULT 0,
  duration_minutes integer DEFAULT 30,
  consultation_mode text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view services" ON services FOR SELECT USING (true);
CREATE POLICY "Providers can manage own services" ON services FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM provider_profiles WHERE id = services.provider_id AND user_id = auth.uid())
);
CREATE POLICY "Providers can update own services" ON services FOR UPDATE USING (
  EXISTS (SELECT 1 FROM provider_profiles WHERE id = services.provider_id AND user_id = auth.uid())
);
CREATE POLICY "Providers can delete own services" ON services FOR DELETE USING (
  EXISTS (SELECT 1 FROM provider_profiles WHERE id = services.provider_id AND user_id = auth.uid())
);

-- ═══════════════════════════════════════════════════════════════════
-- 6. AVAILABILITY (provider schedule)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view availability" ON availability FOR SELECT USING (true);
CREATE POLICY "Providers can manage own availability" ON availability FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM provider_profiles WHERE id = availability.provider_id AND user_id = auth.uid())
);
CREATE POLICY "Providers can update own availability" ON availability FOR UPDATE USING (
  EXISTS (SELECT 1 FROM provider_profiles WHERE id = availability.provider_id AND user_id = auth.uid())
);
CREATE POLICY "Providers can delete own availability" ON availability FOR DELETE USING (
  EXISTS (SELECT 1 FROM provider_profiles WHERE id = availability.provider_id AND user_id = auth.uid())
);

-- ═══════════════════════════════════════════════════════════════════
-- 7. REVIEWS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Patients can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Patients can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = patient_id);

-- ═══════════════════════════════════════════════════════════════════
-- 8. CONNECTIONS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own connections" ON connections FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send connection requests" ON connections FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update own connections" ON connections FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = requester_id);
CREATE POLICY "Users can delete own connections" ON connections FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- ═══════════════════════════════════════════════════════════════════
-- 9. CONVERSATIONS & MESSAGES
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 uuid NOT NULL,
  participant_2 uuid NOT NULL,
  is_request boolean DEFAULT false,
  request_sender_id uuid,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY "Users can update own conversations" ON conversations FOR UPDATE USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  attachment_url text,
  attachment_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid()))
);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid()))
);
CREATE POLICY "Conversation participants can update messages" ON messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid()))
);
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE USING (auth.uid() = sender_id);

-- ═══════════════════════════════════════════════════════════════════
-- 10. POSTS, LIKES, COMMENTS, BOOKMARKS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general',
  image_url text,
  community_id uuid,
  is_pinned boolean DEFAULT false,
  flair_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view likes" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON post_likes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments" ON post_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment" ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON post_comments FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bookmarks" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create bookmarks" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON bookmarks FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- 11. COMMUNITIES
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  icon_url text,
  banner_url text,
  category text NOT NULL DEFAULT 'general',
  visibility text NOT NULL DEFAULT 'public',
  rules jsonb DEFAULT '[]'::jsonb,
  creator_id uuid NOT NULL,
  member_count integer DEFAULT 1,
  post_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public communities" ON communities FOR SELECT USING (true);
CREATE POLICY "Users can create communities" ON communities FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creator can update community" ON communities FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creator can delete community" ON communities FOR DELETE USING (auth.uid() = creator_id);

-- Add FK from posts to communities
ALTER TABLE public.posts ADD CONSTRAINT posts_community_id_fkey FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE SET NULL;

CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view community members" ON community_members FOR SELECT USING (true);
CREATE POLICY "Users can join communities" ON community_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can update own membership" ON community_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Moderators can update members" ON community_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_members.community_id AND cm.user_id = auth.uid() AND cm.role IN ('moderator', 'admin'))
);
CREATE POLICY "Users can leave communities" ON community_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Moderators can remove members" ON community_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_members.community_id AND cm.user_id = auth.uid() AND cm.role IN ('moderator', 'admin'))
);

CREATE TABLE public.community_flairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_flairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view flairs" ON community_flairs FOR SELECT USING (true);
CREATE POLICY "Moderators can manage flairs" ON community_flairs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_flairs.community_id AND cm.user_id = auth.uid() AND cm.role IN ('moderator', 'admin'))
);
CREATE POLICY "Moderators can update flairs" ON community_flairs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_flairs.community_id AND cm.user_id = auth.uid() AND cm.role IN ('moderator', 'admin'))
);
CREATE POLICY "Moderators can delete flairs" ON community_flairs FOR DELETE USING (
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_flairs.community_id AND cm.user_id = auth.uid() AND cm.role IN ('moderator', 'admin'))
);

-- Add FK from posts to flairs
ALTER TABLE public.posts ADD CONSTRAINT posts_flair_id_fkey FOREIGN KEY (flair_id) REFERENCES community_flairs(id) ON DELETE SET NULL;

CREATE TABLE public.community_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'general',
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  location text,
  is_online boolean DEFAULT true,
  meeting_url text,
  max_attendees integer,
  attendee_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'upcoming',
  creator_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view events" ON community_events FOR SELECT USING (true);
CREATE POLICY "Moderators can create events" ON community_events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_events.community_id AND cm.user_id = auth.uid() AND cm.role IN ('moderator', 'admin'))
);
CREATE POLICY "Moderators can update events" ON community_events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_events.community_id AND cm.user_id = auth.uid() AND cm.role IN ('moderator', 'admin'))
);
CREATE POLICY "Moderators can delete events" ON community_events FOR DELETE USING (
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_events.community_id AND cm.user_id = auth.uid() AND cm.role IN ('moderator', 'admin'))
);

CREATE TABLE public.event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'going',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view attendees" ON event_attendees FOR SELECT USING (true);
CREATE POLICY "Users can attend events" ON event_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update attendance" ON event_attendees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can cancel attendance" ON event_attendees FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reported_user_id uuid,
  reported_post_id uuid,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporters can create reports" ON community_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Moderators can view reports" ON community_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_reports.community_id AND cm.user_id = auth.uid() AND cm.role IN ('moderator', 'admin'))
);
CREATE POLICY "Moderators can update reports" ON community_reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_reports.community_id AND cm.user_id = auth.uid() AND cm.role IN ('moderator', 'admin'))
);

CREATE TABLE public.muted_communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, community_id)
);
ALTER TABLE public.muted_communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own mutes" ON muted_communities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mute communities" ON muted_communities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unmute communities" ON muted_communities FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- 12. BOOKINGS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  provider_id uuid NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  booking_time text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Patients can view own bookings" ON bookings FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Providers can view their bookings" ON bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM provider_profiles WHERE id = bookings.provider_id AND user_id = auth.uid())
);
CREATE POLICY "Providers can update bookings" ON bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM provider_profiles WHERE id = bookings.provider_id AND user_id = auth.uid())
);

-- ═══════════════════════════════════════════════════════════════════
-- 13. AI CONVERSATIONS & MESSAGES
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text DEFAULT 'New Chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create own ai conversations" ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own ai conversations" ON ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own ai conversations" ON ai_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ai conversations" ON ai_conversations FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ai messages" ON ai_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM ai_conversations WHERE id = ai_messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create own ai messages" ON ai_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM ai_conversations WHERE id = ai_messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own ai messages" ON ai_messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM ai_conversations WHERE id = ai_messages.conversation_id AND user_id = auth.uid())
);

-- ═══════════════════════════════════════════════════════════════════
-- 14. REQUIREMENTS & RESPONSES
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  provider_type text NOT NULL DEFAULT 'doctor',
  location text,
  budget_range text,
  duration_type text DEFAULT 'one-time',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view open requirements" ON requirements FOR SELECT USING (true);
CREATE POLICY "Patients can create requirements" ON requirements FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Patients can update own requirements" ON requirements FOR UPDATE USING (auth.uid() = patient_id);

CREATE TABLE public.requirement_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.requirement_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers can respond" ON requirement_responses FOR INSERT WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "Requirement owner and responder can view" ON requirement_responses FOR SELECT USING (
  auth.uid() = provider_id OR EXISTS (SELECT 1 FROM requirements WHERE id = requirement_responses.requirement_id AND patient_id = auth.uid())
);

-- ═══════════════════════════════════════════════════════════════════
-- 15. FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provider_profiles_updated_at BEFORE UPDATE ON provider_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON ai_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
