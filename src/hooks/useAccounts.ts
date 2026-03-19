import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type AccountType = 'corrente' | 'poupanca' | 'carteira' | 'investimento';

export const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: 'corrente', label: 'Conta Corrente', icon: '🏦' },
  { value: 'poupanca', label: 'Poupança', icon: '🐷' },
  { value: 'carteira', label: 'Carteira', icon: '👛' },
  { value: 'investimento', label: 'Investimento', icon: '📈' },
];

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  bank_name: string | null;
  balance: number;
  color: string;
  created_at: string;
}

export function useAccounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Account[];
    },
    enabled: !!user,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (account: {
      name: string;
      type: AccountType;
      bank_name?: string;
      balance?: number;
      color?: string;
    }) => {
      const { data, error } = await supabase
        .from('accounts')
        .insert({ ...account, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; type?: AccountType; bank_name?: string; balance?: number; color?: string }) => {
      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}
