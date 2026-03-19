
-- Fix: allow family creator to see their own family (needed for INSERT...RETURNING)
DROP POLICY IF EXISTS "Members can view their families" ON public.families;

CREATE POLICY "Members can view their families" ON public.families
  FOR SELECT USING (
    created_by = auth.uid()
    OR
    id IN (SELECT get_user_family_ids(auth.uid()))
  );
