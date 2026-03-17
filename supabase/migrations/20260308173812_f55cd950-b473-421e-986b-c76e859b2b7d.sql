
-- Saved providers table
CREATE TABLE public.saved_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider_id)
);

ALTER TABLE public.saved_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can save providers" ON public.saved_providers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own saved providers" ON public.saved_providers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can unsave providers" ON public.saved_providers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Saved communities table
CREATE TABLE public.saved_communities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, community_id)
);

ALTER TABLE public.saved_communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can save communities" ON public.saved_communities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own saved communities" ON public.saved_communities FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can unsave communities" ON public.saved_communities FOR DELETE TO authenticated USING (auth.uid() = user_id);
