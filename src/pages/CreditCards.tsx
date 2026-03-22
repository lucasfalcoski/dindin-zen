import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useCreditCards, CreditCard, useCreateCreditCard, useDeleteCreditCard } from '@/hooks/useCreditCards';
import { useAccounts } from '@/hooks/useAccounts';
import { useExpenses } from '@/hooks/useExpenses';
import { formatBRL } from '@/lib/format';
import { ExpenseRow } from '@/components/ExpenseRow';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const C = { ink: '#16150f', ink2: '#6b6a63', ink3: '#b0aea6', rule: '#e4e1da', bg: '#f2f0eb', green: '#1a7a45', red: '#b83232', blue: '#1d4ed8', amber: '#92580a' };

function getInvoicePeriod(closingDay: number) {
  const now = new Date();
  const currentDay = now.getDate();
  let start: Date, end: Date;
  if (currentDay <= closingDay) {
    start = new Date(now.getFullYear(), now.getMonth() - 1, closingDay + 1);
    end = new Date(now.getFullYear(), now.getMonth(), closingDay);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), closingDay + 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, closingDay);
  }
  return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
}

function getNextDueDate(dueDay: number) {
  const now = new Date();
  let due = new Date(now.getFullYear(), now.getMonth(), dueDay);
  if (due < now) due = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
  return format(due, 'dd/MM/yyyy');
}

function CardVisual({ card, invoiceTotal, onClick, isSelected }: { card: CreditCard; invoiceTotal: number; onClick: () => void; isSelected: boolean }) {
  const pct = card.limit > 0 ? (invoiceTotal / card.limit) * 100 : 0;
  const cardColors = ['#16150f', '#1a3a5c', '#0e5050', '#3b1f5c', '#1a4a1a'];
  const bgColor = cardColors[Math.abs(card.name.charCodeAt(0)) % cardColors.length];

  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: '16px', padding: '22px', background: bgColor,
        color: '#fff', position: 'relative', overflow: 'hidden',
        minHeight: '140px', textAlign: 'left', border: isSelected ? '2.5px solid #fff' : '2.5px solid transparent',
        cursor: 'pointer', transition: 'all .15s', width: '100%',
        boxShadow: isSelected ? '0 0 0 3px rgba(26,122,69,0.4)' : '0 4px 20px rgba(0,0,0,.15)',
      }}
    >
      <div style={{ position:'absolute', right:'-30px', top:'-30px', width:'140px', height:'140px', borderRadius:'50%', background:'rgba(255,255,255,.04)' }} />
      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 'auto' }}>{card.name}</div>
      <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:'24px', marginTop:'20px' }}>
        {formatBRL(invoiceTotal)} <span style={{ fontSize:'14px', opacity:.45 }}>/ {formatBRL(card.limit)}</span>
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.45)', marginTop: '2px' }}>
        Fecha dia {card.closing_day} · Vence {getNextDueDate(card.due_day)}
      </div>
      <div style={{ height:'3px', background:'rgba(255,255,255,.15)', borderRadius:'100px', overflow:'hidden', marginTop:'12px' }}>
        <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, borderRadius:'100px', background:'rgba(255,255,255,.7)' }} />
      </div>
    </button>
  );
}

