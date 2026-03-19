import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  color: string;
  icon: string;
  created_at: string;
}

export interface GoalContribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  date: string;
  created_at: string;
}

export function useGoals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!user,
  });
}

export function useGoalContributions(goalId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['goal_contributions', goalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_contributions')
        .select('*')
        .eq('goal_id', goalId!)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as GoalContribution[];
    },
    enabled: !!user && !!goalId,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (goal: { name: string; target_amount: number; deadline?: string; color?: string; icon?: string }) => {
      const { data, error } = await supabase
        .from('goals')
        .insert({ ...goal, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; target_amount?: number; deadline?: string; color?: string; icon?: string }) => {
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useAddContribution() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ goalId, amount }: { goalId: string; amount: number }) => {
      // Insert contribution
      const { error: contribErr } = await supabase
        .from('goal_contributions')
        .insert({ goal_id: goalId, user_id: user!.id, amount } as any);
      if (contribErr) throw contribErr;

      // Update current_amount on goal
      const { data: goal } = await supabase
        .from('goals')
        .select('current_amount')
        .eq('id', goalId)
        .single();

      const newAmount = Number(goal?.current_amount || 0) + amount;
      const { error: updateErr } = await supabase
        .from('goals')
        .update({ current_amount: newAmount })
        .eq('id', goalId);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['goal_contributions'] });
    },
  });
}
