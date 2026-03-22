import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFamilyBalance } from '@/hooks/useFamilySummary';
import { useCreateSettlement } from '@/hooks/useSettlements';
import { useView } from '@/contexts/ViewContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { EmojiAvatar } from '@/components/EmojiAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Check, ArrowRight, History } from 'lucide-react';

interface DebtEdge {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export function FamilyBalanceTab() {
  const { user } = useAuth();
  const { familyId } = useView();
  const { toast } = useToast();
  const qc = useQueryClient();
  const createSettlement = useCreateSettlement();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [settleDialog, setSettleDialog] = useState<DebtEdge | null>(null);
  const [settleAmount, setSettleAmount] = useState('');

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: ptBR });

  const { data: balanceData, isLoading } = useFamilyBalance(familyId, monthStart, monthEnd);

  // Calculate who owes whom based on equal-share principle
  const debts = useMemo<DebtEdge[]>(() => {
    if (!balanceData?.balances || balanceData.balances.length < 2) return [];

    const members = balanceData.balances;
    const totalExpenses = members.reduce((s, m) => s + Number(m.total_expenses), 0);
    if (totalExpenses === 0) return [];

    const fairShare = totalExpenses / members.length;

    // Net balance: positive = overpaid (owed money), negative = underpaid (owes money)
    let netBalances = members.map(m => ({
      ...m,
      net: Number(m.total_expenses) - fairShare,
    }));

    // Subtract existing settlements
    const settlements = balanceData.settlements || [];
    const monthSettlements = settlements.filter(s => s.settled_at >= monthStart);
    // Build a net adjustment map
    monthSettlements.forEach(s => {
      const from = netBalances.find(b => b.user_id === s.from_user_id);
      const to = netBalances.find(b => b.user_id === s.to_user_id);
      if (from) from.net += Number(s.amount);
      if (to) to.net -= Number(s.amount);
    });

    // Simplify debts
    const debtors = netBalances.filter(b => b.net < -0.01).map(b => ({ ...b, net: -b.net }));
    const creditors = netBalances.filter(b => b.net > 0.01);

    const result: DebtEdge[] = [];
    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const amount = Math.min(debtors[di].net, creditors[ci].net);
      if (amount > 0.01) {
        result.push({
          fromId: debtors[di].user_id,
          fromName: debtors[di].display_name || 'Membro',
          toId: creditors[ci].user_id,
          toName: creditors[ci].display_name || 'Membro',
          amount,
        });
      }
      debtors[di].net -= amount;
      creditors[ci].net -= amount;
      if (debtors[di].net < 0.01) di++;
      if (creditors[ci].net < 0.01) ci++;
    }

    return result;
  }, [balanceData, monthStart]);

  const handleSettle = async () => {
    if (!settleDialog || !familyId) return;
    const amount = parseFloat(settleAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }
    try {
      await createSettlement.mutateAsync({
        family_id: familyId,
        from_user_id: settleDialog.fromId,
        to_user_id: settleDialog.toId,
        amount,
      });
      toast({ title: 'Pagamento registrado!' });
      setSettleDialog(null);
      qc.invalidateQueries({ queryKey: ['family_balance'] });
      qc.invalidateQueries({ queryKey: ['settlements'] });
    } catch {
      toast({ title: 'Erro ao registrar', variant: 'destructive' });
    }
  };

  if (!familyId) {
    return (
      <div className="card-surface p-8 text-center">
        <p className="text-sm text-muted-foreground">Crie uma família para usar o acerto de contas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground capitalize">{monthLabel}</span>
        <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {isLoading ? (
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
      ) : (
        <>
          {/* Debt cards */}
          <div className="card-surface divide-y divide-border/50">
            {debts.length > 0 ? (
              debts.map((d, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <EmojiAvatar userId={d.fromId} size="sm" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {d.fromId === user?.id ? 'Você' : d.fromName}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <EmojiAvatar userId={d.toId} size="sm" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {d.toId === user?.id ? 'Você' : d.toName}
                    </span>
                  </div>
                  <span className="currency text-sm font-semibold text-destructive">{formatBRL(d.amount)}</span>
                  {(d.fromId === user?.id || d.toId === user?.id) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => {
                        setSettleDialog(d);
                        setSettleAmount(d.amount.toFixed(2));
                      }}
                    >
                      <Check className="h-3 w-3" />
                      Quitar
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground p-8 text-center">
                📊 Nenhum saldo pendente. Compartilhe despesas com a família para ver quem deve pra quem.
              </p>
            )}
          </div>

          {/* Settlement history */}
          {balanceData?.settlements && balanceData.settlements.length > 0 && (
            <div className="card-surface">
              <div className="p-4 pb-2 flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Histórico de pagamentos</p>
              </div>
              <div className="divide-y divide-border/50">
                {balanceData.settlements.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{s.from_name || 'Membro'}</span>
                        {' → '}
                        <span className="font-medium">{s.to_name || 'Membro'}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(s.settled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <span className="currency text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {formatBRL(Number(s.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Settle dialog */}
      <Dialog open={!!settleDialog} onOpenChange={(o) => !o && setSettleDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
          </DialogHeader>
          {settleDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {settleDialog.fromId === user?.id ? 'Você' : settleDialog.fromName} pagando para{' '}
                {settleDialog.toId === user?.id ? 'você' : settleDialog.toName}
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Valor (R$)</label>
                <Input
                  value={settleAmount}
                  onChange={e => setSettleAmount(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="currency text-lg"
                  autoFocus
                />
              </div>
              <Button onClick={handleSettle} className="w-full" disabled={createSettlement.isPending}>
                {createSettlement.isPending ? 'Registrando...' : 'Confirmar pagamento'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
