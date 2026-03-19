
-- Expense splits: add split_group_id to expenses (already has the column structure, we just need it)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS split_group_id uuid;

-- Settlements table for tracking payments between family members
CREATE TABLE public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  notes text,
  settled_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Settlements RLS: visible to active family members
CREATE POLICY "Family members can view settlements"
  ON public.settlements FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can create settlements"
  ON public.settlements FOR INSERT
  WITH CHECK (public.is_family_member(auth.uid(), family_id) AND auth.uid() = from_user_id);

CREATE POLICY "Settlement creator can delete"
  ON public.settlements FOR DELETE
  USING (auth.uid() = from_user_id);

-- Family budgets table
CREATE TABLE public.family_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.expense_groups(id) ON DELETE CASCADE,
  month date NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (family_id, group_id, month)
);

ALTER TABLE public.family_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view family budgets"
  ON public.family_budgets FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can manage family budgets"
  ON public.family_budgets FOR INSERT
  WITH CHECK (public.is_family_admin(auth.uid(), family_id));

CREATE POLICY "Family admins can update family budgets"
  ON public.family_budgets FOR UPDATE
  USING (public.is_family_admin(auth.uid(), family_id));

CREATE POLICY "Family admins can delete family budgets"
  ON public.family_budgets FOR DELETE
  USING (public.is_family_admin(auth.uid(), family_id));

-- Profiles table to store user display names for family features
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles of family members"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.family_members fm1
      JOIN public.family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid() AND fm1.status = 'active'
      AND fm2.user_id = profiles.id AND fm2.status = 'active'
    )
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
