import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useExpenses } from '@/hooks/useExpenses';
import { useIncomes } from '@/hooks/useIncomes';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/format';
import { TrendingUp, TrendingDown, AlertTriangle, Repeat, Award, ShoppingCart } from 'lucide-react';

interface Insight {
  text: string;
  type: 'positive' | 'warning' | 'alert';
  icon: React.ReactNode;
}

const RECOMMENDED_PCTS: Record<string, number> = {
  'alimentação': 25,
  'moradia': 30,
  'transporte': 15,
  'lazer': 10,
  'vestuário': 5,
};

export function useInsights(): Insight[] {
  const { user } = useAuth();
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const prevMonthStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
  const prevMonthEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');

  // Full year for best month
  const yearStart = `${now.getFullYear()}-01-01`;
  const yearEnd = `${now.getFullYear()}-12-31`;

  const { data: monthExpenses } = useExpenses({ startDate: monthStart, endDate: monthEnd });
  const { data: monthIncomes } = useIncomes({ startDate: monthStart, endDate: monthEnd });
  const { data: prevExpenses } = useExpenses({ startDate: prevMonthStart, endDate: prevMonthEnd });
  const { data: yearExpenses } = useExpenses({ startDate: yearStart, endDate: yearEnd });
  const { data: yearIncomes } = useIncomes({ startDate: yearStart, endDate: yearEnd });
  const { data: groups } = useGroups();

  return useMemo(() => {
    const insights: Insight[] = [];
    if (!monthExpenses || !groups || !user) return insights;

    const myExpenses = monthExpenses.filter(e => e.user_id === user.id);
    const myIncomes = (monthIncomes || []).filter(i => i.user_id === user.id);
    const myPrevExpenses = (prevExpenses || []).filter(e => e.user_id === user.id);
    const myYearExpenses = (yearExpenses || []).filter(e => e.user_id === user.id);
    const myYearIncomes = (yearIncomes || []).filter(i => i.user_id === user.id);

    const totalExp = myExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalInc = myIncomes.reduce((s, i) => s + Number(i.amount), 0);
    const prevTotal = myPrevExpenses.reduce((s, e) => s + Number(e.amount), 0);

    // Group spending percentages
    if (totalExp > 0) {
      const byGroup: Record<string, number> = {};
      myExpenses.forEach(e => {
        byGroup[e.group_id] = (byGroup[e.group_id] || 0) + Number(e.amount);
      });

      groups.forEach(g => {
        const pct = ((byGroup[g.id] || 0) / totalExp) * 100;
        const recommended = RECOMMENDED_PCTS[g.name.toLowerCase()];
        if (recommended && pct > recommended + 5) {
          insights.push({
            text: `${g.icon} ${g.name} representa ${pct.toFixed(0)}% dos seus gastos — acima do recomendado (${recommended}%)`,
            type: 'warning',
            icon: <AlertTriangle className="h-4 w-4" />,
          });
        }
      });
    }

    // vs previous month
    if (prevTotal > 0 && totalExp > 0) {
      const diff = ((totalExp - prevTotal) / prevTotal) * 100;
      if (diff > 5) {
        insights.push({
          text: `Você gastou ${diff.toFixed(0)}% a mais que no mês passado`,
          type: 'alert',
          icon: <TrendingUp className="h-4 w-4" />,
        });
      } else if (diff < -5) {
        insights.push({
          text: `Você gastou ${Math.abs(diff).toFixed(0)}% a menos que no mês passado — ótimo!`,
          type: 'positive',
          icon: <TrendingDown className="h-4 w-4" />,
        });
      }
    }

    // Biggest expense this month
    if (myExpenses.length > 0) {
      const biggest = myExpenses.reduce((max, e) => Number(e.amount) > Number(max.amount) ? e : max, myExpenses[0]);
      insights.push({
        text: `Seu maior gasto este mês foi "${biggest.description}" (${formatBRL(Number(biggest.amount))}) em ${biggest.date.split('-').reverse().join('/')}`,
        type: 'warning',
        icon: <ShoppingCart className="h-4 w-4" />,
      });
    }

    // Recurrent expenses
    const recurrentTotal = myExpenses.filter(e => e.recurrent).reduce((s, e) => s + Number(e.amount), 0);
    if (recurrentTotal > 0 && totalInc > 0) {
      const recPct = (recurrentTotal / totalInc) * 100;
      insights.push({
        text: `Você tem ${formatBRL(recurrentTotal)} em recorrentes — ${recPct.toFixed(0)}% da sua renda`,
        type: recPct > 50 ? 'alert' : recPct > 30 ? 'warning' : 'positive',
        icon: <Repeat className="h-4 w-4" />,
      });
    }

    // Best month of the year
    if (myYearExpenses && myYearIncomes) {
      const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      let bestMonth = { idx: -1, saved: -Infinity };
      for (let m = 0; m < now.getMonth() + 1; m++) {
        const prefix = `${now.getFullYear()}-${String(m + 1).padStart(2, '0')}`;
        const mExp = myYearExpenses.filter(e => e.date.startsWith(prefix)).reduce((s, e) => s + Number(e.amount), 0);
        const mInc = myYearIncomes.filter(i => i.date.startsWith(prefix)).reduce((s, i) => s + Number(i.amount), 0);
        const saved = mInc - mExp;
        if (saved > bestMonth.saved) bestMonth = { idx: m, saved };
      }
      if (bestMonth.idx >= 0 && bestMonth.saved > 0) {
        insights.push({
          text: `Melhor mês do ano: ${MONTHS_FULL[bestMonth.idx]} com ${formatBRL(bestMonth.saved)} poupados`,
          type: 'positive',
          icon: <Award className="h-4 w-4" />,
        });
      }
    }

    return insights;
  }, [monthExpenses, monthIncomes, prevExpenses, yearExpenses, yearIncomes, groups, user]);
}

const colorMap = {
  positive: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  alert: 'bg-destructive/10 text-destructive border-destructive/20',
};

const iconBgMap = {
  positive: 'bg-emerald-500/20',
  warning: 'bg-amber-500/20',
  alert: 'bg-destructive/20',
};

export function InsightsSection() {
  const insights = useInsights();

  if (insights.length === 0) return null;

  return (
    <div className="card-surface p-5">
      <h2 className="label-caps mb-4">💡 Insights</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-lg border ${colorMap[insight.type]}`}
          >
            <div className={`p-1.5 rounded-md ${iconBgMap[insight.type]} flex-shrink-0`}>
              {insight.icon}
            </div>
            <p className="text-sm leading-snug">{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
