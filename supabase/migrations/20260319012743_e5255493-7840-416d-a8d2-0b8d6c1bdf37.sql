
-- Tags table
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);

-- Expense tags junction table
CREATE TABLE public.expense_tags (
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (expense_id, tag_id)
);

ALTER TABLE public.expense_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their expense tags" ON public.expense_tags FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.expenses WHERE id = expense_id AND user_id = auth.uid()));
CREATE POLICY "Users can create their expense tags" ON public.expense_tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.expenses WHERE id = expense_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete their expense tags" ON public.expense_tags FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.expenses WHERE id = expense_id AND user_id = auth.uid()));
