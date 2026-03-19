import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Settlement {
  id: string;
  family_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  notes: string | null;
  settled_at: string;
  created_at: string;
}

export function useSettlements(familyId: string | null) {
  return useQuery({
    queryKey: ['settlements', familyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('family_id', familyId!)
        .order('settled_at', { ascending: false });
      if (error) throw error;
      return data as Settlement[];
    },
    enabled: !!familyId,
  });
}

export function useCreateSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      family_id: string;
      from_user_id: string;
      to_user_id: string;
      amount: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('settlements')
        .insert(params as any)
        .select()
        .single();
      if (error) throw error;
      return data as Settlement;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settlements'] });
    },
  });
}
