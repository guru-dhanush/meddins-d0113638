
-- Create health_records table
CREATE TABLE public.health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'pdf',
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'other',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create health_record_shares table
CREATE TABLE public.health_record_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.health_records(id) ON DELETE CASCADE,
  shared_with uuid NOT NULL,
  shared_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(record_id, shared_with)
);

-- Enable RLS
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_record_shares ENABLE ROW LEVEL SECURITY;

-- health_records policies
CREATE POLICY "Users can view own records" ON public.health_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Shared providers can view shared records" ON public.health_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.health_record_shares
      WHERE health_record_shares.record_id = health_records.id
        AND health_record_shares.shared_with = auth.uid()
    )
  );

CREATE POLICY "Users can insert own records" ON public.health_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records" ON public.health_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records" ON public.health_records
  FOR DELETE USING (auth.uid() = user_id);

-- health_record_shares policies
CREATE POLICY "Users can view own shares" ON public.health_record_shares
  FOR SELECT USING (auth.uid() = shared_by OR auth.uid() = shared_with);

CREATE POLICY "Users can create shares for own records" ON public.health_record_shares
  FOR INSERT WITH CHECK (
    auth.uid() = shared_by
    AND EXISTS (
      SELECT 1 FROM public.health_records
      WHERE health_records.id = health_record_shares.record_id
        AND health_records.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own shares" ON public.health_record_shares
  FOR DELETE USING (auth.uid() = shared_by);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('health-records', 'health-records', false);

-- Storage policies
CREATE POLICY "Users can upload own health records" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'health-records' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own health record files" ON storage.objects
  FOR SELECT USING (bucket_id = 'health-records' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own health record files" ON storage.objects
  FOR DELETE USING (bucket_id = 'health-records' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Shared providers can view shared health record files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'health-records'
    AND EXISTS (
      SELECT 1 FROM public.health_record_shares hrs
      JOIN public.health_records hr ON hr.id = hrs.record_id
      WHERE hrs.shared_with = auth.uid()
        AND hr.file_url LIKE '%' || storage.objects.name || '%'
    )
  );
