import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type IncomeCategory = 'salario' | 'freelance' | 'investimento' | 'presente' | 'outro';

export const INCOME_CATEGORIES: { value: IncomeCategory; label: string; icon: string }[] = [
  { value: 'salario', label: 'Salário', icon: '💰' },
  { value: 'freelance', label: 'Freelance', icon: '💻' },
  { value: 'investimento', label: 'Investimento', icon: '📈' },
  { value: 'presente', label: 'Presente', icon: '🎁' },
  { value: 'outro', label: 'Outro', icon: '📦' },
];

export interface Income {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  date: string;
  category: IncomeCategory;
  recurrent: boolean;
  notes: string | null;
  created_at: string;
}

interface IncomeFilters {
  startDate?: string;
  endDate?: string;
  category?: IncomeCategory;
}

export function useIncomes(filters?: IncomeFilters) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['incomes', user?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('incomes')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.startDate) query = query.gte('date', filters.startDate);
      if (filters?.endDate) query = query.lte('date', filters.endDate);
      if (filters?.category) query = query.eq('category', filters.category);

      const { data, error } = await query;
      if (error) throw error;
      return data as Income[];
    },
    enabled: !!user,
  });
}

export function useCreateIncome() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (income: {
      description: string;
      amount: number;
      date: string;
      category: IncomeCategory;
      recurrent: boolean;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('incomes')
        .insert({ ...income, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incomes'] }),
  });
}

export function useUpdateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      description?: string;
      amount?: number;
      date?: string;
      category?: IncomeCategory;
      recurrent?: boolean;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('incomes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incomes'] }),
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('incomes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incomes'] }),
  });
}
