import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Family {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string | null;
  role: 'admin' | 'member';
  status: 'pending' | 'active' | 'manual';
  invited_email: string | null;
  invite_token: string | null;
  invited_at: string;
  joined_at: string | null;
}

export function useMyFamilies() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['families', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('families')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Family[];
    },
    enabled: !!user,
  });
}

export function useFamilyMembers(familyId: string | undefined) {
  return useQuery({
    queryKey: ['family_members', familyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyId!)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      // Filter out ghost members (active but no user_id = orphaned), keep manual members
      return (data as FamilyMember[]).filter(
        m => !(m.user_id === null && m.status === 'active')
      );
    },
    enabled: !!familyId,
  });
}

export function useCreateFamily() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.rpc('create_family_with_admin', { _name: name });
      if (error) throw error;
      return { id: data.id, name: data.name, created_by: data.created_by, created_at: new Date().toISOString() } as Family;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families'] });
      qc.invalidateQueries({ queryKey: ['family_members'] });
    },
  });
}

export function useUpdateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('families')
        .update({ name })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['families'] }),
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ familyId, email }: { familyId: string; email: string }) => {
      const { data, error } = await supabase.rpc('invite_family_member', { _family_id: familyId, _email: email });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return { ...data, invite_token: data.invite_token } as FamilyMember;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family_members'] }),
  });
}

export function useAddManualMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ familyId, name }: { familyId: string; name: string }) => {
      const { data, error } = await supabase.rpc('add_manual_family_member', { _family_id: familyId, _name: name });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as FamilyMember;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family_members'] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family_members'] }),
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      if (!token || token.length < 10) throw new Error('Token inválido');
      const { data, error } = await supabase.rpc('accept_invite', { _token: token });
      if (error) throw error;
      if (!data) throw new Error('Resposta vazia do servidor');
      return data as { success?: boolean; error?: string; family_name?: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families'] });
      qc.invalidateQueries({ queryKey: ['family_members'] });
    },
  });
}

// Get invite info without auth (public query by token)
export function useInviteInfo(token: string | undefined) {
  return useQuery({
    queryKey: ['invite_info', token],
    queryFn: async () => {
      // Use a public RPC or direct query - we need to get family name from token
      // Since family_members has RLS, we'll use the accept_invite function approach
      // For now, just return the token - the accept flow handles validation
      return { token };
    },
    enabled: !!token,
  });
}
