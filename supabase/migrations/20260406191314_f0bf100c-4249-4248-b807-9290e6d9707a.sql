
-- RPC: create family + admin member atomically
CREATE OR REPLACE FUNCTION public.create_family_with_admin(_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _family_id uuid;
  _created_at timestamptz := now();
BEGIN
  INSERT INTO public.families (name, created_by, created_at)
  VALUES (_name, auth.uid(), _created_at)
  RETURNING id INTO _family_id;

  INSERT INTO public.family_members (family_id, user_id, role, status, joined_at)
  VALUES (_family_id, auth.uid(), 'admin', 'active', _created_at);

  RETURN json_build_object(
    'id', _family_id,
    'name', _name,
    'created_by', auth.uid(),
    'created_at', _created_at
  );
END;
$$;

-- RPC: invite a member (admin only)
CREATE OR REPLACE FUNCTION public.invite_family_member(_family_id uuid, _email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member RECORD;
BEGIN
  IF NOT is_family_admin(auth.uid(), _family_id) THEN
    RETURN json_build_object('error', 'Apenas administradores podem convidar membros');
  END IF;

  INSERT INTO public.family_members (family_id, invited_email, role, status)
  VALUES (_family_id, _email, 'member', 'pending')
  RETURNING * INTO _member;

  RETURN row_to_json(_member);
END;
$$;

-- RPC: add manual member (admin only)
CREATE OR REPLACE FUNCTION public.add_manual_family_member(_family_id uuid, _name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member RECORD;
BEGIN
  IF NOT is_family_admin(auth.uid(), _family_id) THEN
    RETURN json_build_object('error', 'Apenas administradores podem adicionar membros');
  END IF;

  INSERT INTO public.family_members (family_id, invited_email, role, status, joined_at)
  VALUES (_family_id, _name, 'member', 'active', now())
  RETURNING * INTO _member;

  RETURN row_to_json(_member);
END;
$$;
