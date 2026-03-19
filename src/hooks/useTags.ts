import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export function useTags() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['tags', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Tag[];
    },
    enabled: !!user,
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (tag: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from('tags')
        .insert({ ...tag, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string }) => {
      const { error } = await supabase.from('tags').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      qc.invalidateQueries({ queryKey: ['expense_tags'] });
    },
  });
}

export function useExpenseTags(expenseId?: string) {
  return useQuery({
    queryKey: ['expense_tags', expenseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_tags')
        .select('tag_id, tags(id, name, color)')
        .eq('expense_id', expenseId!);
      if (error) throw error;
      return (data as any[]).map(d => d.tags as Tag);
    },
    enabled: !!expenseId,
  });
}

export function useSetExpenseTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ expenseId, tagIds }: { expenseId: string; tagIds: string[] }) => {
      // Delete existing
      await supabase.from('expense_tags').delete().eq('expense_id', expenseId);
      // Insert new
      if (tagIds.length > 0) {
        const rows = tagIds.map(tag_id => ({ expense_id: expenseId, tag_id }));
        const { error } = await supabase.from('expense_tags').insert(rows as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense_tags'] });
      qc.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useTagsWithStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['tags_stats', user?.id],
    queryFn: async () => {
      const { data: tags, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .order('name');
      if (tagsError) throw tagsError;

      const { data: expenseTags, error: etError } = await supabase
        .from('expense_tags')
        .select('tag_id, expenses(amount)');
      if (etError) throw etError;

      const statsMap: Record<string, { count: number; total: number }> = {};
      (expenseTags as any[]).forEach(et => {
        if (!statsMap[et.tag_id]) statsMap[et.tag_id] = { count: 0, total: 0 };
        statsMap[et.tag_id].count++;
        statsMap[et.tag_id].total += Number(et.expenses?.amount || 0);
      });

      return (tags as Tag[]).map(t => ({
        ...t,
        count: statsMap[t.id]?.count || 0,
        total: statsMap[t.id]?.total || 0,
      }));
    },
    enabled: !!user,
  });
}
