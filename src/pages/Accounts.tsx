import { useState } from 'react';
import { useAccounts, Account, ACCOUNT_TYPES, useCreateAccount, useDeleteAccount } from '@/hooks/useAccounts';
import { useExpenses } from '@/hooks/useExpenses';
import { formatBRL } from '@/lib/format';
import { ExpenseRow } from '@/components/ExpenseRow';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function AccountsPage() {
  const { data: accounts, isLoading } = useAccounts();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const totalBalance = (accounts || []).reduce((s, a) => s + Number(a.balance), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Contas</h1>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova conta
        </button>
      </div>

      {/* Total */}
      <div className="card-surface p-5">
        <span className="label-caps">Saldo total</span>
        <p className={`currency text-3xl mt-1 ${totalBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
          {formatBRL(totalBalance)}
        </p>
      </div>

      {/* Account cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card-surface p-5 h-28 animate-pulse">
              <div className="h-3 w-20 bg-muted rounded mb-3" />
              <div className="h-6 w-28 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : accounts && accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map(a => {
            const typeInfo = ACCOUNT_TYPES.find(t => t.value === a.type);
            return (
              <button
                key={a.id}
                onClick={() => setSelectedAccount(selectedAccount?.id === a.id ? null : a)}
                className={`card-surface-hover p-5 text-left transition-all ${selectedAccount?.id === a.id ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: a.color + '20' }}>
                      {typeInfo?.icon || '🏦'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.name}</p>
                      {a.bank_name && <p className="text-[11px] text-muted-foreground">{a.bank_name}</p>}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{typeInfo?.label}</span>
                </div>
                <p className={`currency text-xl ${Number(a.balance) >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                  {formatBRL(Number(a.balance))}
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="card-surface p-8 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>
        </div>
      )}

      {/* Movements for selected account */}
      {selectedAccount && <AccountMovements account={selectedAccount} />}

      <AccountForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

function AccountMovements({ account }: { account: Account }) {
  const { data: expenses, isLoading } = useExpenses({ accountId: account.id });

  return (
    <div className="card-surface">
      <div className="p-4 pb-2">
        <h2 className="label-caps">Movimentações — {account.name}</h2>
      </div>
      {isLoading ? (
        <div className="p-4 animate-pulse"><div className="h-4 w-40 bg-muted rounded" /></div>
      ) : expenses && expenses.length > 0 ? (
        <div className="divide-y divide-border/50">
          {expenses.slice(0, 20).map(e => (
            <ExpenseRow key={e.id} expense={e} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma movimentação encontrada.</p>
      )}
    </div>
  );
}

function AccountForm({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createAccount = useCreateAccount();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('corrente');
  const [bankName, setBankName] = useState('');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState('#3b82f6');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createAccount.mutateAsync({
        name: name.trim(),
        type: type as any,
        bank_name: bankName.trim() || undefined,
        balance: parseFloat(balance.replace(',', '.')) || 0,
        color,
      });
      toast({ title: 'Conta criada' });
      setName(''); setBankName(''); setBalance(''); setColor('#3b82f6'); setType('corrente');
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao criar conta', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[90dvh] p-0 gap-0 sm:max-w-md">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Nova conta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0 space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank" required />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    type === t.value ? 'ring-2 ring-primary bg-primary/5 font-medium' : 'bg-accent hover:bg-accent/80'
                  }`}
                >
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Banco (opcional)</Label>
            <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Ex: Nubank, Itaú" />
          </div>
          <div className="space-y-2">
            <Label>Saldo atual (R$)</Label>
            <Input value={balance} onChange={e => setBalance(e.target.value)} placeholder="0,00" inputMode="decimal" />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-14 rounded-lg border border-input cursor-pointer" />
          </div>
          </div>
          <div className="px-6 pb-6 pt-3 flex-shrink-0 border-t border-border bg-card rounded-b-lg">
            <Button type="submit" className="w-full" disabled={createAccount.isPending}>Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
