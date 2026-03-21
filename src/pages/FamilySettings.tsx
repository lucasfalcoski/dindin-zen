import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useMyFamilies,
  useFamilyMembers,
  useCreateFamily,
  useUpdateFamily,
  useInviteMember,
  useRemoveMember,
} from '@/hooks/useFamily';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, Trash2, Copy, Check, Crown, Clock, Mail, ArrowRight, Target, Scale } from 'lucide-react';
import { EmojiAvatar } from '@/components/EmojiAvatar';

export default function FamilySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: families, isLoading } = useMyFamilies();
  const createFamily = useCreateFamily();

  const [createOpen, setCreateOpen] = useState(false);
  const [familyName, setFamilyName] = useState('');

  const myFamily = families?.[0]; // For now, one family per user

  const handleCreate = async () => {
    if (!familyName.trim()) return;
    try {
      await createFamily.mutateAsync(familyName.trim());
      toast({ title: 'Família criada!' });
      setCreateOpen(false);
      setFamilyName('');
    } catch {
      toast({ title: 'Erro ao criar família', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Família</h1>
        <div className="card-surface p-8 animate-pulse">
          <div className="h-6 w-40 bg-muted rounded mb-4" />
          <div className="h-4 w-60 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!myFamily) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Família</h1>
        <div className="card-surface p-8 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Modo Família</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Compartilhe despesas e receitas com sua família. Crie um grupo familiar e convide membros.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar família
          </Button>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Criar família</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da família</Label>
                <Input
                  value={familyName}
                  onChange={e => setFamilyName(e.target.value)}
                  placeholder="Ex: Família Silva"
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                />
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
  const updateFamily = useUpdateFamily();
  const inviteMember = useInviteMember();
  const removeMember = useRemoveMember();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(family.name);
  const [inviteEmail, setInviteEmail] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const isAdmin = family.created_by === userId;

  const handleUpdateName = async () => {
    if (!name.trim() || name === family.name) {
      setEditingName(false);
      return;
    }
    try {
      await updateFamily.mutateAsync({ id: family.id, name: name.trim() });
      toast({ title: 'Nome atualizado' });
      setEditingName(false);
    } catch {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      const member = await inviteMember.mutateAsync({ familyId: family.id, email: inviteEmail.trim() });
      toast({ title: 'Convite criado!' });
      setInviteEmail('');
      // Auto-copy invite link
      const link = `${window.location.origin}/invite/${member.invite_token}`;
      await navigator.clipboard.writeText(link);
      setCopiedToken(member.invite_token);
      setTimeout(() => setCopiedToken(null), 3000);
      toast({ title: 'Link copiado para a área de transferência!' });
    } catch {
      toast({ title: 'Erro ao convidar', variant: 'destructive' });
    }
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
    } catch {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Família</h1>

      {/* Family name */}
      <div className="card-surface p-5">
        <div className="flex items-center justify-between">
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                className="max-w-xs"
                onBlur={handleUpdateName}
                onKeyDown={e => { if (e.key === 'Enter') handleUpdateName(); }}
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{family.name}</h2>
                <p className="text-xs text-muted-foreground">{members?.filter(m => m.status === 'active').length || 0} membro(s) ativo(s)</p>
              </div>
            </div>
          )}
          {isAdmin && !editingName && (
            <Button variant="ghost" size="sm" onClick={() => setEditingName(true)}>
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Members list */}
      <div className="card-surface">
        <div className="p-4 pb-2">
          <h3 className="label-caps">Membros</h3>
        </div>
        <div className="divide-y divide-border/50">
          {members?.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-4">
              <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-sm font-medium text-foreground">
                {(m.invited_email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-foreground truncate">
                    {m.invited_email || 'Sem email'}
                  </p>
                  {m.role === 'admin' && (
                    <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {m.status === 'pending' ? (
                    <>
                      <Clock className="h-3 w-3" />
                      <span>Pendente</span>
                    </>
                  ) : (
                    <span>Ativo</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {m.status === 'pending' && (
                  <button
                    onClick={() => handleCopyLink(m.invite_token)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Copiar link de convite"
                  >
                    {copiedToken === m.invite_token ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
                {isAdmin && m.user_id !== userId && (
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite section (admin only) */}
      {isAdmin && (
        <div className="card-surface p-5">
          <h3 className="label-caps mb-3">Convidar membro</h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="email@exemplo.com"
                type="email"
                onKeyDown={e => { if (e.key === 'Enter') handleInvite(); }}
              />
            </div>
            <Button onClick={handleInvite} disabled={inviteMember.isPending} className="gap-1.5">
              <Mail className="h-4 w-4" />
              Convidar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Um link de convite será gerado e copiado automaticamente.
          </p>
        </div>
      )}

      {/* Family sub-pages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/family/balances"
          className="card-surface p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors rounded-lg"
        >
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Scale className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Quem deve pra quem</p>
            <p className="text-xs text-muted-foreground">Saldos de despesas divididas</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/family/budget"
          className="card-surface p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors rounded-lg"
        >
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Orçamento Familiar</p>
            <p className="text-xs text-muted-foreground">Orçamento consolidado da família</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
