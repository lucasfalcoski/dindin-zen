
-- Add shared_with_family column to accounts and credit_cards
ALTER TABLE public.accounts ADD COLUMN shared_with_family boolean NOT NULL DEFAULT false;
ALTER TABLE public.credit_cards ADD COLUMN shared_with_family boolean NOT NULL DEFAULT false;

-- Allow family members to view shared accounts
CREATE POLICY "Family members can view shared accounts"
ON public.accounts
FOR SELECT
TO authenticated
USING (
  shared_with_family = true
  AND EXISTS (
    SELECT 1
    FROM family_members fm1
    JOIN family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.user_id = auth.uid()
      AND fm1.status = 'active'
      AND fm2.user_id = accounts.user_id
      AND fm2.status = 'active'
  )
);

-- Allow family members to view shared credit cards
CREATE POLICY "Family members can view shared credit cards"
ON public.credit_cards
FOR SELECT
TO authenticated
USING (
  shared_with_family = true
  AND EXISTS (
    SELECT 1
    FROM family_members fm1
    JOIN family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.user_id = auth.uid()
      AND fm1.status = 'active'
      AND fm2.user_id = credit_cards.user_id
      AND fm2.status = 'active'
  )
);

-- Create get_family_summary RPC
CREATE OR REPLACE FUNCTION public.get_family_summary(_family_id uuid, _month_start date, _month_end date)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result json;
BEGIN
  -- Verify caller is a family member
  IF NOT is_family_member(auth.uid(), _family_id) THEN
    RETURN json_build_object('error', 'Not a family member');
  END IF;

  SELECT json_build_object(
    'total_income', COALESCE((
      SELECT SUM(i.amount)
      FROM incomes i
      JOIN family_members fm ON fm.user_id = i.user_id AND fm.family_id = _family_id AND fm.status = 'active'
      WHERE i.visibility = 'family' AND i.date >= _month_start AND i.date <= _month_end
    ), 0),
    'total_expenses', COALESCE((
      SELECT SUM(e.amount)
      FROM expenses e
      JOIN family_members fm ON fm.user_id = e.user_id AND fm.family_id = _family_id AND fm.status = 'active'
      WHERE e.visibility = 'family' AND e.date >= _month_start AND e.date <= _month_end
    ), 0),
    'members', (
      SELECT json_agg(json_build_object(
        'user_id', fm.user_id,
        'display_name', p.display_name,
        'avatar_emoji', p.avatar_emoji,
        'avatar_color', p.avatar_color,
        'total_expenses', COALESCE((
          SELECT SUM(e.amount) FROM expenses e
          WHERE e.user_id = fm.user_id AND e.visibility = 'family'
            AND e.date >= _month_start AND e.date <= _month_end
        ), 0),
        'total_income', COALESCE((
          SELECT SUM(i.amount) FROM incomes i
          WHERE i.user_id = fm.user_id AND i.visibility = 'family'
            AND i.date >= _month_start AND i.date <= _month_end
        ), 0)
      ))
      FROM family_members fm
      LEFT JOIN profiles p ON p.id = fm.user_id
      WHERE fm.family_id = _family_id AND fm.status = 'active' AND fm.user_id IS NOT NULL
    ),
    'expenses_by_group', (
      SELECT json_agg(json_build_object(
        'group_id', eg.id,
        'group_name', eg.name,
        'group_icon', eg.icon,
        'group_color', eg.color,
        'total', sub.total
      ))
      FROM (
        SELECT e.group_id, SUM(e.amount) as total
        FROM expenses e
        JOIN family_members fm ON fm.user_id = e.user_id AND fm.family_id = _family_id AND fm.status = 'active'
        WHERE e.visibility = 'family' AND e.date >= _month_start AND e.date <= _month_end
        GROUP BY e.group_id
      ) sub
      JOIN expense_groups eg ON eg.id = sub.group_id
    )
  ) INTO _result;

  RETURN _result;
END;
$$;

-- Create get_family_balance RPC
CREATE OR REPLACE FUNCTION public.get_family_balance(_family_id uuid, _month_start date, _month_end date)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result json;
BEGIN
  IF NOT is_family_member(auth.uid(), _family_id) THEN
    RETURN json_build_object('error', 'Not a family member');
  END IF;

  SELECT json_build_object(
    'balances', (
      SELECT json_agg(json_build_object(
        'user_id', fm.user_id,
        'display_name', p.display_name,
        'avatar_emoji', p.avatar_emoji,
        'avatar_color', p.avatar_color,
        'total_expenses', COALESCE((
          SELECT SUM(e.amount) FROM expenses e
          WHERE e.user_id = fm.user_id AND e.visibility = 'family'
            AND e.date >= _month_start AND e.date <= _month_end
        ), 0),
        'total_income', COALESCE((
          SELECT SUM(i.amount) FROM incomes i
          WHERE i.user_id = fm.user_id AND i.visibility = 'family'
            AND i.date >= _month_start AND i.date <= _month_end
        ), 0)
      ))
      FROM family_members fm
      LEFT JOIN profiles p ON p.id = fm.user_id
      WHERE fm.family_id = _family_id AND fm.status = 'active' AND fm.user_id IS NOT NULL
    ),
    'settlements', (
      SELECT json_agg(json_build_object(
        'id', s.id,
        'from_user_id', s.from_user_id,
        'to_user_id', s.to_user_id,
        'amount', s.amount,
        'notes', s.notes,
        'settled_at', s.settled_at,
        'from_name', pf.display_name,
        'to_name', pt.display_name
      ) ORDER BY s.settled_at DESC)
      FROM settlements s
      LEFT JOIN profiles pf ON pf.id = s.from_user_id
      LEFT JOIN profiles pt ON pt.id = s.to_user_id
      WHERE s.family_id = _family_id
        AND s.settled_at >= _month_start::timestamptz
    )
  ) INTO _result;

  RETURN _result;
END;
$$;
