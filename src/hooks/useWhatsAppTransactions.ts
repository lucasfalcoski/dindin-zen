import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface WhatsAppTransaction {
  id: string;
  user_id: string;
  phone: string;
  raw_message: string;
  parsed_amount: number | null;
  parsed_description: string | null;
  parsed_type: 'expense' | 'income' | null;
  parsed_date: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'error';
  expense_id: string | null;
  income_id: string | null;
  error_message: string | null;
  created_at: string;
}

export function useWhatsAppTransactions(statusFilter?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['whatsapp_transactions', user?.id, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as WhatsAppTransaction[];
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });
}

export function usePendingWhatsAppTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['whatsapp_transactions_pending', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_transactions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as WhatsAppTransaction[];
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });
}

/** Check if an expense or income was created via WhatsApp */
export function useWhatsAppConfirmedIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['whatsapp_confirmed_ids', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_transactions')
        .select('expense_id, income_id')
        .eq('user_id', user!.id)
        .eq('status', 'confirmed');
      if (error) throw error;
      const expenseIds = new Set<string>();
      const incomeIds = new Set<string>();
      (data || []).forEach((t: any) => {
        if (t.expense_id) expenseIds.add(t.expense_id);
        if (t.income_id) incomeIds.add(t.income_id);
      });
      return { expenseIds, incomeIds };
    },
    enabled: !!user,
  });
}
