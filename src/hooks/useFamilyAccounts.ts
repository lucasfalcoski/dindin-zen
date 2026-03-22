import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useView } from '@/contexts/ViewContext';

export interface FamilyAccount {
  id: string;
  user_id: string;
  name: string;
  type: string;
  bank_name: string | null;
  balance: number;
  color: string;
  shared_with_family: boolean;
  owner_name?: string;
  owner_emoji?: string;
}

export interface FamilyCreditCard {
  id: string;
  user_id: string;
  name: string;
  limit: number;
  closing_day: number;
  due_day: number;
  color: string;
  shared_with_family: boolean;
  owner_name?: string;
  owner_emoji?: string;
}

export function useFamilySharedAccounts() {
  const { user } = useAuth();
  const { familyId } = useView();
  return useQuery({
    queryKey: ['family_shared_accounts', familyId],
    queryFn: async () => {
      // Get all accounts visible to user (own + shared via RLS)
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('shared_with_family', true)
        .neq('user_id', user!.id)
        .order('name');
      if (error) throw error;

      // Get profiles for owners
      const ownerIds = [...new Set((accounts || []).map(a => a.user_id))];
      let profiles: any[] = [];
      if (ownerIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_emoji')
          .in('id', ownerIds);
        profiles = data || [];
      }

      const profileMap: Record<string, any> = {};
      profiles.forEach(p => { profileMap[p.id] = p; });

      return (accounts || []).map(a => ({
        ...a,
        owner_name: profileMap[a.user_id]?.display_name || 'Membro',
        owner_emoji: profileMap[a.user_id]?.avatar_emoji,
      })) as FamilyAccount[];
    },
    enabled: !!user && !!familyId,
  });
}

export function useFamilySharedCreditCards() {
  const { user } = useAuth();
  const { familyId } = useView();
  return useQuery({
    queryKey: ['family_shared_cards', familyId],
    queryFn: async () => {
      const { data: cards, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('shared_with_family', true)
        .neq('user_id', user!.id)
        .order('name');
      if (error) throw error;

      const ownerIds = [...new Set((cards || []).map(c => c.user_id))];
      let profiles: any[] = [];
      if (ownerIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_emoji')
          .in('id', ownerIds);
        profiles = data || [];
      }

      const profileMap: Record<string, any> = {};
      profiles.forEach(p => { profileMap[p.id] = p; });

      return (cards || []).map(c => ({
        ...c,
        owner_name: profileMap[c.user_id]?.display_name || 'Membro',
        owner_emoji: profileMap[c.user_id]?.avatar_emoji,
      })) as FamilyCreditCard[];
    },
    enabled: !!user && !!familyId,
  });
}
