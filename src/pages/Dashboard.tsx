import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useExpenses, Expense } from '@/hooks/useExpenses';
import { useIncomes } from '@/hooks/useIncomes';
import { useGroups } from '@/hooks/useGroups';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useBudgets } from '@/hooks/useBudgets';
import { useView } from '@/contexts/ViewContext';
import { useFamilyProfiles } from '@/hooks/useProfiles';
import { useTagsWithStats } from '@/hooks/useTags';
import { SummaryCard } from '@/components/SummaryCard';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { ExpenseRow } from '@/components/ExpenseRow';
import { ExpenseForm } from '@/components/ExpenseForm';
import { formatBRL, getMonthYear } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfiles';
import { Plus, TrendingUp, Calendar, Wallet, BarChart3, DollarSign, PiggyBank, Percent, CreditCard, AlertTriangle, Users, Crown, Tag } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { InsightsSection } from '@/components/InsightsSection';
import { WhatsAppPendingBanner } from '@/components/WhatsAppPendingBanner';

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

const MEMBER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { viewMode, selectedMemberId, familyMembers } = useView();
  const [formOpen, setFormOpen] = useState(false);
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
  const today = format(now, 'yyyy-MM-dd');

  const { data: allMonthExpenses, isLoading } = useExpenses({ startDate: monthStart, endDate: monthEnd });
  const { data: allMonthIncomes } = useIncomes({ startDate: monthStart, endDate: monthEnd });
  const { data: groups } = useGroups();
  const { data: creditCards } = useCreditCards();
  const { data: budgets } = useBudgets(monthStart);

  const memberUserIds = useMemo(() =>
    familyMembers.filter(m => m.user_id).map(m => m.user_id!),
    [familyMembers]
  );
  const { data: profiles } = useFamilyProfiles(memberUserIds);

  const months6ago = format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd');
  const { data: sixMonthExpenses } = useExpenses({ startDate: months6ago, endDate: monthEnd });
  const { data: sixMonthIncomes } = useIncomes({ startDate: months6ago, endDate: monthEnd });
  const { data: tagsStats } = useTagsWithStats();

  // Filter data based on view mode
  const monthExpenses = useMemo(() => {
    if (!allMonthExpenses) return [];
    switch (viewMode) {
      case 'personal':
        return allMonthExpenses.filter(e => e.user_id === user?.id);
      case 'family':
        return allMonthExpenses.filter((e: any) => e.visibility === 'family');
      case 'member':
        return allMonthExpenses.filter((e: any) => e.user_id === selectedMemberId && e.visibility === 'family');
      default:
        return allMonthExpenses;
    }
  }, [allMonthExpenses, viewMode, user?.id, selectedMemberId]);

  const monthIncomes = useMemo(() => {
    if (!allMonthIncomes) return [];
    switch (viewMode) {
      case 'personal':
        return allMonthIncomes.filter(i => i.user_id === user?.id);
      case 'family':
        return allMonthIncomes.filter((i: any) => i.visibility === 'family');
      case 'member':
        return allMonthIncomes.filter((i: any) => i.user_id === selectedMemberId && i.visibility === 'family');
      default:
        return allMonthIncomes;
    }
  }, [allMonthIncomes, viewMode, user?.id, selectedMemberId]);

  const filteredSixMonthExpenses = useMemo(() => {
    if (!sixMonthExpenses) return [];
    if (viewMode === 'personal') return sixMonthExpenses.filter(e => e.user_id === user?.id);
    if (viewMode === 'family') return sixMonthExpenses.filter((e: any) => e.visibility === 'family');
    if (viewMode === 'member') return sixMonthExpenses.filter((e: any) => e.user_id === selectedMemberId && e.visibility === 'family');
    return sixMonthExpenses;
  }, [sixMonthExpenses, viewMode, user?.id, selectedMemberId]);

  const filteredSixMonthIncomes = useMemo(() => {
    if (!sixMonthIncomes) return [];
    if (viewMode === 'personal') return sixMonthIncomes.filter(i => i.user_id === user?.id);
    if (viewMode === 'family') return sixMonthIncomes.filter((i: any) => i.visibility === 'family');
    if (viewMode === 'member') return sixMonthIncomes.filter((i: any) => i.user_id === selectedMemberId && i.visibility === 'family');
    return sixMonthIncomes;
  }, [sixMonthIncomes, viewMode, user?.id, selectedMemberId]);

  const getName = (userId: string) => {
    if (userId === user?.id) return 'Você';
    return profiles?.find(p => p.id === userId)?.display_name || 'Membro';
  };

  const stats = useMemo(() => {
    const expTotal = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const week = monthExpenses
      .filter(e => e.date >= weekStart && e.date <= weekEnd)
      .reduce((s, e) => s + Number(e.amount), 0);
    const todayTotal = monthExpenses
      .filter(e => e.date === today)
      .reduce((s, e) => s + Number(e.amount), 0);
    const daysInMonth = now.getDate();
    const avgDay = daysInMonth > 0 ? expTotal / daysInMonth : 0;
    const incTotal = monthIncomes.reduce((s, i) => s + Number(i.amount), 0);
    const balance = incTotal - expTotal;
    const savingsRate = incTotal > 0 ? (balance / incTotal) * 100 : 0;
    return { total: expTotal, week, today: todayTotal, avgDay, incTotal, balance, savingsRate };
  }, [monthExpenses, monthIncomes, weekStart, weekEnd, today]);

  const donutData = useMemo(() => {
    if (!monthExpenses.length || !groups) return [];
    if (viewMode === 'family') {
      // Group by member for family view
      const byMember: Record<string, number> = {};
      monthExpenses.forEach(e => {
        byMember[e.user_id] = (byMember[e.user_id] || 0) + Number(e.amount);
      });
      return Object.entries(byMember)
        .map(([uid, value], i) => ({
          name: getName(uid),
          value,
          color: MEMBER_COLORS[i % MEMBER_COLORS.length],
          icon: '',
        }))
        .sort((a, b) => b.value - a.value);
    }
    // Default: by group
    const byGroup: Record<string, number> = {};
    monthExpenses.forEach(e => {
      byGroup[e.group_id] = (byGroup[e.group_id] || 0) + Number(e.amount);
    });
    return groups
      .filter(g => byGroup[g.id])
      .map(g => ({ name: g.name, value: byGroup[g.id], color: g.color, icon: g.icon }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses, groups, viewMode]);

  // Family: top spender
  const topSpender = useMemo(() => {
    if (viewMode !== 'family' || !monthExpenses.length) return null;
    const byMember: Record<string, number> = {};
    monthExpenses.forEach(e => {
      byMember[e.user_id] = (byMember[e.user_id] || 0) + Number(e.amount);
    });
    const sorted = Object.entries(byMember).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return null;
    return { name: getName(sorted[0][0]), amount: sorted[0][1] };
  }, [monthExpenses, viewMode]);

  // Family: bar chart by member per group
  const familyBarData = useMemo(() => {
    if (viewMode !== 'family' || !monthExpenses.length || !groups) return [];
    const memberIds = [...new Set(monthExpenses.map(e => e.user_id))];
    return groups
      .filter(g => monthExpenses.some(e => e.group_id === g.id))
      .map(g => {
        const entry: any = { name: `${g.icon} ${g.name}` };
        memberIds.forEach(uid => {
          const spent = monthExpenses
            .filter(e => e.group_id === g.id && e.user_id === uid)
            .reduce((s, e) => s + Number(e.amount), 0);
          if (spent > 0) entry[getName(uid)] = spent;
        });
        return entry;
      });
  }, [monthExpenses, groups, viewMode]);

  const barData = useMemo(() => {
    const byMonth: Record<string, { despesas: number; receitas: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(now, i);
      byMonth[format(m, 'yyyy-MM')] = { despesas: 0, receitas: 0 };
    }
    filteredSixMonthExpenses.forEach(e => {
      const key = e.date.substring(0, 7);
      if (key in byMonth) byMonth[key].despesas += Number(e.amount);
    });
    filteredSixMonthIncomes.forEach(i => {
      const key = i.date.substring(0, 7);
      if (key in byMonth) byMonth[key].receitas += Number(i.amount);
    });
    return Object.entries(byMonth).map(([k, v]) => ({
      month: format(new Date(k + '-01'), 'MMM', { locale: ptBR }),
      ...v,
    }));
  }, [filteredSixMonthExpenses, filteredSixMonthIncomes]);

  const cardInvoices = useMemo(() => {
    if (!creditCards || !monthExpenses.length || viewMode !== 'personal') return [];
    return creditCards.map(card => {
      const period = getInvoicePeriod(card.closing_day);
      const cardExpenses = monthExpenses.filter(
        (e: any) => e.credit_card_id === card.id && e.date >= period.start && e.date <= period.end
      );
      const total = cardExpenses.reduce((s, e) => s + Number(e.amount), 0);
      return { ...card, invoiceTotal: total };
    });
  }, [creditCards, monthExpenses, viewMode]);

  const recentExpenses = useMemo(() => monthExpenses.slice(0, 5), [monthExpenses]);

  const budgetAlerts = useMemo(() => {
    if (!budgets || !groups || !monthExpenses.length || viewMode !== 'personal') return [];
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
  }, [budgets, groups, monthExpenses, viewMode]);

  const viewLabel = viewMode === 'family' ? 'Família' : viewMode === 'member' ? 'Membro' : '';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
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
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          {viewMode === 'family' ? (
            <span className="flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Dashboard Familiar</span>
          ) : (
            <>Olá{profile?.display_name ? `, ${profile.display_name}` : user?.email ? `, ${user.email.split('@')[0]}` : ''} 👋</>
          )}
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{getMonthYear()}</p>
      </div>

      <ProfileCompletionBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <SummaryCard label={`Despesas${viewLabel ? ` ${viewLabel}` : ' do mês'}`} value={stats.total} icon={<Wallet className="h-4 w-4 text-muted-foreground" />} />
        <SummaryCard label={`Receitas${viewLabel ? ` ${viewLabel}` : ' do mês'}`} value={stats.incTotal} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
        <SummaryCard
          label="Saldo"
          value={stats.balance}
          icon={<PiggyBank className="h-4 w-4 text-muted-foreground" />}
          valueClassName={stats.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}
        />
        {viewMode === 'family' && topSpender ? (
          <SummaryCard
            label="Maior gastador"
            value={topSpender.amount}
            icon={<Crown className="h-4 w-4 text-amber-500" />}
            formatFn={(v) => `${topSpender.name}: ${formatBRL(v)}`}
          />
        ) : (
          <SummaryCard
            label="Taxa de poupança"
            value={stats.savingsRate}
            icon={<Percent className="h-4 w-4 text-muted-foreground" />}
            formatFn={(v) => `${v.toFixed(1)}%`}
            valueClassName={stats.savingsRate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}
          />
        )}
        {viewMode === 'personal' && (
          <>
            <SummaryCard label="Total da semana" value={stats.week} icon={<Calendar className="h-4 w-4 text-muted-foreground" />} />
            <SummaryCard label="Total de hoje" value={stats.today} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
            <SummaryCard label="Média diária" value={stats.avgDay} icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />} />
          </>
        )}
      </div>

      {/* Credit cards section (personal only) */}
      {viewMode === 'personal' && cardInvoices.length > 0 && (
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
          <h2 className="label-caps mb-4">
            {viewMode === 'family' ? 'Gastos por membro' : 'Gastos por grupo'}
          </h2>
          {donutData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-full min-w-0 overflow-x-auto">
                <ResponsiveContainer width="50%" height={180} minWidth={140}>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {donutData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
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
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma despesa</p>
          )}
        </div>

        {viewMode === 'family' && familyBarData.length > 0 ? (
          <div className="card-surface p-5">
            <h2 className="label-caps mb-4">Gastos por membro/grupo</h2>
            <div className="w-full min-w-0 overflow-x-auto">
              <ResponsiveContainer width="100%" height={180} minWidth={280}>
                <BarChart data={familyBarData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {[...new Set(monthExpenses.map(e => e.user_id))].map((uid, i) => (
                    <Bar key={uid} dataKey={getName(uid)} fill={MEMBER_COLORS[i % MEMBER_COLORS.length]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="card-surface p-5">
            <h2 className="label-caps mb-4">Receitas vs Despesas (6 meses)</h2>
            {barData.length > 0 ? (
              <div className="w-full min-w-0 overflow-x-auto">
                <ResponsiveContainer width="100%" height={180} minWidth={280}>
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
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>
            )}
          </div>
        )}
      </div>

      {/* Budget progress bars (personal only) */}
      {budgetAlerts.length > 0 && (
        <div className="card-surface p-5">
          <h2 className="label-caps mb-4">Orçamento por grupo</h2>
          <div className="space-y-3">
            {budgetAlerts.map(b => (
              <div key={b.group!.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                  <span className="text-foreground font-medium flex items-center gap-1.5">
                    {b.group!.icon} {b.group!.name}
                    {b.pct >= 80 && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                  </span>
                  <span className={cn('whitespace-nowrap', b.pct > 100 ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                    {formatBRL(b.spent)} / {formatBRL(b.budget)} ({b.pct.toFixed(0)}%)
                  </span>
                </div>
                <Progress
                  value={Math.min(b.pct, 100)}
                  className="h-1.5"
                  style={{
                    '--progress-color': b.pct > 100 ? 'hsl(var(--destructive))' : b.pct >= 80 ? 'hsl(38, 92%, 50%)' : b.group!.color,
                  } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top tags widget */}
      {viewMode === 'personal' && tagsStats && tagsStats.length > 0 && (
        <div className="card-surface p-5">
          <h2 className="label-caps mb-4 flex items-center gap-2">
            <Tag className="h-3.5 w-3.5" />
            Top tags do mês
          </h2>
          <div className="flex flex-wrap gap-2">
            {tagsStats
              .filter(t => t.total > 0)
              .sort((a, b) => b.total - a.total)
              .slice(0, 8)
              .map(t => (
                <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50">
                  <Badge variant="outline" className="text-xs" style={{ borderColor: t.color, color: t.color }}>
                    {t.name}
                  </Badge>
                  <span className="text-xs font-medium text-foreground">{formatBRL(t.total)}</span>
                  <span className="text-[10px] text-muted-foreground">({t.count})</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {viewMode === 'personal' && <InsightsSection />}

      {/* Recent expenses */}
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
            Nenhuma despesa. Toque no + para começar.
          </p>
        )}
      </div>

      {viewMode === 'personal' && (
        <button
          onClick={() => setFormOpen(true)}
          className="fixed bottom-20 md:bottom-8 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-150 hover:scale-105 z-40"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
