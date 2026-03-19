import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, addMonths } from 'date-fns';

export interface Expense {
  id: string;
  user_id: string;
  group_id: string;
  description: string;
  amount: number;
  date: string;
  recurrent: boolean;
  notes: string | null;
  created_at: string;
  installment_total: number | null;
  installment_current: number | null;
  installment_group_id: string | null;
  expense_groups?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
}

interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  groupId?: string;
  accountId?: string;
  creditCardId?: string;
}

export function useExpenses(filters?: ExpenseFilters) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['expenses', user?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('*, expense_groups(id, name, color, icon)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.startDate) query = query.gte('date', filters.startDate);
      if (filters?.endDate) query = query.lte('date', filters.endDate);
      if (filters?.groupId) query = query.eq('group_id', filters.groupId);
      if (filters?.accountId) query = query.eq('account_id', filters.accountId);
      if (filters?.creditCardId) query = query.eq('credit_card_id', filters.creditCardId);

      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!user,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (expense: {
      description: string;
      amount: number;
      date: string;
      group_id: string;
      recurrent: boolean;
      notes?: string;
      payment_method?: string;
      account_id?: string | null;
      credit_card_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...expense, user_id: user!.id })
        .select('*, expense_groups(id, name, color, icon)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useCreateInstallments() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: {
      description: string;
      amount: number;
      date: string;
      group_id: string;
      recurrent: boolean;
      notes?: string;
      payment_method?: string;
      account_id?: string | null;
      credit_card_id?: string | null;
      installment_total: number;
    }) => {
      const groupId = crypto.randomUUID();
      const baseDate = new Date(params.date + 'T12:00:00');
      const rows = [];
      for (let i = 0; i < params.installment_total; i++) {
        const installmentDate = addMonths(baseDate, i);
        rows.push({
          description: params.description,
          amount: params.amount,
          date: format(installmentDate, 'yyyy-MM-dd'),
          group_id: params.group_id,
          recurrent: false,
          notes: params.notes || null,
          payment_method: (params.payment_method || 'outro') as any,
          account_id: params.account_id || null,
          credit_card_id: params.credit_card_id || null,
          user_id: user!.id,
          installment_total: params.installment_total,
          installment_current: i + 1,
          installment_group_id: groupId,
        });
      }
      const { error } = await supabase.from('expenses').insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useCancelInstallments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ installmentGroupId, keepBeforeDate }: { installmentGroupId: string; keepBeforeDate: string }) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('installment_group_id', installmentGroupId)
        .gt('date', keepBeforeDate);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      description?: string;
      amount?: number;
      date?: string;
      group_id?: string;
      recurrent?: boolean;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select('*, expense_groups(id, name, color, icon)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}
