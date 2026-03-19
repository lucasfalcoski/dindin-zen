import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface CreditCard {
  id: string;
  user_id: string;
  account_id: string | null;
  name: string;
  limit: number;
  closing_day: number;
  due_day: number;
  color: string;
  created_at: string;
}

export function useCreditCards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['credit_cards', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as CreditCard[];
    },
    enabled: !!user,
  });
}

export function useCreateCreditCard() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (card: {
      name: string;
      limit: number;
      closing_day: number;
      due_day: number;
      account_id?: string;
      color?: string;
    }) => {
      const { data, error } = await supabase
        .from('credit_cards')
        .insert({ ...card, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credit_cards'] }),
  });
}

export function useUpdateCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; limit?: number; closing_day?: number; due_day?: number; account_id?: string; color?: string }) => {
      const { data, error } = await supabase
        .from('credit_cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credit_cards'] }),
  });
}

export function useDeleteCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('credit_cards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credit_cards'] }),
  });
}
