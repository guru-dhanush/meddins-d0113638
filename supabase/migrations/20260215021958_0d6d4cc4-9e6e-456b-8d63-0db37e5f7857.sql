
-- Allow authenticated users to insert their own role (for OAuth role selection flow)
CREATE POLICY "Users can insert own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
