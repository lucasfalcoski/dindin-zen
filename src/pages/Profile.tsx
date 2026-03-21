import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, useUpdateProfile } from '@/hooks/useProfiles';
import { useIncomes } from '@/hooks/useIncomes';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { formatBRL } from '@/lib/format';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LogOut, ChevronRight, Plus, Pencil, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmojiAvatar, EmojiPicker } from '@/components/EmojiAvatar';

const AVATAR_COLORS = ['#6BAE7A', '#D4AF6A', '#2C3E2D', '#3b82f6', '#ef4444', '#8b5cf6'];

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const { data: incomes } = useIncomes({});
  const { data: accounts } = useAccounts();
  const { data: creditCards } = useCreditCards();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryValue, setSalaryValue] = useState('');

  const salary = incomes?.find(i => i.recurrent && i.category === 'salario');

  const handleSaveName = () => {
    if (!nameValue.trim()) return;
    updateProfile.mutate({ display_name: nameValue.trim() }, {
      onSuccess: () => {
        setEditingName(false);
        toast({ title: 'Nome atualizado!' });
      },
    });
  };

  const handleColorChange = (color: string) => {
    updateProfile.mutate({ avatar_color: color });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
        <div className="h-24 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  const initials = (profile?.display_name || user?.email || '?').substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Meu Perfil</h1>

      {/* Seção 1 — Identidade */}
      <div className="card-surface p-6 space-y-4">
        <div className="flex items-center gap-4">
          <EmojiAvatar
            emoji={profile?.avatar_emoji}
            color={profile?.avatar_color}
            userId={user?.id}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  className="h-9"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleSaveName}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditingName(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-foreground truncate">
                  {profile?.display_name || 'Sem nome'}
                </span>
                <button
                  onClick={() => { setNameValue(profile?.display_name || ''); setEditingName(true); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Seção 2 — Renda mensal */}
      <div className="card-surface p-5 space-y-3">
        <h2 className="label-caps">Renda mensal</h2>
        {salary ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">{salary.description}</p>
              <p className="currency text-lg font-semibold text-foreground">{formatBRL(Number(salary.amount))}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum salário recorrente cadastrado.</p>
        )}
        <Link to="/income" className="text-sm text-primary hover:underline flex items-center gap-1">
          Ver todas receitas <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Seção 3 — Minhas contas */}
      <div className="card-surface p-5 space-y-3">
        <h2 className="label-caps">Minhas contas</h2>
        {accounts && accounts.length > 0 ? (
          <div className="space-y-2">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center justify-between py-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                  {a.bank_name && <p className="text-xs text-muted-foreground">{a.bank_name}</p>}
                </div>
                <span className="currency text-sm text-foreground whitespace-nowrap">{formatBRL(Number(a.balance))}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>
        )}
        <Link to="/accounts" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <Plus className="h-3.5 w-3.5" /> Adicionar conta
        </Link>
      </div>

      {/* Seção 4 — Meus cartões */}
      <div className="card-surface p-5 space-y-3">
        <h2 className="label-caps">Meus cartões</h2>
        {creditCards && creditCards.length > 0 ? (
          <div className="space-y-2">
            {creditCards.map(c => (
              <div key={c.id} className="flex items-center justify-between py-1.5">
                <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                <span className="text-xs text-muted-foreground whitespace-nowrap">Limite: {formatBRL(Number(c.limit))}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
        )}
        <Link to="/credit-cards" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <Plus className="h-3.5 w-3.5" /> Adicionar cartão
        </Link>
      </div>

      {/* Seção 5 — Preferências */}
      <div className="card-surface p-5 space-y-4">
        <h2 className="label-caps">Preferências</h2>
        <div>
          <p className="text-sm text-foreground mb-2">Emoji do avatar</p>
          <EmojiPicker
            value={profile?.avatar_emoji}
            onChange={(emoji) => updateProfile.mutate({ avatar_emoji: emoji })}
          />
        </div>
        <div>
          <p className="text-sm text-foreground mb-2">Cor do avatar</p>
          <div className="flex gap-3">
            {AVATAR_COLORS.map(c => (
              <button
                key={c}
                onClick={() => handleColorChange(c)}
                className={`h-8 w-8 rounded-full transition-transform ${profile?.avatar_color === c ? 'scale-125 ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <Button variant="outline" className="w-full gap-2 text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
