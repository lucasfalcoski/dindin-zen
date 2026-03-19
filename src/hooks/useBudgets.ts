import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Budget {
  id: string;
  user_id: string;
  group_id: string;
  month: string;
  amount: number;
  created_at: string;
}

export function useBudgets(month: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['budgets', user?.id, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('month', month);
      if (error) throw error;
      return data as Budget[];
    },
    enabled: !!user && !!month,
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: { group_id: string; month: string; amount: number }) => {
      const { data, error } = await supabase
        .from('budgets')
        .upsert(
          { user_id: user!.id, group_id: params.group_id, month: params.month, amount: params.amount },
          { onConflict: 'user_id,group_id,month' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useCopyBudgets() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ fromMonth, toMonth }: { fromMonth: string; toMonth: string }) => {
      // Fetch budgets from previous month
      const { data: prev, error: fetchErr } = await supabase
        .from('budgets')
        .select('*')
        .eq('month', fromMonth);
      if (fetchErr) throw fetchErr;
      if (!prev || prev.length === 0) throw new Error('Nenhum orçamento no mês anterior');

      const rows = prev.map(b => ({
        user_id: user!.id,
        group_id: b.group_id,
        month: toMonth,
        amount: b.amount,
      }));

      const { error } = await supabase
        .from('budgets')
        .upsert(rows, { onConflict: 'user_id,group_id,month' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}
