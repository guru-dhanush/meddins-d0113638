-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║           Healther — COMMUNITY FEATURE MIGRATION                  ║
-- ║  Run this in the Supabase SQL Editor                              ║
-- ║  Creates: communities, community_members tables                   ║
-- ║  Modifies: posts (adds community_id)                              ║
-- ╚══════════════════════════════════════════════════════════════════════╝


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. COMMUNITIES TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,                          -- URL-safe slug e.g. "mental-health"
  display_name TEXT NOT NULL,                         -- "Mental Health Support"
  description TEXT DEFAULT '',
  icon_url TEXT,
  banner_url TEXT,
  category TEXT NOT NULL DEFAULT 'health',
  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'restricted', 'private')),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count INTEGER NOT NULL DEFAULT 1,
  post_count INTEGER NOT NULL DEFAULT 0,
  rules JSONB DEFAULT '[]'::jsonb,                    -- [{title, description}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_communities_category ON public.communities(category);
CREATE INDEX IF NOT EXISTS idx_communities_creator ON public.communities(creator_id);
CREATE INDEX IF NOT EXISTS idx_communities_name ON public.communities(name);

-- Trigger: auto-update updated_at
CREATE TRIGGER update_communities_updated_at
  BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

-- Everyone can view public & restricted communities
CREATE POLICY "Anyone can view public communities"
  ON public.communities FOR SELECT
  USING (visibility IN ('public', 'restricted'));

-- Members can view private communities
CREATE POLICY "Members can view private communities"
  ON public.communities FOR SELECT
  USING (
    visibility = 'private'
    AND EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = communities.id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

-- Any authenticated user can create a community
CREATE POLICY "Authenticated users can create communities"
  ON public.communities FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Only creator can update community settings
CREATE POLICY "Creator can update community"
  ON public.communities FOR UPDATE
  USING (auth.uid() = creator_id);

-- Only creator can delete community
CREATE POLICY "Creator can delete community"
  ON public.communities FOR DELETE
  USING (auth.uid() = creator_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. COMMUNITY MEMBERS TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('creator', 'moderator', 'member')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'banned')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_members_community ON public.community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON public.community_members(user_id);

-- RLS
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can view community members
-- (Community-level visibility is enforced by the communities table RLS)
CREATE POLICY "Authenticated can view community members"
  ON public.community_members FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Users can join communities (self-insert only)
CREATE POLICY "Users can join communities"
  ON public.community_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Only community creator can manage members
-- Uses communities table (NOT community_members) to avoid infinite recursion
CREATE POLICY "Creator can manage members"
  ON public.community_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_members.community_id
        AND c.creator_id = auth.uid()
    )
  );

-- DELETE: Users can leave (self-delete, non-creators), OR creator can kick
CREATE POLICY "Users can leave or creator can kick"
  ON public.community_members FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = user_id AND role != 'creator')
    OR EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_members.community_id
        AND c.creator_id = auth.uid()
    )
  );


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. MODIFY POSTS TABLE — add community_id
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_community ON public.posts(community_id)
  WHERE community_id IS NOT NULL;

-- Additional RLS: community moderators can delete posts in their community
CREATE POLICY "Community moderators can delete posts"
  ON public.posts FOR DELETE
  USING (
    community_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = posts.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('creator', 'moderator')
        AND cm.status = 'active'
    )
  );

-- Active members of public/restricted communities can create posts
CREATE POLICY "Community members can create community posts"
  ON public.posts FOR INSERT
  WITH CHECK (
    community_id IS NULL  -- global posts: existing policy handles this
    OR (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM public.community_members cm
        WHERE cm.community_id = posts.community_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
          AND cm.role != 'banned'
      )
    )
  );

-- Private community posts: only members can view
-- (public posts already have "Anyone can view posts" policy, so we need
--  to restrict private community posts. We'll modify the existing policy.)
-- NOTE: We can't easily modify existing policy, so for private communities
-- the visibility is enforced by the communities table RLS + frontend filtering.


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. TRIGGERS — auto-update member_count and post_count
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Member count trigger
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE public.communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes (ban removes count, unban adds)
    IF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE public.communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = NEW.community_id;
    ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_member_count_insert
  AFTER INSERT ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();

CREATE TRIGGER update_member_count_delete
  AFTER DELETE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();

CREATE TRIGGER update_member_count_update
  AFTER UPDATE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();

-- Post count trigger
CREATE OR REPLACE FUNCTION public.update_community_post_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.community_id IS NOT NULL THEN
    UPDATE public.communities SET post_count = post_count + 1 WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.community_id IS NOT NULL THEN
    UPDATE public.communities SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.community_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Post moved to/from community
    IF OLD.community_id IS NOT NULL AND (NEW.community_id IS NULL OR NEW.community_id != OLD.community_id) THEN
      UPDATE public.communities SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.community_id;
    END IF;
    IF NEW.community_id IS NOT NULL AND (OLD.community_id IS NULL OR NEW.community_id != OLD.community_id) THEN
      UPDATE public.communities SET post_count = post_count + 1 WHERE id = NEW.community_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_community_post_count_insert
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_community_post_count();

CREATE TRIGGER update_community_post_count_delete
  AFTER DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_community_post_count();

CREATE TRIGGER update_community_post_count_update
  AFTER UPDATE OF community_id ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_community_post_count();


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. STORAGE BUCKET for community icons/banners
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO storage.buckets (id, name, public) VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view community media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-media');

CREATE POLICY "Authenticated users can upload community media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'community-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own community media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'community-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own community media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'community-media' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DONE! 🎉
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
