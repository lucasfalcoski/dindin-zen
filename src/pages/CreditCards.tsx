import { useState, useMemo } from 'react';
import { format, subMonths } from 'date-fns';
import { useCreditCards, CreditCard, useCreateCreditCard, useDeleteCreditCard } from '@/hooks/useCreditCards';
import { useAccounts } from '@/hooks/useAccounts';
import { useExpenses } from '@/hooks/useExpenses';
import { formatBRL } from '@/lib/format';
import { ExpenseRow } from '@/components/ExpenseRow';
import { Plus, CreditCard as CreditCardIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

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

export default function CreditCardsPage() {
  const { data: cards, isLoading } = useCreditCards();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cartões de Crédito</h1>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo cartão
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card-surface p-5 h-36 animate-pulse">
              <div className="h-3 w-20 bg-muted rounded mb-3" />
              <div className="h-6 w-28 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : cards && cards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map(c => (
            <CardItem key={c.id} card={c} selected={selectedCard?.id === c.id} onSelect={() => setSelectedCard(selectedCard?.id === c.id ? null : c)} />
          ))}
        </div>
      ) : (
        <div className="card-surface p-8 text-center">
          <CreditCardIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
        </div>
      )}

      {selectedCard && <CardInvoice card={selectedCard} />}

      <CreditCardForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

function CardItem({ card, selected, onSelect }: { card: CreditCard; selected: boolean; onSelect: () => void }) {
  const period = getInvoicePeriod(card.closing_day);
  const { data: expenses } = useExpenses({ startDate: period.start, endDate: period.end, creditCardId: card.id });
  const used = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);
  const pct = Number(card.limit) > 0 ? (used / Number(card.limit)) * 100 : 0;

  return (
    <button
      onClick={onSelect}
      className={`card-surface-hover p-5 text-left transition-all ${selected ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.color + '20' }}>
          <CreditCardIcon className="h-5 w-5" style={{ color: card.color }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{card.name}</p>
          <p className="text-[11px] text-muted-foreground">Vence: {getNextDueDate(card.due_day)} · Fecha dia {card.closing_day}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Usado: {formatBRL(used)}</span>
          <span className="text-muted-foreground">Limite: {formatBRL(Number(card.limit))}</span>
        </div>
        <Progress value={Math.min(pct, 100)} className="h-2" />
        <p className="text-[11px] text-muted-foreground text-right">
          Disponível: {formatBRL(Math.max(Number(card.limit) - used, 0))}
        </p>
      </div>
    </button>
  );
}

function CardInvoice({ card }: { card: CreditCard }) {
  const period = getInvoicePeriod(card.closing_day);
  const { data: expenses, isLoading } = useExpenses({ startDate: period.start, endDate: period.end, creditCardId: card.id });
  const total = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="card-surface">
      <div className="flex items-center justify-between p-4 pb-2">
        <h2 className="label-caps">Fatura atual — {card.name}</h2>
        <span className="currency text-sm font-semibold text-foreground">{formatBRL(total)}</span>
      </div>
      {isLoading ? (
        <div className="p-4 animate-pulse"><div className="h-4 w-40 bg-muted rounded" /></div>
      ) : expenses && expenses.length > 0 ? (
        <div className="divide-y divide-border/50">
          {expenses.map(e => (
            <ExpenseRow key={e.id} expense={e} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma despesa nesta fatura.</p>
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
      await createCard.mutateAsync({
        name: name.trim(),
        limit: parseFloat(limit.replace(',', '.')) || 0,
        closing_day: parseInt(closingDay) || 1,
        due_day: parseInt(dueDay) || 10,
        account_id: accountId || undefined,
        color,
      });
      toast({ title: 'Cartão criado' });
      setName(''); setLimit(''); setClosingDay('5'); setDueDay('15'); setAccountId(''); setColor('#8b5cf6');
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao criar cartão', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[90dvh] p-0 gap-0 sm:max-w-md">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Novo cartão de crédito</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0 space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank Platinum" required />
          </div>
          <div className="space-y-2">
            <Label>Limite (R$)</Label>
            <Input value={limit} onChange={e => setLimit(e.target.value)} placeholder="5000,00" inputMode="decimal" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dia do fechamento</Label>
              <Input type="number" min={1} max={31} value={closingDay} onChange={e => setClosingDay(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Dia do vencimento</Label>
              <Input type="number" min={1} max={31} value={dueDay} onChange={e => setDueDay(e.target.value)} />
            </div>
          </div>
          {accounts && accounts.length > 0 && (
            <div className="space-y-2">
              <Label>Conta vinculada (opcional)</Label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Nenhuma</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Cor</Label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-14 rounded-lg border border-input cursor-pointer" />
          </div>
          </div>
          <div className="px-6 pb-6 pt-3 flex-shrink-0 border-t border-border bg-card rounded-b-lg">
            <Button type="submit" className="w-full" disabled={createCard.isPending}>Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
