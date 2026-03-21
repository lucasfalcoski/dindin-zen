
CREATE TABLE public.whatsapp_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  UNIQUE(user_id)
);

ALTER TABLE public.whatsapp_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own whatsapp connection"
  ON public.whatsapp_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own whatsapp connection"
  ON public.whatsapp_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own whatsapp connection"
  ON public.whatsapp_users FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own whatsapp connection"
  ON public.whatsapp_users FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
