
DROP POLICY IF EXISTS "Admins can insert family members" ON public.family_members;

CREATE POLICY "Admins can insert family members" ON public.family_members
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id AND role = 'admin')
    OR
    public.is_family_admin(auth.uid(), family_id)
  );
