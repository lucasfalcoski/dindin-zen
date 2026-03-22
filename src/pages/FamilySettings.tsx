import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useMyFamilies, useFamilyMembers, useCreateFamily, useUpdateFamily,
  useInviteMember, useRemoveMember,
} from '@/hooks/useFamily';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, Trash2, Copy, Check, Crown, Clock, Mail, ArrowRight, Target, Scale } from 'lucide-react';
import { useFamilyProfiles } from '@/hooks/useProfiles';

const C = { ink:'#16150f', ink2:'#6b6a63', ink3:'#b0aea6', rule:'#e4e1da', bg:'#f2f0eb', green:'#1a7a45', green_s:'#d4eddd', red:'#b83232', red_s:'#f5dede', blue:'#1d4ed8', blue_s:'#dce8ff', amber:'#92580a', amber_s:'#fdefd4', purple:'#5b3589' };

export default function FamilySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: families, isLoading } = useMyFamilies();
  const createFamily = useCreateFamily();
  const [createOpen, setCreateOpen] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const myFamily = families?.[0];

  const handleCreate = async () => {
    if (!familyName.trim()) return;
    try {
      await createFamily.mutateAsync(familyName.trim());
      toast({ title: 'Família criada!' });
      setCreateOpen(false);
      setFamilyName('');
    } catch { toast({ title: 'Erro ao criar família', variant: 'destructive' }); }
  };

  if (isLoading) {
    return (
      <div>
        <div style={{ height:'40px', width:'200px', background:'#e4e1da', borderRadius:'8px', marginBottom:'20px' }} />
        <div style={{ height:'120px', background:'#e4e1da', borderRadius:'14px' }} />
      </div>
    );
  }

  if (!myFamily) {
    return (
      <div>
        {/* HEADER */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
          <div>
            <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'6px' }}>família</p>
            <h1 style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink }}>Família</h1>
          </div>
        </div>

        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'48px', textAlign:'center' }}>
          <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:'rgba(26,122,69,.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <Users style={{ width:'28px', height:'28px', color:C.green }} />
          </div>
          <h2 style={{ fontSize:'18px', fontWeight:700, color:C.ink, marginBottom:'8px' }}>Modo Família</h2>
          <p style={{ fontSize:'13px', color:C.ink3, maxWidth:'320px', margin:'0 auto 24px', lineHeight:1.6 }}>
            Compartilhe despesas e receitas com sua família. Crie um grupo familiar e convide membros.
          </p>
          <button onClick={() => setCreateOpen(true)} style={{ padding:'10px 20px', borderRadius:'10px', fontSize:'13px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", background:C.ink, color:'#fff', border:'none', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'8px' }}>
            <Plus size={14} /> Criar família
          </button>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Criar família</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da família</Label>
                <Input value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="Ex: Família Silva" onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }} />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={createFamily.isPending}>
                {createFamily.isPending ? 'Criando...' : 'Criar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return <FamilyPanel family={myFamily} userId={user!.id} />;
}

