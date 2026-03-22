import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFamilySummary } from '@/hooks/useFamilySummary';
import { useView } from '@/contexts/ViewContext';
import { formatBRL } from '@/lib/format';
import { EmojiAvatar } from '@/components/EmojiAvatar';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function FamilyOverview() {
  const { familyId } = useView();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: ptBR });

  const { data: summary, isLoading } = useFamilySummary(familyId, monthStart, monthEnd);

  const chartData = useMemo(() => {
    if (!summary?.expenses_by_group) return [];
    return summary.expenses_by_group
      .sort((a, b) => b.total - a.total)
      .map(g => ({
        name: `${g.group_icon} ${g.group_name}`,
        total: Number(g.total),
        color: g.group_color,
      }));
  }, [summary]);

  if (!familyId) {
    return (
      <div className="card-surface p-8 text-center">
        <p className="text-sm text-muted-foreground">Crie uma família para ver a visão geral.</p>
      </div>
    );
  }

  const balance = (summary?.total_income || 0) - (summary?.total_expenses || 0);

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
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card-surface p-4 text-center">
              <TrendingUp className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
              <p className="text-[11px] text-muted-foreground">Receitas</p>
              <p className="currency text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {formatBRL(Number(summary?.total_income || 0))}
              </p>
            </div>
            <div className="card-surface p-4 text-center">
              <TrendingDown className="h-4 w-4 mx-auto text-destructive mb-1" />
              <p className="text-[11px] text-muted-foreground">Despesas</p>
              <p className="currency text-sm font-semibold text-destructive">
                {formatBRL(Number(summary?.total_expenses || 0))}
              </p>
            </div>
            <div className="card-surface p-4 text-center">
              <Wallet className="h-4 w-4 mx-auto text-primary mb-1" />
              <p className="text-[11px] text-muted-foreground">Saldo</p>
              <p className={`currency text-sm font-semibold ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                {formatBRL(balance)}
              </p>
            </div>
          </div>

          {/* Members */}
          {summary?.members && summary.members.length > 0 && (
            <div className="card-surface divide-y divide-border/50">
              <div className="p-4 pb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Por membro</p>
              </div>
              {summary.members.map(m => (
                <div key={m.user_id} className="flex items-center gap-3 p-4">
                  <EmojiAvatar emoji={m.avatar_emoji} color={m.avatar_color} userId={m.user_id} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.display_name || 'Membro'}</p>
                  </div>
                  <div className="text-right">
                    <p className="currency text-xs text-emerald-600 dark:text-emerald-400">+{formatBRL(Number(m.total_income))}</p>
                    <p className="currency text-xs text-destructive">-{formatBRL(Number(m.total_expenses))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="card-surface p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Despesas por categoria</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" tickFormatter={(v) => `R$${v}`} className="text-xs" />
                  <YAxis type="category" dataKey="name" width={120} className="text-xs" />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
