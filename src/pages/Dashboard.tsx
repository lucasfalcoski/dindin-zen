import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useExpenses, Expense } from '@/hooks/useExpenses';
import { useIncomes } from '@/hooks/useIncomes';
import { useGroups } from '@/hooks/useGroups';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useBudgets } from '@/hooks/useBudgets';
import { SummaryCard } from '@/components/SummaryCard';
import { ExpenseRow } from '@/components/ExpenseRow';
import { ExpenseForm } from '@/components/ExpenseForm';
import { formatBRL, getMonthYear } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, TrendingUp, Calendar, Wallet, BarChart3, DollarSign, PiggyBank, Percent, CreditCard, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Progress } from '@/components/ui/progress';

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

export default function Dashboard() {
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
  const today = format(now, 'yyyy-MM-dd');

  const { data: monthExpenses, isLoading } = useExpenses({ startDate: monthStart, endDate: monthEnd });
  const { data: monthIncomes } = useIncomes({ startDate: monthStart, endDate: monthEnd });
  const { data: groups } = useGroups();
  const { data: creditCards } = useCreditCards();
  const { data: budgets } = useBudgets(monthStart);

  const months6ago = format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd');
  const { data: sixMonthExpenses } = useExpenses({ startDate: months6ago, endDate: monthEnd });
  const { data: sixMonthIncomes } = useIncomes({ startDate: months6ago, endDate: monthEnd });

  const stats = useMemo(() => {
    const expTotal = (monthExpenses || []).reduce((s, e) => s + Number(e.amount), 0);
    const week = (monthExpenses || [])
      .filter(e => e.date >= weekStart && e.date <= weekEnd)
      .reduce((s, e) => s + Number(e.amount), 0);
    const todayTotal = (monthExpenses || [])
      .filter(e => e.date === today)
      .reduce((s, e) => s + Number(e.amount), 0);
    const daysInMonth = now.getDate();
    const avgDay = daysInMonth > 0 ? expTotal / daysInMonth : 0;
    const incTotal = (monthIncomes || []).reduce((s, i) => s + Number(i.amount), 0);
    const balance = incTotal - expTotal;
    const savingsRate = incTotal > 0 ? (balance / incTotal) * 100 : 0;
    return { total: expTotal, week, today: todayTotal, avgDay, incTotal, balance, savingsRate };
  }, [monthExpenses, monthIncomes, weekStart, weekEnd, today]);

  const donutData = useMemo(() => {
    if (!monthExpenses || !groups) return [];
    const byGroup: Record<string, number> = {};
    monthExpenses.forEach(e => {
      byGroup[e.group_id] = (byGroup[e.group_id] || 0) + Number(e.amount);
    });
    return groups
      .filter(g => byGroup[g.id])
      .map(g => ({ name: g.name, value: byGroup[g.id], color: g.color, icon: g.icon }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses, groups]);

  const barData = useMemo(() => {
    const byMonth: Record<string, { despesas: number; receitas: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(now, i);
      byMonth[format(m, 'yyyy-MM')] = { despesas: 0, receitas: 0 };
    }
    (sixMonthExpenses || []).forEach(e => {
      const key = e.date.substring(0, 7);
      if (key in byMonth) byMonth[key].despesas += Number(e.amount);
    });
    (sixMonthIncomes || []).forEach(i => {
      const key = i.date.substring(0, 7);
      if (key in byMonth) byMonth[key].receitas += Number(i.amount);
    });
    return Object.entries(byMonth).map(([k, v]) => ({
      month: format(new Date(k + '-01'), 'MMM', { locale: ptBR }),
      ...v,
    }));
  }, [sixMonthExpenses, sixMonthIncomes]);

  // Credit card invoice totals
  const cardInvoices = useMemo(() => {
    if (!creditCards || !monthExpenses) return [];
    return creditCards.map(card => {
      const period = getInvoicePeriod(card.closing_day);
      const cardExpenses = (monthExpenses || []).filter(
        (e: any) => e.credit_card_id === card.id && e.date >= period.start && e.date <= period.end
      );
      const total = cardExpenses.reduce((s, e) => s + Number(e.amount), 0);
      return { ...card, invoiceTotal: total };
    }).filter(c => c.invoiceTotal > 0 || true); // show all cards
  }, [creditCards, monthExpenses]);

  const recentExpenses = useMemo(() => {
    return (monthExpenses || []).slice(0, 5);
  }, [monthExpenses]);

  const recurringExpenses = useMemo(() => {
    return (monthExpenses || []).filter(e => e.recurrent);
  }, [monthExpenses]);

  // Budget data for dashboard
  const budgetAlerts = useMemo(() => {
    if (!budgets || !groups || !monthExpenses) return [];
    const spentMap: Record<string, number> = {};
    monthExpenses.forEach(e => {
      spentMap[e.group_id] = (spentMap[e.group_id] || 0) + Number(e.amount);
    });
    return budgets
      .filter(b => Number(b.amount) > 0)
      .map(b => {
        const group = groups.find(g => g.id === b.group_id);
        const spent = spentMap[b.group_id] || 0;
        const budget = Number(b.amount);
        const pct = (spent / budget) * 100;
        return { group, spent, budget, pct };
      })
      .filter(b => b.group)
      .sort((a, b) => b.pct - a.pct);
  }, [budgets, groups, monthExpenses]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="card-surface p-5 h-24 animate-pulse">
              <div className="h-3 w-20 bg-muted rounded mb-3" />
              <div className="h-6 w-28 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Olá{user?.email ? `, ${user.email.split('@')[0]}` : ''} 👋
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{getMonthYear()}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Despesas do mês" value={stats.total} icon={<Wallet className="h-4 w-4 text-muted-foreground" />} />
        <SummaryCard label="Receitas do mês" value={stats.incTotal} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
        <SummaryCard
          label="Saldo do mês"
          value={stats.balance}
          icon={<PiggyBank className="h-4 w-4 text-muted-foreground" />}
          valueClassName={stats.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}
        />
        <SummaryCard
          label="Taxa de poupança"
          value={stats.savingsRate}
          icon={<Percent className="h-4 w-4 text-muted-foreground" />}
          formatFn={(v) => `${v.toFixed(1)}%`}
          valueClassName={stats.savingsRate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}
        />
        <SummaryCard label="Total da semana" value={stats.week} icon={<Calendar className="h-4 w-4 text-muted-foreground" />} />
        <SummaryCard label="Total de hoje" value={stats.today} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
        <SummaryCard label="Média diária" value={stats.avgDay} icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />} />
      </div>

      {/* Credit cards section */}
      {cardInvoices.length > 0 && (
        <div className="card-surface p-5">
          <h2 className="label-caps mb-4">Faturas dos cartões</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {cardInvoices.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: c.color + '20' }}>
                  <CreditCard className="h-4 w-4" style={{ color: c.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">Fatura atual</p>
                </div>
                <span className="currency text-sm font-semibold text-foreground">{formatBRL(c.invoiceTotal)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-surface p-5">
          <h2 className="label-caps mb-4">Gastos por grupo</h2>
          {donutData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {donutData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {donutData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground truncate flex-1">{d.icon} {d.name}</span>
                    <span className="currency text-foreground">{formatBRL(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma despesa este mês</p>
          )}
        </div>

        <div className="card-surface p-5">
          <h2 className="label-caps mb-4">Receitas vs Despesas (6 meses)</h2>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="receitas" name="Receitas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>
          )}
        </div>
      </div>

      {/* Recurring expenses section */}
      {recurringExpenses.length > 0 && (
        <div className="card-surface">
          <div className="flex items-center justify-between p-4 pb-2">
            <h2 className="label-caps">🔄 Recorrentes do mês</h2>
            <span className="text-xs text-muted-foreground">{recurringExpenses.length} lançamento(s)</span>
          </div>
          <div className="divide-y divide-border/50">
            {recurringExpenses.map(e => (
              <ExpenseRow key={e.id} expense={e} />
            ))}
          </div>
        </div>
      )}

      <div className="card-surface">
        <div className="flex items-center justify-between p-4 pb-2">
          <h2 className="label-caps">Despesas recentes</h2>
        </div>
        {recentExpenses.length > 0 ? (
          <div className="divide-y divide-border/50">
            {recentExpenses.map(e => (
              <ExpenseRow key={e.id} expense={e} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground p-4 text-center">
            Nenhuma despesa este mês. Toque no + para começar.
          </p>
        )}
      </div>

      <button
        onClick={() => setFormOpen(true)}
        className="fixed bottom-20 md:bottom-8 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-150 hover:scale-105 z-40"
      >
        <Plus className="h-6 w-6" />
      </button>

      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
