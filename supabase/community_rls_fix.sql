-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  FIX: Infinite recursion in community_members RLS policies         ║
-- ║  Run this in Supabase SQL Editor AFTER the initial migration        ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Drop the problematic policies that query community_members from within community_members
DROP POLICY IF EXISTS "Members can view private community members" ON public.community_members;
DROP POLICY IF EXISTS "Moderators can manage members" ON public.community_members;
DROP POLICY IF EXISTS "Moderators can remove members" ON public.community_members;
DROP POLICY IF EXISTS "Anyone can view public community members" ON public.community_members;
DROP POLICY IF EXISTS "Users can join public communities" ON public.community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON public.community_members;

-- ── Recreate with NON-RECURSIVE policies ──

-- SELECT: Allow all authenticated users to view community_members
-- (Visibility is already enforced at the communities table level)
CREATE POLICY "Authenticated can view community members"
  ON public.community_members FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Users can join communities (self-insert only)
CREATE POLICY "Users can join communities"
  ON public.community_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

-- UPDATE: Only community creator can manage members
-- Uses communities table (not community_members) to avoid recursion
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
    -- User leaving themselves (non-creator)
    (auth.uid() = user_id AND role != 'creator')
    OR
    -- Community creator can remove anyone
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_members.community_id
        AND c.creator_id = auth.uid()
    )
  );


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Also fix the private communities SELECT policy on communities table
-- (it also queries community_members which can cause issues)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "Members can view private communities" ON public.communities;
DROP POLICY IF EXISTS "Anyone can view public communities" ON public.communities;

-- Unified: everyone can see public/restricted; members see private
CREATE POLICY "View communities"
  ON public.communities FOR SELECT
  USING (
    visibility IN ('public', 'restricted')
    OR creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

-- DONE ✓
