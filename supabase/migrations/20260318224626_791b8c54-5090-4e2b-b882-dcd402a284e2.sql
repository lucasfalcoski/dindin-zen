-- Create expense_groups table
CREATE TABLE public.expense_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748b',
  icon TEXT NOT NULL DEFAULT '📦',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.expense_groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  recurrent BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies for expense_groups
CREATE POLICY "Users can view their own groups" ON public.expense_groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own groups" ON public.expense_groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own groups" ON public.expense_groups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own groups" ON public.expense_groups FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for expenses
CREATE POLICY "Users can view their own expenses" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own expenses" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expenses" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_expenses_user_date ON public.expenses(user_id, date DESC);
CREATE INDEX idx_expenses_group ON public.expenses(group_id);
CREATE INDEX idx_expense_groups_user ON public.expense_groups(user_id);

-- Function to seed default groups on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_groups()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.expense_groups (user_id, name, color, icon, is_default) VALUES
    (NEW.id, 'Moradia', '#3b82f6', '🏠', true),
    (NEW.id, 'Alimentação', '#f59e0b', '🍕', true),
    (NEW.id, 'Transporte', '#10b981', '🚗', true),
    (NEW.id, 'Saúde', '#ef4444', '🏥', true),
    (NEW.id, 'Lazer', '#8b5cf6', '🎉', true),
    (NEW.id, 'Educação', '#06b6d4', '📚', true),
    (NEW.id, 'Vestuário', '#ec4899', '👕', true),
    (NEW.id, 'Outros', '#64748b', '📦', true);
  RETURN NEW;
END;
$$;

-- Trigger to seed groups on signup
CREATE TRIGGER on_auth_user_created_seed_groups
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_groups();