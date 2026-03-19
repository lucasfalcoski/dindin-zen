import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface FamilyBudget {
  id: string;
  family_id: string;
  group_id: string;
  month: string;
  amount: number;
  created_at: string;
}

export function useFamilyBudgets(familyId: string | null, month: string) {
  return useQuery({
    queryKey: ['family_budgets', familyId, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_budgets')
        .select('*')
        .eq('family_id', familyId!)
        .eq('month', month);
      if (error) throw error;
      return data as FamilyBudget[];
    },
    enabled: !!familyId && !!month,
  });
}

export function useUpsertFamilyBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { family_id: string; group_id: string; month: string; amount: number }) => {
      const { data, error } = await supabase
        .from('family_budgets')
        .upsert(params as any, { onConflict: 'family_id,group_id,month' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family_budgets'] }),
  });
}
