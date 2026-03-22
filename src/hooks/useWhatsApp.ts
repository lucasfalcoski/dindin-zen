import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-verify`;

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
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (phone: string) => {
      const normalized = normalizePhone(phone);
      const res = await fetch(`${BASE_URL}?action=send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ phone: normalized }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Erro ao enviar código');
      }
      return normalized;
    },
  });
}

export function useVerifyWhatsAppCode() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      const res = await fetch(`${BASE_URL}?action=confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ phone, code }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Código inválido ou expirado');
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp_user'] }),
  });
}

export function useTestWhatsAppConnection() {
  const { session } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE_URL}?action=test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Erro ao enviar mensagem de teste');
      }
    },
  });
}

export function useDisconnectWhatsApp() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE_URL}?action=disconnect`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Erro ao desconectar');
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp_user'] }),
  });
}
