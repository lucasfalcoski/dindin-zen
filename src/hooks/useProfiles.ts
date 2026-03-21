import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_color: string;
  avatar_emoji: string | null;
  created_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        const { data: created, error: createErr } = await supabase
          .from('profiles')
          .insert({ id: user!.id, display_name: user!.email?.split('@')[0] || 'Usuário' } as any)
          .select()
          .single();
        if (createErr) throw createErr;
        return created as Profile;
      }
      return data as Profile;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (updates: { display_name?: string; avatar_color?: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export function useFamilyProfiles(userIds: string[]) {
  return useQuery({
    queryKey: ['profiles', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      if (error) throw error;
      return data as Profile[];
    },
    enabled: userIds.length > 0,
  });
}
