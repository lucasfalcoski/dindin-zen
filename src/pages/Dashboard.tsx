import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useExpenses } from '@/hooks/useExpenses';
import { useIncomes } from '@/hooks/useIncomes';
import { useGroups } from '@/hooks/useGroups';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useBudgets } from '@/hooks/useBudgets';
import { useView } from '@/contexts/ViewContext';
import { useFamilyProfiles } from '@/hooks/useProfiles';
import { useTagsWithStats } from '@/hooks/useTags';
import { SummaryCard } from '@/components/SummaryCard';
import { ExpenseRow } from '@/components/ExpenseRow';
import { ExpenseForm } from '@/components/ExpenseForm';
import { InsightsSection } from '@/components/InsightsSection';
import { formatBRL, getMonthYear } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp, Calendar, Wallet, BarChart3, DollarSign,
  PiggyBank, Percent, CreditCard, AlertTriangle, Users, Crown, ChevronRight,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
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

const MEMBER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

// ── cores do protótipo ──
const C = {
  green: '#1a7a45', red: '#b83232', blue: '#1d4ed8',
  amber: '#92580a', ink: '#16150f', ink2: '#6b6a63', ink3: '#b0aea6',
  rule: '#e4e1da', bg: '#f2f0eb',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { viewMode, selectedMemberId, familyMembers } = useView();
  const [formOpen, setFormOpen] = useState(false);
  const [period, setPeriod] = useState<'mensal' | 'trimestral' | 'anual'>('mensal');

  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
  const today = format(now, 'yyyy-MM-dd');

  const sixMonthsAgo = format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd');

  const { data: allMonthExpenses, isLoading } = useExpenses({ startDate: monthStart, endDate: monthEnd });
  const { data: allMonthIncomes } = useIncomes({ startDate: monthStart, endDate: monthEnd });
  const { data: sixMonthExpenses } = useExpenses({ startDate: sixMonthsAgo, endDate: monthEnd });
  const { data: sixMonthIncomes } = useIncomes({ startDate: sixMonthsAgo, endDate: monthEnd });
  const { data: groups } = useGroups();
  const { data: creditCards } = useCreditCards();
  const { data: budgets } = useBudgets(monthStart);
  const memberUserIds = useMemo(() =>
    familyMembers.filter(m => m.user_id).map(m => m.user_id!),
    [familyMembers]
  );
  const { data: profiles } = useFamilyProfiles(memberUserIds);
  const { data: tagsStats } = useTagsWithStats(monthStart, monthEnd);

  const getName = (userId: string) => {
    if (userId === user?.id) return 'Você';
    return profiles?.find(p => p.id === userId)?.display_name || 'Membro';
  };

  const monthExpenses = useMemo(() => {
    if (!allMonthExpenses) return [];
    if (viewMode === 'personal') return allMonthExpenses.filter(e => e.user_id === user?.id);
    if (viewMode === 'family') return allMonthExpenses.filter((e: any) => e.visibility === 'family');
    if (viewMode === 'member') return allMonthExpenses.filter((e: any) => e.user_id === selectedMemberId);
    return allMonthExpenses;
  }, [allMonthExpenses, viewMode, user?.id, selectedMemberId]);

  const monthIncomes = useMemo(() => {
    if (!allMonthIncomes) return [];
    if (viewMode === 'personal') return allMonthIncomes.filter(i => i.user_id === user?.id);
    if (viewMode === 'family') return allMonthIncomes.filter((i: any) => i.visibility === 'family');
    if (viewMode === 'member') return allMonthIncomes.filter((i: any) => i.user_id === selectedMemberId);
    return allMonthIncomes;
  }, [allMonthIncomes, viewMode, user?.id, selectedMemberId]);

  const stats = useMemo(() => {
    const total = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const week = monthExpenses.filter(e => e.date >= weekStart && e.date <= weekEnd).reduce((s, e) => s + Number(e.amount), 0);
    const todayTotal = monthExpenses.filter(e => e.date === today).reduce((s, e) => s + Number(e.amount), 0);
    const avgDay = now.getDate() > 0 ? total / now.getDate() : 0;
    const incTotal = monthIncomes.reduce((s, i) => s + Number(i.amount), 0);
    const balance = incTotal - total;
    const savingsRate = incTotal > 0 ? (balance / incTotal) * 100 : 0;
    return { total, week, today: todayTotal, avgDay, incTotal, balance, savingsRate };
  }, [monthExpenses, monthIncomes, weekStart, weekEnd, today]);

  const donutData = useMemo(() => {
    if (!monthExpenses.length || !groups) return [];
    const byGroup: Record<string, number> = {};
    monthExpenses.forEach(e => { byGroup[e.group_id] = (byGroup[e.group_id] || 0) + Number(e.amount); });
    return groups.filter(g => byGroup[g.id])
      .map(g => ({ name: g.name, value: byGroup[g.id], color: g.color, icon: g.icon }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses, groups]);

  const topSpender = useMemo(() => {
    if (viewMode !== 'family' || !monthExpenses.length) return null;
    const byMember: Record<string, number> = {};
    monthExpenses.forEach(e => { byMember[e.user_id] = (byMember[e.user_id] || 0) + Number(e.amount); });
    const sorted = Object.entries(byMember).sort((a, b) => b[1] - a[1]);
    return sorted.length ? { name: getName(sorted[0][0]), amount: sorted[0][1] } : null;
  }, [monthExpenses, viewMode]);

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

  const cardInvoices = useMemo(() => {
    if (!creditCards || !monthExpenses.length || viewMode !== 'personal') return [];
    return creditCards.map(card => {
      const period = getInvoicePeriod(card.closing_day);
      const total = monthExpenses
        .filter((e: any) => e.credit_card_id === card.id && e.date >= period.start && e.date <= period.end)
        .reduce((s, e) => s + Number(e.amount), 0);
      return { ...card, invoiceTotal: total };
    });
  }, [creditCards, monthExpenses, viewMode]);

  const recentExpenses = useMemo(() => monthExpenses.slice(0, 5), [monthExpenses]);

  const budgetAlerts = useMemo(() => {
    if (!budgets || !groups || !monthExpenses.length || viewMode !== 'personal') return [];
    const spentMap: Record<string, number> = {};
    monthExpenses.forEach(e => { spentMap[e.group_id] = (spentMap[e.group_id] || 0) + Number(e.amount); });
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

  const userName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || '';

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card-surface p-5 h-28 animate-pulse">
              <div className="h-2.5 w-20 rounded mb-3 bg-muted" />
              <div className="h-8 w-28 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-end justify-between pb-5 border-b border-border">
        <div>
          <p className="label-caps mb-1.5 text-muted-foreground">
            {format(now, 'MMMM yyyy', { locale: ptBR })}
          </p>
          <h1 className="page-title">
            Bom dia, <em>{userName}</em>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {(['mensal', 'trimestral', 'anual'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`pill-tab capitalize ${period === p ? 'active' : ''}`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── SUMMARY CARDS 4 cols ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <SummaryCard
          label="Saldo líquido"
          value={stats.balance}
          dotColor={C.green}
          valueClassName={stats.balance >= 0 ? 'text-primary' : 'text-destructive'}
          meta={`↓ ${Math.abs(stats.savingsRate).toFixed(0)}% vs mês anterior`}
        />
        <SummaryCard
          label="Receitas"
          value={stats.incTotal}
          dotColor={C.blue}
          showMiniBar
          barData={barData.map(b => b.receitas)}
          barColor={C.blue}
        />
        <SummaryCard
          label="Despesas"
          value={stats.total}
          dotColor={C.red}
          valueClassName="text-destructive"
          meta={`↑ 12% vs mês anterior`}
        />
        <SummaryCard
          label="Orçamento"
          value={stats.total}
          dotColor={C.amber}
          formatFn={() => stats.incTotal > 0 ? `${((stats.total / stats.incTotal) * 100).toFixed(0)}%` : '—'}
          showProgress
          progressValue={stats.incTotal > 0 ? (stats.total / stats.incTotal) * 100 : 0}
          progressColor={C.amber}
          meta={`R$ ${formatBRL(Math.max(0, stats.incTotal - stats.total)).replace('R$\u00a0', '')} restantes`}
        />
      </div>

      {/* ── BODY: 2 colunas ── */}
      <div className="grid md:grid-cols-[1.5fr_1fr] gap-3.5">

        {/* COLUNA ESQUERDA — transações recentes */}
        <div className="card-surface overflow-hidden">
          <div className="sec-head">
            <span className="sec-title">Últimas transações</span>
            <button
              onClick={() => navigate('/expenses')}
              className="text-[11px] font-semibold cursor-pointer bg-transparent border-none"
              style={{ color: C.blue }}
            >
              ver todas →
            </button>
          </div>

          {recentExpenses.length > 0 ? (
            <div>
              {recentExpenses.map(e => (
                <ExpenseRow key={e.id} expense={e} />
              ))}
            </div>
          ) : (
            <p className="text-sm p-8 text-center text-muted-foreground">
              Nenhuma despesa este mês.
            </p>
          )}
        </div>

        {/* COLUNA DIREITA — orçamento + metas */}
        <div className="flex flex-col gap-3.5">

          {/* Orçamento por categoria */}
          {budgetAlerts.length > 0 && (
            <div className="card-surface overflow-hidden">
              <div className="sec-head">
                <span className="sec-title">Orçamento por categoria</span>
                <button
                  onClick={() => navigate('/budget')}
                  className="text-[11px] font-semibold cursor-pointer bg-transparent border-none"
                  style={{ color: C.blue }}
                >
                  ajustar →
                </button>
              </div>
              <div className="px-5 py-1">
                {budgetAlerts.slice(0, 5).map(b => (
                  <div key={b.group!.id} className="py-2.5 border-b border-border last:border-b-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {b.group!.icon} {b.group!.name}
                      </span>
                      <span
                        className="text-[11px] font-bold"
                        style={{
                          color: b.pct > 100 ? C.red : b.pct >= 80 ? C.amber : C.green,
                        }}
                      >
                        {b.pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="budget-bar-track">
                      <div
                        className="budget-bar-fill"
                        style={{
                          width: `${Math.min(b.pct, 100)}%`,
                          background: b.pct > 100 ? C.red : b.pct >= 80 ? C.amber : b.group!.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metas */}
          {donutData.length > 0 && (
            <div className="card-surface overflow-hidden">
              <div className="sec-head">
                <span className="sec-title">Metas</span>
                <button
                  onClick={() => navigate('/goals')}
                  className="text-[11px] font-semibold cursor-pointer bg-transparent border-none"
                  style={{ color: C.blue }}
                >
                  ver todas →
                </button>
              </div>
              <div className="px-5 py-1">
                {donutData.slice(0, 3).map(d => (
                  <div key={d.name} className="py-2.5 border-b border-border last:border-b-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {d.icon} {d.name}
                      </span>
                      <span className="text-[11px] font-bold" style={{ color: d.color }}>
                        {((d.value / stats.total) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="budget-bar-track">
                      <div
                        className="budget-bar-fill"
                        style={{
                          width: `${Math.min((d.value / stats.total) * 100, 100)}%`,
                          background: d.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Faturas dos cartões */}
          {viewMode === 'personal' && cardInvoices.length > 0 && (
            <div className="card-surface overflow-hidden">
              <div className="sec-head">
                <span className="sec-title">Faturas dos cartões</span>
              </div>
              <div className="px-5 py-1">
                {cardInvoices.map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: c.color + '20' }}
                    >
                      <CreditCard className="w-3.5 h-3.5" style={{ color: c.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">Fatura atual</p>
                    </div>
                    <span className="currency text-[15px] text-foreground">
                      {formatBRL(c.invoiceTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── INSIGHTS ── */}
      {viewMode === 'personal' && <InsightsSection />}

      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
