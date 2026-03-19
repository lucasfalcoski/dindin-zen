import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useGroups } from '@/hooks/useGroups';
import { useExpenses } from '@/hooks/useExpenses';
import { useBudgets, useUpsertBudget, useCopyBudgets } from '@/hooks/useBudgets';
import { formatBRL } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function BudgetPage() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
  const monthStr = format(selectedMonth, 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

  const { data: groups } = useGroups();
  const { data: budgets, isLoading: budgetsLoading } = useBudgets(monthStr);
  const { data: expenses } = useExpenses({ startDate: monthStart, endDate: monthEnd });
  const upsertBudget = useUpsertBudget();
  const copyBudgets = useCopyBudgets();

  const prevMonth = () => setSelectedMonth(prev => subMonths(prev, 1));
  const nextMonth = () => setSelectedMonth(prev => addMonths(prev, 1));

  const budgetMap = useMemo(() => {
    const map: Record<string, number> = {};
    budgets?.forEach(b => { map[b.group_id] = Number(b.amount); });
    return map;
  }, [budgets]);

  const spentMap = useMemo(() => {
    const map: Record<string, number> = {};
    expenses?.forEach(e => {
      map[e.group_id] = (map[e.group_id] || 0) + Number(e.amount);
    });
    return map;
  }, [expenses]);

  const totals = useMemo(() => {
    let budgetTotal = 0;
    let spentTotal = 0;
    groups?.forEach(g => {
      budgetTotal += budgetMap[g.id] || 0;
      spentTotal += spentMap[g.id] || 0;
    });
    return { budgetTotal, spentTotal };
  }, [groups, budgetMap, spentMap]);

  const handleBudgetChange = async (groupId: string, value: string) => {
    const amount = parseFloat(value.replace(',', '.'));
    if (isNaN(amount) || amount < 0) return;
    try {
      await upsertBudget.mutateAsync({ group_id: groupId, month: monthStr, amount });
    } catch {
      toast({ title: 'Erro ao salvar orçamento', variant: 'destructive' });
    }
  };

  const handleCopy = async () => {
    const prevMonthStr = format(subMonths(selectedMonth, 1), 'yyyy-MM-dd');
    try {
      await copyBudgets.mutateAsync({ fromMonth: prevMonthStr, toMonth: monthStr });
      toast({ title: 'Orçamento copiado do mês anterior' });
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao copiar', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Orçamento</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={copyBudgets.isPending}
          className="flex items-center gap-1.5"
        >
          <Copy className="h-3.5 w-3.5" />
          Copiar mês anterior
        </Button>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <span className="text-lg font-medium text-foreground capitalize min-w-[160px] text-center">
          {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Budget list */}
      <div className="card-surface divide-y divide-border/50">
        {groups?.map(g => {
          const budget = budgetMap[g.id] || 0;
          const spent = spentMap[g.id] || 0;
          const remaining = budget - spent;
          const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
          const over = spent > budget && budget > 0;

          return (
            <div key={g.id} className="p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                  style={{ backgroundColor: g.color + '20' }}
                >
                  {g.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{g.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">R$</span>
                  <Input
                    className="w-24 h-8 text-sm text-right"
                    defaultValue={budget > 0 ? budget.toFixed(2) : ''}
                    placeholder="0,00"
                    inputMode="decimal"
                    onBlur={e => handleBudgetChange(g.id, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                  />
                </div>
              </div>

              {budget > 0 && (
                <>
                  <Progress
                    value={pct}
                    className="h-2"
                    style={{
                      // @ts-ignore
                      '--progress-color': over ? 'hsl(var(--destructive))' : pct >= 80 ? 'hsl(38, 92%, 50%)' : g.color,
                    } as React.CSSProperties}
                  />
                  <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                    <span className="text-muted-foreground">
                      {formatBRL(spent)} de {formatBRL(budget)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={over ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                        {pct.toFixed(0)}%
                      </span>
                      <span className={over ? 'text-destructive font-medium' : 'text-emerald-600 dark:text-emerald-400'}>
                        {over ? `−${formatBRL(Math.abs(remaining))} excedido` : `${formatBRL(remaining)} restante`}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Totals footer */}
      <div className="card-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Orçamento total</p>
            <p className="text-lg font-semibold text-foreground">{formatBRL(totals.budgetTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Gasto total</p>
            <p className={`text-lg font-semibold ${totals.spentTotal > totals.budgetTotal && totals.budgetTotal > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {formatBRL(totals.spentTotal)}
            </p>
          </div>
        </div>
        {totals.budgetTotal > 0 && (
          <Progress
            value={Math.min((totals.spentTotal / totals.budgetTotal) * 100, 100)}
            className="h-2 mt-3"
          />
        )}
      </div>
    </div>
  );
}
