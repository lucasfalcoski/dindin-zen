import { useState } from 'react';
import { useAccounts, Account, ACCOUNT_TYPES, useCreateAccount, useDeleteAccount } from '@/hooks/useAccounts';
import { useExpenses } from '@/hooks/useExpenses';
import { formatBRL } from '@/lib/format';
import { ExpenseRow } from '@/components/ExpenseRow';
import { Plus, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const C = { ink: '#16150f', ink2: '#6b6a63', ink3: '#b0aea6', rule: '#e4e1da', bg: '#f2f0eb', green: '#1a7a45', red: '#b83232' };

export default function AccountsPage() {
  const { data: accounts, isLoading } = useAccounts();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const totalBalance = (accounts || []).reduce((s, a) => s + Number(a.balance), 0);

  return (
    <div>
      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'6px' }}>contas</p>
          <h1 style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink }}>
            Contas Bancárias
          </h1>
        </div>
        <button onClick={() => setFormOpen(true)} style={{ padding:'6px 16px', borderRadius:'8px', fontSize:'12px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", background:C.ink, color:'#fff', border:`1px solid ${C.ink}`, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
          <Plus size={14} /> Nova conta
        </button>
      </div>

      {/* SALDO TOTAL */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
            <span style={{ width:'7px', height:'7px', borderRadius:'50%', background: totalBalance >= 0 ? C.green : C.red, display:'inline-block' }} />
            <span style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3 }}>Saldo total</span>
          </div>
          <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', letterSpacing:'-0.5px', lineHeight:1, color: totalBalance >= 0 ? C.green : C.red }}>
            {formatBRL(totalBalance)}
          </p>
        </div>
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3, marginBottom:'8px' }}>Contas</div>
          <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', letterSpacing:'-0.5px', lineHeight:1, color:C.ink }}>{(accounts || []).length}</p>
        </div>
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3, marginBottom:'8px' }}>Em poupança</div>
          <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', letterSpacing:'-0.5px', lineHeight:1, color:C.green }}>
            {formatBRL((accounts || []).filter(a => a.type === 'poupanca').reduce((s, a) => s + Number(a.balance), 0))}
          </p>
        </div>
      </div>

      {/* LISTA DE CONTAS */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} style={{ height:'100px', background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px' }} />)}
        </div>
      ) : accounts && accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          {accounts.map(a => {
            const typeInfo = ACCOUNT_TYPES.find(t => t.value === a.type);
            const isSelected = selectedAccount?.id === a.id;
            return (
              <button key={a.id} onClick={() => setSelectedAccount(isSelected ? null : a)}
                style={{
                  background:'#fff', border:`1.5px solid ${isSelected ? C.ink : C.rule}`,
                  borderRadius:'14px', padding:'20px', textAlign:'left', cursor:'pointer',
                  display:'flex', alignItems:'center', gap:'16px',
                  transition:'border-color .15s, box-shadow .15s',
                  boxShadow: isSelected ? `0 0 0 2px ${C.ink}22` : 'none',
                }}
              >
                <div style={{ width:'10px', height:'10px', borderRadius:'50%', background: a.color, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'14px', fontWeight:700, color:C.ink }}>{a.name}</div>
                  <div style={{ fontSize:'11px', color:C.ink3, fontWeight:500 }}>{typeInfo?.label}{a.bank_name ? ` · ${a.bank_name}` : ''}</div>
                </div>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:'22px', color: Number(a.balance) >= 0 ? C.green : C.red }}>
                  {formatBRL(Number(a.balance))}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'48px', textAlign:'center' }}>
          <Building2 style={{ width:'32px', height:'32px', color:C.ink3, margin:'0 auto 8px' }} />
          <p style={{ color:C.ink2, fontWeight:600 }}>Nenhuma conta cadastrada.</p>
        </div>
      )}

      {selectedAccount && <AccountMovements account={selectedAccount} />}
      <AccountForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

function AccountMovements({ account }: { account: Account }) {
  const { data: expenses, isLoading } = useExpenses({ accountId: account.id });
  const C_local = { ink: '#16150f', ink2: '#6b6a63', ink3: '#b0aea6', rule: '#e4e1da' };
  return (
    <div style={{ background:'#fff', border:`1px solid ${C_local.rule}`, borderRadius:'14px', overflow:'hidden' }}>
      <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C_local.rule}` }}>
        <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C_local.ink2 }}>
          Movimentações — {account.name}
        </span>
      </div>
      {isLoading ? (
        <div style={{ padding:'16px 20px' }}><div style={{ height:'16px', width:'160px', background:C_local.rule, borderRadius:'4px' }} /></div>
      ) : expenses && expenses.length > 0 ? (
        <div>{expenses.slice(0, 20).map(e => <ExpenseRow key={e.id} expense={e} />)}</div>
      ) : (
        <p style={{ fontSize:'13px', color:C_local.ink3, padding:'24px 20px', textAlign:'center' }}>Nenhuma movimentação encontrada.</p>
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
      await createAccount.mutateAsync({ name: name.trim(), type: type as any, bank_name: bankName.trim() || undefined, balance: parseFloat(balance.replace(',', '.')) || 0, color });
      toast({ title: 'Conta criada' });
      setName(''); setBankName(''); setBalance(''); setColor('#3b82f6'); setType('corrente');
      onOpenChange(false);
    } catch { toast({ title: 'Erro ao criar conta', variant: 'destructive' }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nova conta</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank" required /></div>
          <div className="space-y-2"><Label>Tipo</Label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${type === t.value ? 'bg-primary/10 ring-2 ring-primary text-primary' : 'bg-accent text-muted-foreground'}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2"><Label>Banco (opcional)</Label><Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Ex: Nubank" /></div>
          <div className="space-y-2"><Label>Saldo inicial</Label><Input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0,00" /></div>
          <div className="space-y-2"><Label>Cor</Label>
            <div className="flex gap-2">
              {['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4'].map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-primary' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={createAccount.isPending}>
            {createAccount.isPending ? 'Criando...' : 'Criar conta'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
