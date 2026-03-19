
CREATE OR REPLACE FUNCTION public.accept_invite(_token uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _member RECORD;
  _family RECORD;
  _existing RECORD;
BEGIN
  SELECT * INTO _member FROM public.family_members WHERE invite_token = _token AND status = 'pending';
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Convite não encontrado ou já aceito');
  END IF;

  -- Check if user is already a member of this family
  SELECT * INTO _existing FROM public.family_members 
  WHERE family_id = _member.family_id AND user_id = auth.uid() AND status = 'active';
  IF FOUND THEN
    RETURN json_build_object('error', 'Você já é membro desta família');
  END IF;

  UPDATE public.family_members
  SET user_id = auth.uid(), status = 'active', joined_at = now()
  WHERE id = _member.id;

  SELECT name INTO _family FROM public.families WHERE id = _member.family_id;

  RETURN json_build_object('success', true, 'family_name', _family.name);
END;
$function$;
