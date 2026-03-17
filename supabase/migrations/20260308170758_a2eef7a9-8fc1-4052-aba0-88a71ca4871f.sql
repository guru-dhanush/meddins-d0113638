
-- Fix: All policies on communities are RESTRICTIVE, which means no access is granted.
-- Need at least one PERMISSIVE policy per operation.

-- Drop all existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view public communities" ON public.communities;
DROP POLICY IF EXISTS "Users can create communities" ON public.communities;
DROP POLICY IF EXISTS "Creator can update community" ON public.communities;
DROP POLICY IF EXISTS "Creator can delete community" ON public.communities;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Anyone can view public communities"
  ON public.communities FOR SELECT
  USING (true);

CREATE POLICY "Users can create communities"
  ON public.communities FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creator can update community"
  ON public.communities FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creator can delete community"
  ON public.communities FOR DELETE
  USING (auth.uid() = creator_id);

-- Also fix community_members policies (same issue)
DROP POLICY IF EXISTS "Anyone can view community members" ON public.community_members;
DROP POLICY IF EXISTS "Users can join communities" ON public.community_members;
DROP POLICY IF EXISTS "Members can update own membership" ON public.community_members;
DROP POLICY IF EXISTS "Moderators can update members" ON public.community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON public.community_members;
DROP POLICY IF EXISTS "Moderators can remove members" ON public.community_members;

CREATE POLICY "Anyone can view community members"
  ON public.community_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join communities"
  ON public.community_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can update own membership"
  ON public.community_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Creator can manage members"
  ON public.community_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_members.community_id
        AND c.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave communities"
  ON public.community_members FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Creator can kick members"
  ON public.community_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_members.community_id
        AND c.creator_id = auth.uid()
    )
  );
