import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useView } from '@/contexts/ViewContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { useExpenses } from '@/hooks/useExpenses';
import { useFamilyBudgets, useUpsertFamilyBudget } from '@/hooks/useFamilyBudgets';
import { useFamilyProfiles } from '@/hooks/useProfiles';
import { formatBRL } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';

export default function FamilyBudgetPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { familyId, familyMembers } = useView();
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
  const monthStr = format(selectedMonth, 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

  const isAdmin = familyMembers.some(m => m.user_id === user?.id && m.role === 'admin');

  const { data: groups } = useGroups();
  const { data: familyBudgets } = useFamilyBudgets(familyId, monthStr);
  const { data: expenses } = useExpenses({ startDate: monthStart, endDate: monthEnd });
  const upsertBudget = useUpsertFamilyBudget();

  const memberUserIds = useMemo(() =>
    familyMembers.filter(m => m.user_id).map(m => m.user_id!),
    [familyMembers]
  );
  const { data: profiles } = useFamilyProfiles(memberUserIds);

  const prevMonth = () => setSelectedMonth(prev => subMonths(prev, 1));
  const nextMonth = () => setSelectedMonth(prev => addMonths(prev, 1));

  const familyExpenses = useMemo(() =>
    (expenses || []).filter((e: any) => e.visibility === 'family'),
    [expenses]
  );

  const budgetMap = useMemo(() => {
    const map: Record<string, number> = {};
    familyBudgets?.forEach(b => { map[b.group_id] = Number(b.amount); });
    return map;
  }, [familyBudgets]);

  const spentByGroupAndUser = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    familyExpenses.forEach(e => {
      if (!map[e.group_id]) map[e.group_id] = {};
      map[e.group_id][e.user_id] = (map[e.group_id][e.user_id] || 0) + Number(e.amount);
    });
    return map;
  }, [familyExpenses]);

  const spentMap = useMemo(() => {
    const map: Record<string, number> = {};
    familyExpenses.forEach(e => {
      map[e.group_id] = (map[e.group_id] || 0) + Number(e.amount);
    });
    return map;
  }, [familyExpenses]);

  const totals = useMemo(() => {
    let budgetTotal = 0, spentTotal = 0;
    groups?.forEach(g => {
      budgetTotal += budgetMap[g.id] || 0;
      spentTotal += spentMap[g.id] || 0;
    });
    return { budgetTotal, spentTotal };
  }, [groups, budgetMap, spentMap]);

  const getName = (userId: string) => {
    if (userId === user?.id) return 'Você';
    return profiles?.find(p => p.id === userId)?.display_name || 'Membro';
  };

  const handleBudgetChange = async (groupId: string, value: string) => {
    if (!familyId) return;
    const amount = parseFloat(value.replace(',', '.'));
    if (isNaN(amount) || amount < 0) return;
    try {
      await upsertBudget.mutateAsync({ family_id: familyId, group_id: groupId, month: monthStr, amount });
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
  };

  if (!familyId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Orçamento Familiar</h1>
        <div className="card-surface p-8 text-center">
          <p className="text-sm text-muted-foreground">Crie ou entre em uma família para usar o orçamento familiar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Orçamento Familiar</h1>

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

      <div className="card-surface divide-y divide-border/50">
        {groups?.map(g => {
          const budget = budgetMap[g.id] || 0;
          const spent = spentMap[g.id] || 0;
          const remaining = budget - spent;
          const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
          const over = spent > budget && budget > 0;
          const memberSpending = spentByGroupAndUser[g.id] || {};

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
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <Input
                      className="w-24 h-8 text-sm text-right"
                      defaultValue={budget > 0 ? budget.toFixed(2) : ''}
                      placeholder="0,00"
                      inputMode="decimal"
                      onBlur={e => handleBudgetChange(g.id, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    />
                  </div>
                ) : budget > 0 ? (
                  <span className="text-sm text-muted-foreground">{formatBRL(budget)}</span>
                ) : null}
              </div>

              {budget > 0 && (
                <>
                  <Progress
                    value={pct}
                    className="h-2"
                    style={{
                      '--progress-color': over ? 'hsl(var(--destructive))' : pct >= 80 ? 'hsl(38, 92%, 50%)' : g.color,
                    } as React.CSSProperties}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{formatBRL(spent)} de {formatBRL(budget)}</span>
                    <span className={over ? 'text-destructive font-medium' : 'text-emerald-600 dark:text-emerald-400'}>
                      {over ? `−${formatBRL(Math.abs(remaining))} excedido` : `${formatBRL(remaining)} restante`}
                    </span>
                  </div>
                  {/* Per-member breakdown */}
                  {Object.keys(memberSpending).length > 0 && (
                    <div className="pl-11 space-y-0.5">
                      {Object.entries(memberSpending).sort((a, b) => b[1] - a[1]).map(([uid, amt]) => (
                        <div key={uid} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{getName(uid)}</span>
                          <span className="text-muted-foreground">{formatBRL(amt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="card-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Orçamento total</p>
            <p className="text-lg font-semibold text-foreground">{formatBRL(totals.budgetTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Gasto familiar total</p>
            <p className={`text-lg font-semibold ${totals.spentTotal > totals.budgetTotal && totals.budgetTotal > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {formatBRL(totals.spentTotal)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
