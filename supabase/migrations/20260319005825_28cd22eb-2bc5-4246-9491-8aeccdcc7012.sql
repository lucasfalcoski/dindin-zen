
ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS installment_total integer,
  ADD COLUMN IF NOT EXISTS installment_current integer,
  ADD COLUMN IF NOT EXISTS installment_group_id uuid;
