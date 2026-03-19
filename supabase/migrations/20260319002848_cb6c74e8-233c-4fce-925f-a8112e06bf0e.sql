
-- Create enums
CREATE TYPE public.account_type AS ENUM ('corrente', 'poupanca', 'carteira', 'investimento');
CREATE TYPE public.payment_method AS ENUM ('dinheiro', 'debito', 'credito', 'pix', 'transferencia', 'outro');

-- Create accounts table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type account_type NOT NULL DEFAULT 'corrente',
  bank_name TEXT,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own accounts" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own accounts" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own accounts" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- Create credit_cards table
CREATE TABLE public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  "limit" NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_day INT NOT NULL DEFAULT 1,
  due_day INT NOT NULL DEFAULT 10,
  color TEXT NOT NULL DEFAULT '#8b5cf6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own credit_cards" ON public.credit_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own credit_cards" ON public.credit_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own credit_cards" ON public.credit_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own credit_cards" ON public.credit_cards FOR DELETE USING (auth.uid() = user_id);

-- Add new columns to expenses
ALTER TABLE public.expenses
  ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  ADD COLUMN payment_method payment_method NOT NULL DEFAULT 'outro';