export default function CreditCardsPage() {
  const { data: cards, isLoading } = useCreditCards();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);

  const now = new Date();
  const { data: allExpenses } = useExpenses({
    startDate: format(new Date(now.getFullYear(), now.getMonth() - 1, 1), 'yyyy-MM-dd'),
    endDate: format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd'),
  });

  const cardInvoices = useMemo(() => {
    if (!cards || !allExpenses) return {};
    const map: Record<string, number> = {};
    cards.forEach(card => {
      const period = getInvoicePeriod(card.closing_day);
      map[card.id] = (allExpenses as any[])
        .filter(e => e.credit_card_id === card.id && e.date >= period.start && e.date <= period.end)
        .reduce((s, e) => s + Number(e.amount), 0);
    });
    return map;
  }, [cards, allExpenses]);

  const totalDebt = Object.values(cardInvoices).reduce((s, v) => s + v, 0);
  const totalLimit = (cards || []).reduce((s, c) => s + c.limit, 0);

  return (
    <div>
      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'6px' }}>crédito</p>
          <h1 style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink }}>Cartões</h1>
        </div>
        <button onClick={() => setFormOpen(true)} style={{ padding:'6px 16px', borderRadius:'8px', fontSize:'12px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", background:C.ink, color:'#fff', border:`1px solid ${C.ink}`, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
          <Plus size={14} /> Novo cartão
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3, marginBottom:'8px' }}>Fatura total</div>
          <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', letterSpacing:'-0.5px', lineHeight:1, color:C.red }}>{formatBRL(totalDebt)}</p>
        </div>
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3, marginBottom:'8px' }}>Limite total</div>
          <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', letterSpacing:'-0.5px', lineHeight:1, color:C.blue }}>{formatBRL(totalLimit)}</p>
        </div>
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3, marginBottom:'8px' }}>Utilização</div>
          <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', letterSpacing:'-0.5px', lineHeight:1, color: totalLimit > 0 && (totalDebt/totalLimit) > 0.7 ? C.red : C.amber }}>
            {totalLimit > 0 ? `${((totalDebt / totalLimit) * 100).toFixed(0)}%` : '—'}
          </p>
        </div>
      </div>

      {/* CARDS GRID */}
      {isLoading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px' }}>
          {[...Array(2)].map((_, i) => <div key={i} style={{ height:'140px', background:C.ink, borderRadius:'16px', opacity:.3 }} />)}
        </div>
      ) : cards && cards.length > 0 ? (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px', marginBottom:'20px' }}>
            {cards.map(card => (
              <CardVisual
                key={card.id}
                card={card}
                invoiceTotal={cardInvoices[card.id] || 0}
                isSelected={selectedCard?.id === card.id}
                onClick={() => setSelectedCard(selectedCard?.id === card.id ? null : card)}
              />
            ))}
          </div>
          {selectedCard && <CardExpenses card={selectedCard} />}
        </>
      ) : (
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'48px', textAlign:'center' }}>
          <p style={{ fontSize:'32px', marginBottom:'12px' }}>💳</p>
          <p style={{ color:C.ink2, fontWeight:600 }}>Nenhum cartão cadastrado.</p>
        </div>
      )}

      <CreditCardForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

function CardExpenses({ card }: { card: CreditCard }) {
  const period = getInvoicePeriod(card.closing_day);
  const { data: expenses, isLoading } = useExpenses({ startDate: period.start, endDate: period.end });
  const cardExpenses = (expenses as any[] || []).filter(e => e.credit_card_id === card.id);

  return (
    <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
      <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
        <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>
          Fatura — {card.name}
        </span>
      </div>
      {isLoading ? (
        <div style={{ padding:'16px 20px' }}><div style={{ height:'16px', width:'160px', background:C.rule, borderRadius:'4px' }} /></div>
      ) : cardExpenses.length > 0 ? (
        <div>{cardExpenses.map((e: any) => <ExpenseRow key={e.id} expense={e} />)}</div>
      ) : (
        <p style={{ fontSize:'13px', color:C.ink3, padding:'24px 20px', textAlign:'center' }}>Nenhuma despesa nesta fatura.</p>
      )}
    </div>
  );
}

function CreditCardForm({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createCard = useCreateCreditCard();
  const { data: accounts } = useAccounts();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('5');
  const [dueDay, setDueDay] = useState('15');
  const [accountId, setAccountId] = useState('');
  const [color, setColor] = useState('#8b5cf6');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createCard.mutateAsync({ name: name.trim(), limit: parseFloat(limit.replace(',', '.')) || 0, closing_day: parseInt(closingDay), due_day: parseInt(dueDay), account_id: accountId || undefined, color } as any);
      toast({ title: 'Cartão criado' });
      setName(''); setLimit(''); setClosingDay('5'); setDueDay('15'); setAccountId(''); setColor('#8b5cf6');
      onOpenChange(false);
    } catch { toast({ title: 'Erro ao criar cartão', variant: 'destructive' }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Novo cartão</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank Roxinho" required /></div>
          <div className="space-y-2"><Label>Limite</Label><Input type="number" step="0.01" value={limit} onChange={e => setLimit(e.target.value)} placeholder="5000.00" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Dia fechamento</Label><Input type="number" min="1" max="28" value={closingDay} onChange={e => setClosingDay(e.target.value)} /></div>
            <div className="space-y-2"><Label>Dia vencimento</Label><Input type="number" min="1" max="28" value={dueDay} onChange={e => setDueDay(e.target.value)} /></div>
          </div>
          {accounts && accounts.length > 0 && (
            <div className="space-y-2"><Label>Conta vinculada (opcional)</Label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={createCard.isPending}>{createCard.isPending ? 'Criando...' : 'Criar cartão'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
