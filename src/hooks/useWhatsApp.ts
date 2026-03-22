import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface WhatsAppUser {
  id: string;
  user_id: string;
  phone: string;
  verified: boolean;
  created_at: string;
  verified_at: string | null;
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  if (digits.length === 11) return '55' + digits;
  return digits;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  return phone;
}

export { normalizePhone, formatPhone };

export function useWhatsAppUser() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['whatsapp_user', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_users')
        .select('*')
        .eq('user_id', user!.id)
        .eq('verified', true)
        .maybeSingle();
      if (error) throw error;
      return data as WhatsAppUser | null;
    },
    enabled: !!user,
  });
}

export function useSendWhatsAppCode() {
  return useMutation({
    mutationFn: async (phone: string) => {
      const normalized = normalizePhone(phone);
      const { error } = await supabase.functions.invoke('whatsapp-verify?action=send', {
        method: 'POST',
        body: { phone: normalized },
      });
      if (error) throw new Error(error.message || 'Erro ao enviar código');
      return normalized;
    },
  });
}

export function useVerifyWhatsAppCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      const { error } = await supabase.functions.invoke('whatsapp-verify?action=confirm', {
        method: 'POST',
        body: { phone, code },
      });
      if (error) throw new Error(error.message || 'Código inválido ou expirado');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp_user'] }),
  });
}

export function useTestWhatsAppConnection() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('whatsapp-verify?action=test', {
        method: 'POST',
        body: {},
      });
      if (error) throw new Error(error.message || 'Erro ao enviar mensagem de teste');
    },
  });
}

export function useDisconnectWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('whatsapp-verify?action=disconnect', {
        method: 'DELETE',
        body: {},
      });
      if (error) throw new Error(error.message || 'Erro ao desconectar');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp_user'] }),
  });
}
