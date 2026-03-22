import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WhatsAppConnect } from '@/components/WhatsAppConnect';

const C = {
  ink: '#16150f', ink2: '#6b6a63', ink3: '#b0aea6',
  rule: '#e4e1da', bg: '#f2f0eb', green: '#1a7a45', red: '#b83232',
};

const TIMEZONES = [
  { value: 'America/Sao_Paulo',    label: 'Brasília (UTC-3)' },
  { value: 'America/Manaus',       label: 'Manaus (UTC-4)' },
  { value: 'America/Belem',        label: 'Belém (UTC-3)' },
  { value: 'America/Fortaleza',    label: 'Fortaleza (UTC-3)' },
  { value: 'America/Recife',       label: 'Recife (UTC-3)' },
  { value: 'America/Bahia',        label: 'Salvador (UTC-3)' },
  { value: 'America/Cuiaba',       label: 'Cuiabá (UTC-4)' },
  { value: 'America/Porto_Velho',  label: 'Porto Velho (UTC-4)' },
  { value: 'America/Boa_Vista',    label: 'Boa Vista (UTC-4)' },
  { value: 'America/Rio_Branco',   label: 'Rio Branco (UTC-5)' },
  { value: 'America/Noronha',      label: 'Fernando de Noronha (UTC-2)' },
  { value: 'America/New_York',     label: 'Nova York (UTC-5/-4)' },
  { value: 'America/Los_Angeles',  label: 'Los Angeles (UTC-8/-7)' },
  { value: 'Europe/Lisbon',        label: 'Lisboa (UTC+0/+1)' },
  { value: 'Europe/London',        label: 'Londres (UTC+0/+1)' },
  { value: 'Europe/Paris',         label: 'Paris (UTC+1/+2)' },
];

const AVATAR_COLORS = [
  '#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6',
  '#ec4899','#06b6d4','#64748b','#f97316','#1a7a45',
];

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (profile && !initialized) {
      setDisplayName(profile.display_name || '');
      setAvatarColor(profile.avatar_color || AVATAR_COLORS[0]);
      setTimezone(profile.timezone || 'America/Sao_Paulo');
      setInitialized(true);
    }
  }, [profile, initialized]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        display_name: displayName.trim() || user.email?.split('@')[0],
        avatar_color: avatarColor,
        timezone,
      }).eq('id', user.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: 'Configurações salvas!' });
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const initials = (displayName || user?.email || '?').substring(0, 2).toUpperCase();

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-muted rounded w-48" />
      <div className="h-40 bg-muted rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-2xl">
      {/* HEADER */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <p className="label-caps" style={{ margin: 0, letterSpacing: '1.5px' }}>conta</p>
        </div>
        <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 34, fontWeight: 400, color: C.ink, margin: 0 }}>
          Configurações
        </h1>
      </div>

      <div className="space-y-8">
        {/* Avatar */}
        <div className="card-surface p-6 flex items-start gap-5">
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, fontFamily: "'Cabinet Grotesk', sans-serif" }}>{displayName || user?.email?.split('@')[0]}</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{user?.email}</div>
          </div>
          <div>
            <p className="label-caps" style={{ marginBottom: 8 }}>Cor do avatar</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {AVATAR_COLORS.map(c => (
                <button key={c} onClick={() => setAvatarColor(c)}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: avatarColor === c ? `3px solid ${C.ink}` : '3px solid transparent', cursor: 'pointer', transition: 'all .15s', transform: avatarColor === c ? 'scale(1.2)' : 'scale(1)' }} />
              ))}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="card-surface p-6 space-y-6">
          {/* Perfil */}
          <div className="space-y-4">
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: "'Cabinet Grotesk', sans-serif" }}>Perfil</h3>
            <div>
              <Label>Nome de exibição</Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={user?.email?.split('@')[0]} className="mt-1.5" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled className="mt-1.5 opacity-60" />
            </div>
          </div>

          {/* Fuso horário */}
          <div className="space-y-3">
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: "'Cabinet Grotesk', sans-serif" }}>Fuso horário</h3>
            <select value={timezone} onChange={e => setTimezone(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.rule}`, background: '#fff', fontSize: 13, color: C.ink, fontFamily: "'Cabinet Grotesk', sans-serif", cursor: 'pointer', outline: 'none' }}
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: C.ink3, margin: 0 }}>
              Agora: {new Date().toLocaleTimeString('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit' })} no fuso selecionado
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving}
            style={{ background: C.ink, color: '#fff', borderRadius: 7, fontSize: 13, fontWeight: 600, padding: '8px 20px' }}>
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </Button>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="card-surface p-6 space-y-4">
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: "'Cabinet Grotesk', sans-serif" }}>WhatsApp</h3>
        <div className="pl-1">
          <WhatsAppConnect />
        </div>
      </div>

      {/* Segurança */}
      <div className="card-surface p-6 space-y-4">
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: "'Cabinet Grotesk', sans-serif" }}>Segurança</h3>
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: 0 }}>Senha</p>
            <p style={{ fontSize: 11, color: C.ink3, margin: 0 }}>Altere sua senha de acesso</p>
          </div>
          <Button variant="outline" size="sm" onClick={async () => {
            if (!user?.email) return;
            await supabase.auth.resetPasswordForEmail(user.email);
            toast({ title: 'Email de redefinição enviado!' });
          }}>
            Alterar senha
          </Button>
        </div>
      </div>

      {/* Sair */}
      <div className="card-surface p-6 space-y-4">
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.red, fontFamily: "'Cabinet Grotesk', sans-serif" }}>Zona de perigo</h3>
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: 0 }}>Sair da conta</p>
            <p style={{ fontSize: 11, color: C.ink3, margin: 0 }}>Encerrar a sessão atual</p>
          </div>
          <Button variant="destructive" size="sm" onClick={signOut}>Sair</Button>
        </div>
      </div>
    </div>
  );
}