function FamilyPanel({ family, userId }: { family: { id: string; name: string; created_by: string }; userId: string }) {
  const { toast } = useToast();
  const { data: members } = useFamilyMembers(family.id);
  const { data: profiles } = useFamilyProfiles();
  const updateFamily = useUpdateFamily();
  const inviteMember = useInviteMember();
  const removeMember = useRemoveMember();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(family.name);
  const [inviteEmail, setInviteEmail] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const isAdmin = family.created_by === userId;
  const activeMembers = (members || []).filter(m => m.status === 'active');
  const memberCount = activeMembers.length;

  const getMemberProfile = (email: string | null) => {
    if (!email) return null;
    return profiles?.find(p => p.email === email || p.display_name === email?.split('@')[0]);
  };

  const handleUpdateName = async () => {
    if (!name.trim() || name === family.name) { setEditingName(false); return; }
    try {
      await updateFamily.mutateAsync({ id: family.id, name: name.trim() });
      toast({ title: 'Nome atualizado' });
      setEditingName(false);
    } catch { toast({ title: 'Erro ao atualizar', variant: 'destructive' }); }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      const member = await inviteMember.mutateAsync({ familyId: family.id, email: inviteEmail.trim() });
      toast({ title: 'Convite criado!' });
      setInviteEmail('');
      const link = `${window.location.origin}/invite/${member.invite_token}`;
      await navigator.clipboard.writeText(link);
      setCopiedToken(member.invite_token);
      setTimeout(() => setCopiedToken(null), 3000);
      toast({ title: 'Link copiado para a área de transferência!' });
    } catch { toast({ title: 'Erro ao convidar', variant: 'destructive' }); }
  };

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
    toast({ title: 'Link copiado!' });
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeMember.mutateAsync(memberId);
      toast({ title: 'Membro removido' });
    } catch { toast({ title: 'Erro ao remover', variant: 'destructive' }); }
  };

  // Avatar colors
  const avatarColors = [
    { bg: '#dce8ff', text: '#1d4ed8' },
    { bg: '#f5dede', text: '#b83232' },
    { bg: '#d4eddd', text: '#1a7a45' },
    { bg: '#fdefd4', text: '#92580a' },
    { bg: '#ece4f9', text: '#5b3589' },
  ];

  return (
    <div>
      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'6px' }}>família</p>
          {editingName ? (
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={handleUpdateName}
              onKeyDown={e => { if (e.key === 'Enter') handleUpdateName(); }}
              autoFocus
              style={{ fontFamily:"'Instrument Serif',serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink, border:'none', borderBottom:`2px solid ${C.green}`, background:'none', outline:'none', width:'300px' }}
            />
          ) : (
            <h1
              style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink, cursor: isAdmin ? 'pointer' : 'default' }}
              onClick={() => isAdmin && setEditingName(true)}
              title={isAdmin ? 'Clique para editar' : undefined}
            >
              Família <em style={{ fontStyle:'italic', color:C.ink2 }}>{family.name}</em>
            </h1>
          )}
        </div>
        {isAdmin && (
          <button onClick={() => document.getElementById('invite-email')?.focus()} style={{ padding:'6px 16px', borderRadius:'8px', fontSize:'12px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", background:C.ink, color:'#fff', border:`1px solid ${C.ink}`, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
            <Plus size={14} /> Convidar membro
          </button>
        )}
      </div>

      {/* BANNER ESCURO */}
      <div style={{ background:C.ink, borderRadius:'16px', padding:'24px 28px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'28px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:'-30px', top:'-30px', width:'160px', height:'160px', borderRadius:'50%', border:'1px solid rgba(255,255,255,.05)' }} />
        <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:'48px', color:'#fff', letterSpacing:'-2px', lineHeight:1, flexShrink:0 }}>
          {memberCount}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:'8px', fontWeight:600 }}>
            membros ativos
          </div>
          <div style={{ display:'flex' }}>
            {activeMembers.slice(0, 5).map((m, i) => {
              const col = avatarColors[i % avatarColors.length];
              const initials = (m.invited_email || '?').substring(0, 2).toUpperCase();
              return (
                <div key={m.id} style={{ width:'38px', height:'38px', borderRadius:'50%', border:`2px solid ${C.ink}`, background:col.bg, color:col.text, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, marginLeft: i > 0 ? '-10px' : 0, flexShrink:0 }}>
                  {initials}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,.4)', marginTop:'8px' }}>
            Família {family.name}
          </div>
        </div>
      </div>

      {/* MEMBROS GRID */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'20px' }}>
        {(members || []).map((m, i) => {
          const col = avatarColors[i % avatarColors.length];
          const initials = (m.invited_email || '?').substring(0, 2).toUpperCase();
          const isPending = m.status === 'pending';
          return (
            <div key={m.id} style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px', transition:'border-color .15s', opacity: isPending ? 0.7 : 1 }}>
              <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:col.bg, color:col.text, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:700, marginBottom:'12px' }}>
                {initials}
              </div>
              <div style={{ fontSize:'14px', fontWeight:700, color:C.ink }}>{m.invited_email?.split('@')[0] || 'Membro'}</div>
              <div style={{ fontSize:'11px', color:C.ink3, marginBottom:'8px', display:'flex', alignItems:'center', gap:'4px' }}>
                {m.role === 'admin' && <Crown size={10} style={{ color:'#f59e0b' }} />}
                {isPending ? <><Clock size={10} /> Pendente</> : m.role === 'admin' ? 'Administrador' : 'Membro'}
              </div>
              {isPending && m.invite_token && (
                <button
                  onClick={() => handleCopyLink(m.invite_token!)}
                  style={{ fontSize:'11px', color:C.blue, background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:'4px', fontFamily:"'Cabinet Grotesk',sans-serif" }}
                >
                  {copiedToken === m.invite_token ? <><Check size={11} /> Copiado!</> : <><Copy size={11} /> Copiar link</>}
                </button>
              )}
              {isAdmin && m.user_id !== userId && (
                <button
                  onClick={() => handleRemove(m.id)}
                  style={{ marginTop:'4px', fontSize:'11px', color:C.red, background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:'4px', fontFamily:"'Cabinet Grotesk',sans-serif" }}
                >
                  <Trash2 size={11} /> Remover
                </button>
              )}
            </div>
          );
        })}

        {/* Convidar card */}
        {isAdmin && (
          <div style={{ background:'#fff', border:`1.5px dashed ${C.rule}`, borderRadius:'14px', padding:'20px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'6px', cursor:'pointer' }}
            onClick={() => document.getElementById('invite-email')?.focus()}
          >
            <div style={{ fontSize:'24px', color:C.ink3 }}>+</div>
            <div style={{ fontSize:'13px', fontWeight:700, color:C.ink2 }}>Convidar</div>
            <div style={{ fontSize:'11px', color:C.ink3, textAlign:'center', maxWidth:'100px' }}>Adicionar membro à família</div>
          </div>
        )}
      </div>

      {/* SUB-PAGES */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'20px' }}>
        <Link to="/family/balances" style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'16px', display:'flex', alignItems:'center', gap:'12px', textDecoration:'none', transition:'border-color .15s' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'rgba(26,122,69,.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Scale style={{ width:'18px', height:'18px', color:C.green }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:C.ink }}>Quem deve pra quem</div>
            <div style={{ fontSize:'11px', color:C.ink3 }}>Saldos de despesas divididas</div>
          </div>
          <ArrowRight style={{ width:'14px', height:'14px', color:C.ink3 }} />
        </Link>
        <Link to="/family/budget" style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'16px', display:'flex', alignItems:'center', gap:'12px', textDecoration:'none', transition:'border-color .15s' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'rgba(26,122,69,.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Target style={{ width:'18px', height:'18px', color:C.green }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:C.ink }}>Orçamento Familiar</div>
            <div style={{ fontSize:'11px', color:C.ink3 }}>Orçamento consolidado da família</div>
          </div>
          <ArrowRight style={{ width:'14px', height:'14px', color:C.ink3 }} />
        </Link>
      </div>

      {/* CONVIDAR */}
      {isAdmin && (
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px' }}>
          <p style={{ fontSize:'11px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:C.ink2, marginBottom:'12px' }}>Convidar membro</p>
          <div style={{ display:'flex', gap:'8px' }}>
            <Input
              id="invite-email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@exemplo.com"
              type="email"
              onKeyDown={e => { if (e.key === 'Enter') handleInvite(); }}
              style={{ flex:1 }}
            />
            <Button onClick={handleInvite} disabled={inviteMember.isPending} className="gap-1.5">
              <Mail className="h-4 w-4" /> Convidar
            </Button>
          </div>
          <p style={{ fontSize:'11px', color:C.ink3, marginTop:'8px' }}>Um link de convite será gerado e copiado automaticamente.</p>
        </div>
      )}
    </div>
  );
}
