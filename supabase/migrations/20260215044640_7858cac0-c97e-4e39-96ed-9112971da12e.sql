
-- 1. Extend app_role enum
ALTER TYPE public.app_role ADD VALUE 'organization';

-- 2. Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  logo_url text,
  phone text,
  email text,
  address text,
  city text,
  website text,
  is_verified boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations viewable by everyone" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Owners can insert own org" ON public.organizations FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own org" ON public.organizations FOR UPDATE USING (auth.uid() = owner_id);

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create org_members table
CREATE TABLE public.org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'pending',
  invited_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is org owner
CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = _org_id AND owner_id = _user_id
  )
$$;

CREATE POLICY "Org owners can manage members" ON public.org_members FOR ALL
  USING (public.is_org_owner(auth.uid(), organization_id));

CREATE POLICY "Members can view own membership" ON public.org_members FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Add organization_id to provider_profiles
ALTER TABLE public.provider_profiles
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- 5. Allow org owners to update provider profiles in their org
CREATE POLICY "Org owners can update org provider profiles" ON public.provider_profiles FOR UPDATE
  USING (public.is_org_owner(auth.uid(), organization_id));

-- 6. Allow org owners to view bookings for their providers
CREATE POLICY "Org owners can view org provider bookings" ON public.bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.provider_profiles pp
    WHERE pp.id = bookings.provider_id
      AND pp.organization_id IS NOT NULL
      AND public.is_org_owner(auth.uid(), pp.organization_id)
  ));

CREATE POLICY "Org owners can update org provider bookings" ON public.bookings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.provider_profiles pp
    WHERE pp.id = bookings.provider_id
      AND pp.organization_id IS NOT NULL
      AND public.is_org_owner(auth.uid(), pp.organization_id)
  ));
