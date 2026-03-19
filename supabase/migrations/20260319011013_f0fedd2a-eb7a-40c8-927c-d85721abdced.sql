
-- Family role and status enums
CREATE TYPE public.family_role AS ENUM ('admin', 'member');
CREATE TYPE public.family_status AS ENUM ('pending', 'active');
CREATE TYPE public.visibility_type AS ENUM ('personal', 'family');

-- Families table
CREATE TABLE public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- Family members table
CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id uuid,
  role family_role NOT NULL DEFAULT 'member',
  status family_status NOT NULL DEFAULT 'pending',
  invited_email text,
  invite_token uuid DEFAULT gen_random_uuid(),
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  UNIQUE (family_id, user_id),
  UNIQUE (invite_token)
);
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Add visibility to expenses and incomes
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS visibility visibility_type NOT NULL DEFAULT 'personal';
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS visibility visibility_type NOT NULL DEFAULT 'personal';

-- Helper function: get family IDs for a user (active members only)
CREATE OR REPLACE FUNCTION public.get_user_family_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.family_members
  WHERE user_id = _user_id AND status = 'active'
$$;

-- Helper: check if user is active member of a family
CREATE OR REPLACE FUNCTION public.is_family_member(_user_id uuid, _family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = _user_id AND family_id = _family_id AND status = 'active'
  )
$$;

-- Helper: check if user is admin of a family
CREATE OR REPLACE FUNCTION public.is_family_admin(_user_id uuid, _family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = _user_id AND family_id = _family_id AND role = 'admin' AND status = 'active'
  )
$$;

-- RLS for families: visible to active members
CREATE POLICY "Members can view their families" ON public.families
  FOR SELECT USING (
    id IN (SELECT public.get_user_family_ids(auth.uid()))
  );

CREATE POLICY "Authenticated users can create families" ON public.families
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their families" ON public.families
  FOR UPDATE USING (public.is_family_admin(auth.uid(), id));

CREATE POLICY "Admins can delete their families" ON public.families
  FOR DELETE USING (public.is_family_admin(auth.uid(), id));

-- RLS for family_members: admin sees all in family, member sees only self
CREATE POLICY "Admins see all family members" ON public.family_members
  FOR SELECT USING (
    public.is_family_admin(auth.uid(), family_id)
  );

CREATE POLICY "Members see themselves" ON public.family_members
  FOR SELECT USING (
    auth.uid() = user_id
  );

CREATE POLICY "Admins can insert family members" ON public.family_members
  FOR INSERT WITH CHECK (
    public.is_family_admin(auth.uid(), family_id)
  );

CREATE POLICY "Admins can update family members" ON public.family_members
  FOR UPDATE USING (
    public.is_family_admin(auth.uid(), family_id)
  );

CREATE POLICY "Admins can delete family members" ON public.family_members
  FOR DELETE USING (
    public.is_family_admin(auth.uid(), family_id)
  );

-- Update expenses RLS: drop old policies and recreate with visibility
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can create their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;

CREATE POLICY "Users can view expenses" ON public.expenses
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      visibility = 'family'
      AND EXISTS (
        SELECT 1 FROM public.family_members fm1
        JOIN public.family_members fm2 ON fm1.family_id = fm2.family_id
        WHERE fm1.user_id = auth.uid() AND fm1.status = 'active'
        AND fm2.user_id = expenses.user_id AND fm2.status = 'active'
      )
    )
  );

CREATE POLICY "Users can create their own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Update incomes RLS: drop old policies and recreate with visibility
DROP POLICY IF EXISTS "Users can view their own incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can create their own incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can update their own incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can delete their own incomes" ON public.incomes;

CREATE POLICY "Users can view incomes" ON public.incomes
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      visibility = 'family'
      AND EXISTS (
        SELECT 1 FROM public.family_members fm1
        JOIN public.family_members fm2 ON fm1.family_id = fm2.family_id
        WHERE fm1.user_id = auth.uid() AND fm1.status = 'active'
        AND fm2.user_id = incomes.user_id AND fm2.status = 'active'
      )
    )
  );

CREATE POLICY "Users can create their own incomes" ON public.incomes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own incomes" ON public.incomes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own incomes" ON public.incomes
  FOR DELETE USING (auth.uid() = user_id);

-- Function to accept invite (callable by the invited user)
CREATE OR REPLACE FUNCTION public.accept_invite(_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member RECORD;
  _family RECORD;
BEGIN
  SELECT * INTO _member FROM public.family_members WHERE invite_token = _token AND status = 'pending';
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Convite não encontrado ou já aceito');
  END IF;

  UPDATE public.family_members
  SET user_id = auth.uid(), status = 'active', joined_at = now()
  WHERE id = _member.id;

  SELECT name INTO _family FROM public.families WHERE id = _member.family_id;

  RETURN json_build_object('success', true, 'family_name', _family.name);
END;
$$;
