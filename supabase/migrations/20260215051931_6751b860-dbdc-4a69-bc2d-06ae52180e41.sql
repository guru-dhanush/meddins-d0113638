
-- Add display_order column to org_members for team reordering
ALTER TABLE public.org_members
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
