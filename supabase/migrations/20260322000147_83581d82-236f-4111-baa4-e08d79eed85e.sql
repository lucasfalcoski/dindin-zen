
CREATE TABLE public.whatsapp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  raw_message text NOT NULL,
  parsed_amount numeric(12,2),
  parsed_description text,
  parsed_type text CHECK (parsed_type IN ('expense', 'income')),
  parsed_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'error')),
  expense_id uuid,
  income_id uuid,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own whatsapp transactions"
  ON public.whatsapp_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own whatsapp transactions"
  ON public.whatsapp_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own whatsapp transactions"
  ON public.whatsapp_transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own whatsapp transactions"
  ON public.whatsapp_transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
