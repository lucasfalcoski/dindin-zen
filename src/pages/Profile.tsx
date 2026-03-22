import { useState } from 'react';
import { useProfile } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/useProfiles';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

const C = { ink:'#16150f', ink2:'#6b6a63', ink3:'#b0aea6', rule:'#e4e1da', bg:'#f2f0eb', green:'#1a7a45', red:'#b83232' };
const AVATAR_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#64748b','#1a7a45','#b83232'];

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [avatarColor, setAvatarColor] = useState('');
  const [editing, setEditing] = useState(false);

  const currentName = profile?.display_name || user?.email?.split('@')[0] || 'Usuário';
  const currentColor = profile?.avatar_color || '#3b82f6';
  const initials = currentName.substring(0, 2).toUpperCase();

  const handleStartEdit = () => {
    setDisplayName(profile?.display_name || '');
    setAvatarColor(profile?.avatar_color || '#3b82f6');
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ display_name: displayName.trim() || currentName, avatar_color: avatarColor });
      toast({ title: 'Perfil atualizado!' });
      setEditing(false);
    } catch { toast({ title: 'Erro ao salvar', variant: 'destructive' }); }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (isLoading) return (
    <div>
      <div style={{ height:'40px', width:'200px', background:C.rule, borderRadius:'8px', marginBottom:'20px' }} />
      <div style={{ height:'200px', background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px' }} />
    </div>
  );

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'6px' }}>conta</p>
          <h1 style={{ fontFamily:"'Instrument Serif',Georgia,serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink }}>Perfil</h1>
        </div>
      </div>

      {/* Avatar + info */}
      <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'28px', marginBottom:'14px', display:'flex', alignItems:'center', gap:'20px' }}>
        <div style={{ width:'72px', height:'72px', borderRadius:'50%', background: editing ? avatarColor : currentColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontWeight:700, color:'#fff', flexShrink:0 }}>
          {initials}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:'24px', letterSpacing:'-0.5px', color:C.ink }}>{currentName}</div>
          <div style={{ fontSize:'13px', color:C.ink3, marginTop:'2px' }}>{user?.email}</div>
          <div style={{ fontSize:'11px', color:C.ink3, marginTop:'4px' }}>
            Membro desde {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR', { month:'long', year:'numeric' }) : '—'}
          </div>
        </div>
        {!editing && (
          <button onClick={handleStartEdit} style={{ padding:'6px 16px', borderRadius:'8px', fontSize:'12px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", border:`1px solid ${C.rule}`, background:'none', color:C.ink2, cursor:'pointer' }}>
            Editar
          </button>
        )}
      </div>

      {editing && (
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'24px', marginBottom:'14px' }}>
          <p style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2, marginBottom:'16px' }}>Editar perfil</p>
          <div style={{ marginBottom:'16px' }}>
            <Label>Nome de exibição</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={currentName} className="mt-1.5" />
          </div>
          <div style={{ marginBottom:'20px' }}>
            <Label>Cor do avatar</Label>
            <div style={{ display:'flex', gap:'8px', marginTop:'8px', flexWrap:'wrap' }}>
              {AVATAR_COLORS.map(c => (
                <button key={c} onClick={() => setAvatarColor(c)}
                  style={{ width:'32px', height:'32px', borderRadius:'50%', background:c, border: avatarColor===c ? `3px solid ${C.ink}` : '3px solid transparent', cursor:'pointer', transition:'all .15s' }} />
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <Button onClick={handleSave} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Conta info */}
      <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden', marginBottom:'14px' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
          <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Conta</span>
        </div>
        <div style={{ padding:'0 20px' }}>
          {[
            { label:'Email', value: user?.email || '—' },
            { label:'Método de login', value: user?.app_metadata?.provider === 'email' ? 'Email e senha' : user?.app_metadata?.provider || '—' },
            { label:'ID', value: user?.id?.substring(0, 8) + '...' || '—' },
          ].map(item => (
            <div key={item.label} style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:`1px solid ${C.rule}` }}>
              <span style={{ fontSize:'13px', fontWeight:600, color:C.ink2 }}>{item.label}</span>
              <span style={{ fontSize:'13px', color:C.ink3 }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sair */}
      <button onClick={handleSignOut}
        style={{ width:'100%', padding:'14px', borderRadius:'14px', border:`1px solid rgba(184,50,50,.2)`, background:'rgba(184,50,50,.04)', color:C.red, fontSize:'13px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', transition:'all .15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(184,50,50,.08)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(184,50,50,.04)'; }}>
        <LogOut size={16} /> Sair da conta
      </button>
    </div>
  );
}
