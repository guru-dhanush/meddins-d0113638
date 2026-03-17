
-- Add folder_id column to health_records for custom sub-folder organization
CREATE TABLE public.health_record_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  parent_category text, -- null = root custom folder, or 'lab_report'/'prescription'/etc. for sub-folders
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.health_records ADD COLUMN folder_id uuid REFERENCES public.health_record_folders(id) ON DELETE SET NULL;

ALTER TABLE public.health_record_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folders" ON public.health_record_folders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own folders" ON public.health_record_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own folders" ON public.health_record_folders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own folders" ON public.health_record_folders
  FOR DELETE USING (auth.uid() = user_id);
