import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface FamilyMemberSummary {
  user_id: string;
  display_name: string | null;
  avatar_emoji: string | null;
  avatar_color: string;
  total_expenses: number;
  total_income: number;
}

export interface ExpenseByGroup {
  group_id: string;
  group_name: string;
  group_icon: string;
  group_color: string;
  total: number;
}

export interface FamilySummary {
  total_income: number;
  total_expenses: number;
  members: FamilyMemberSummary[] | null;
  expenses_by_group: ExpenseByGroup[] | null;
}

export function useFamilySummary(familyId: string | null, monthStart: string, monthEnd: string) {
  return useQuery({
    queryKey: ['family_summary', familyId, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_family_summary', {
        _family_id: familyId!,
        _month_start: monthStart,
        _month_end: monthEnd,
      });
      if (error) throw error;
      return data as unknown as FamilySummary;
    },
    enabled: !!familyId,
  });
}

export interface FamilyBalanceData {
  balances: FamilyMemberSummary[] | null;
  settlements: Array<{
    id: string;
    from_user_id: string;
    to_user_id: string;
    amount: number;
    notes: string | null;
    settled_at: string;
    from_name: string | null;
    to_name: string | null;
  }> | null;
}

export function useFamilyBalance(familyId: string | null, monthStart: string, monthEnd: string) {
  return useQuery({
    queryKey: ['family_balance', familyId, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_family_balance', {
        _family_id: familyId!,
        _month_start: monthStart,
        _month_end: monthEnd,
      });
      if (error) throw error;
      return data as unknown as FamilyBalanceData;
    },
    enabled: !!familyId,
  });
}
