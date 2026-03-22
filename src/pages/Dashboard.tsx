import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useExpenses } from '@/hooks/useExpenses';
import { useIncomes } from '@/hooks/useIncomes';
import { useGroups } from '@/hooks/useGroups';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useBudgets } from '@/hooks/useBudgets';
import { useView } from '@/contexts/ViewContext';
import { useFamilyProfiles, useProfile } from '@/hooks/useProfiles';
import { useGoals } from '@/hooks/useGoals';
import { ExpenseRow } from '@/components/ExpenseRow';
import { ExpenseForm } from '@/components/ExpenseForm';
// InsightsSection movido para topbar (TopbarInsights)
import { formatBRL } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Users } from 'lucide-react';

const C = {
  ink: '#16150f', ink2: '#6b6a63', ink3: '#b0aea6',
  rule: '#e4e1da', rule2: '#ccc9c0', bg: '#f2f0eb',
  green: '#1a7a45', red: '#b83232',
  blue: '#1d4ed8', blue_s: '#dce8ff',
  amber: '#92580a',
};

function getInvoicePeriod(closingDay: number) {
  const now = new Date();
  const d = now.getDate();
  const start = d <= closingDay
    ? new Date(now.getFullYear(), now.getMonth() - 1, closingDay + 1)
    : new Date(now.getFullYear(), now.getMonth(), closingDay + 1);
  const end = d <= closingDay
    ? new Date(now.getFullYear(), now.getMonth(), closingDay)
    : new Date(now.getFullYear(), now.getMonth() + 1, closingDay);
  return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { viewMode, selectedMemberId, familyMembers } = useView();
  const [formOpen, setFormOpen] = useState(false);
  const [period, setPeriod] = useState<'mensal' | 'trimestral' | 'anual'>('mensal');

  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const sixMonthsAgo = format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd');

  const memberUserIds = useMemo(
    () => familyMembers.filter(m => m.user_id).map(m => m.user_id!),
    [familyMembers]
  );

  const { data: allMonthExpenses, isLoading } = useExpenses({ startDate: monthStart, endDate: monthEnd });
  const { data: allMonthIncomes } = useIncomes({ startDate: monthStart, endDate: monthEnd });
  const { data: sixMonthIncomes } = useIncomes({ startDate: sixMonthsAgo, endDate: monthEnd });
  const { data: groups } = useGroups();
  const { data: creditCards } = useCreditCards();
  const { data: budgets } = useBudgets(monthStart);
  const { data: profiles } = useFamilyProfiles(memberUserIds);
  const { data: goals } = useGoals();
  const { data: profile } = useProfile();

  const userName = profile?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || '';

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
    const incTotal = monthIncomes.reduce((s, i) => s + Number(i.amount), 0);
    const balance = incTotal - total;
    const savingsRate = incTotal > 0 ? (balance / incTotal) * 100 : 0;
    return { total, incTotal, balance, savingsRate };
  }, [monthExpenses, monthIncomes]);

  const budgetAlerts = useMemo(() => {
    if (!budgets || !groups || viewMode !== 'personal') return [];
    const spentMap: Record<string, number> = {};
    monthExpenses.forEach(e => { spentMap[e.group_id] = (spentMap[e.group_id] || 0) + Number(e.amount); });
    return budgets
      .filter(b => Number(b.amount) > 0)
      .map(b => {
        const group = groups.find(g => g.id === b.group_id);
        const spent = spentMap[b.group_id] || 0;
        const budget = Number(b.amount);
        return { group, spent, budget, pct: budget > 0 ? (spent / budget) * 100 : 0 };
      })
      .filter(b => b.group)
      .sort((a, b) => b.pct - a.pct);
  }, [budgets, groups, monthExpenses, viewMode]);

  const totalBudget = budgetAlerts.reduce((s, b) => s + b.budget, 0);
  const budgetPct = totalBudget > 0 ? (stats.total / totalBudget) * 100 : 0;

  const groupSpend = useMemo(() => {
    if (!monthExpenses.length || !groups) return [];
    const byGroup: Record<string, number> = {};
    monthExpenses.forEach(e => { byGroup[e.group_id] = (byGroup[e.group_id] || 0) + Number(e.amount); });
    return groups.filter(g => byGroup[g.id])
      .map(g => ({ name: g.name, icon: g.icon, value: byGroup[g.id], color: g.color }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses, groups]);

  const barData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const key = format(subMonths(now, 5 - i), 'yyyy-MM');
      return (sixMonthIncomes || []).filter(inc => inc.date.startsWith(key)).reduce((s, inc) => s + Number(inc.amount), 0);
    });
  }, [sixMonthIncomes]);
  const maxBar = Math.max(...barData, 1);

  const cardInvoices = useMemo(() => {
    if (!creditCards || !monthExpenses.length || viewMode !== 'personal') return [];
    return creditCards.map(card => {
      const p = getInvoicePeriod(card.closing_day);
      const total = monthExpenses.filter((e: any) => e.credit_card_id === card.id && e.date >= p.start && e.date <= p.end).reduce((s, e) => s + Number(e.amount), 0);
      return { ...card, invoiceTotal: total };
    }).filter(c => c.invoiceTotal > 0);
  }, [creditCards, monthExpenses, viewMode]);

  const recentExpenses = useMemo(() => monthExpenses.slice(0, 6), [monthExpenses]);

  if (isLoading) return (
    <div>
      <div style={{ height: '56px', width: '300px', background: C.rule, borderRadius: '8px', marginBottom: '28px' }} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} style={{ height: '110px', background: '#fff', border: `1px solid ${C.rule}`, borderRadius: '14px' }} />)}
      </div>
    </div>
  );

  const sec = (title: string, action?: { label: string; to: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${C.rule}` }}>
      <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.ink2 }}>{title}</span>
      {action && <button onClick={() => navigate(action.to)} style={{ fontSize: '11px', color: C.blue, fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', fontFamily: "'Cabinet Grotesk',sans-serif" }}>{action.label} →</button>}
    </div>
  );

  const card = (children: React.ReactNode) => (
    <div style={{ background: '#fff', border: `1px solid ${C.rule}`, borderRadius: '14px', overflow: 'hidden' }}>{children}</div>
  );

  return (
    <div className="w-full min-w-0">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-7 pb-5 border-b" style={{ borderColor: C.rule }}>
        <div className="mb-3 sm:mb-0">
          <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.ink3, marginBottom: '6px' }}>
            {format(now, 'MMMM yyyy', { locale: ptBR })}
          </p>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '34px', lineHeight: 1, letterSpacing: '-0.5px', color: C.ink }}>
            {viewMode === 'family'
              ? <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={28} style={{ color: C.green }} /> Familiar</span>
              : <>{(() => { const h = new Date().getHours(); return h >= 5 && h < 12 ? 'Bom dia,' : h < 18 ? 'Boa tarde,' : 'Boa noite,'; })()} <em style={{ fontStyle: 'italic', color: C.ink2 }}>{userName}</em></>
            }
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['mensal', 'trimestral', 'anual'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, fontFamily: "'Cabinet Grotesk',sans-serif", border: `1px solid ${period === p ? C.ink : C.rule2}`, background: period === p ? C.ink : 'none', color: period === p ? '#fff' : C.ink2, cursor: 'pointer', transition: 'all .15s' }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* 4 CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {/* Saldo */}
        <div style={{ background: '#fff', border: `1px solid ${C.rule}`, borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: stats.balance >= 0 ? C.green : C.red, display: 'inline-block' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: C.ink3 }}>Saldo líquido</span>
          </div>
          <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: '28px', letterSpacing: '-0.5px', lineHeight: 1, color: stats.balance >= 0 ? C.green : C.red }}>{formatBRL(stats.balance)}</p>
          <p style={{ fontSize: '11px', color: C.ink3, marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${C.rule}`, fontWeight: 500 }}>
            Taxa poupança: <span style={{ color: stats.savingsRate >= 20 ? C.green : C.amber }}>{stats.savingsRate.toFixed(0)}%</span>
          </p>
        </div>
        {/* Receitas */}
        <div style={{ background: '#fff', border: `1px solid ${C.rule}`, borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.blue, display: 'inline-block' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: C.ink3 }}>Receitas</span>
          </div>
          <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: '28px', letterSpacing: '-0.5px', lineHeight: 1, color: C.blue }}>{formatBRL(stats.incTotal)}</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '28px', marginTop: '10px' }}>
            {barData.map((v, i) => <div key={i} style={{ flex: 1, height: `${(v / maxBar) * 100}%`, minHeight: '2px', borderRadius: '2px 2px 0 0', background: i === 5 ? C.blue : C.blue_s }} />)}
          </div>
        </div>
        {/* Despesas */}
        <div style={{ background: '#fff', border: `1px solid ${C.rule}`, borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.red, display: 'inline-block' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: C.ink3 }}>Despesas</span>
          </div>
          <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: '28px', letterSpacing: '-0.5px', lineHeight: 1, color: C.red }}>{formatBRL(stats.total)}</p>
        </div>
        {/* Orçamento */}
        <div style={{ background: '#fff', border: `1px solid ${C.rule}`, borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.amber, display: 'inline-block' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: C.ink3 }}>Orçamento</span>
          </div>
          <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: '28px', letterSpacing: '-0.5px', lineHeight: 1, color: budgetPct > 100 ? C.red : C.amber }}>{totalBudget > 0 ? `${budgetPct.toFixed(0)}%` : '—'}</p>
          {totalBudget > 0 && <>
            <div style={{ height: '3px', background: C.bg, borderRadius: '100px', overflow: 'hidden', marginTop: '10px' }}>
              <div style={{ height: '100%', width: `${Math.min(budgetPct, 100)}%`, borderRadius: '100px', background: budgetPct > 100 ? C.red : C.amber }} />
            </div>
            <p style={{ fontSize: '11px', color: C.ink3, marginTop: '6px' }}>{formatBRL(Math.max(0, totalBudget - stats.total))} restantes</p>
          </>}
        </div>
      </div>

      {/* BODY 2 COLUNAS */}
      <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-3">
        {/* ESQUERDA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {card(<>
            {sec('Últimas transações', { label: 'ver todas', to: '/expenses' })}
            {recentExpenses.length > 0
              ? <div>{recentExpenses.map(e => <ExpenseRow key={e.id} expense={e} />)}</div>
              : <p style={{ fontSize: '13px', color: C.ink3, padding: '32px', textAlign: 'center' }}>Nenhuma despesa este mês.</p>}
          </>)}
          {/* Insights exibidos na topbar via TopbarInsights */}
        </div>

        {/* DIREITA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {budgetAlerts.length > 0 && card(<>
            {sec('Orçamento', { label: 'ajustar', to: '/budget' })}
            <div style={{ padding: '0 20px' }}>
              {budgetAlerts.slice(0, 5).map(b => (
                <div key={b.group!.id} style={{ padding: '10px 0', borderBottom: `1px solid ${C.rule}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: C.ink2 }}>{b.group!.icon} {b.group!.name}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: b.pct > 100 ? C.red : b.pct >= 80 ? C.amber : C.green }}>{b.pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: '4px', background: C.bg, borderRadius: '100px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(b.pct, 100)}%`, borderRadius: '100px', background: b.pct > 100 ? C.red : b.pct >= 80 ? C.amber : b.group!.color }} />
                  </div>
                </div>
              ))}
            </div>
          </>)}

          {budgetAlerts.length === 0 && groupSpend.length > 0 && card(<>
            {sec('Por categoria')}
            <div style={{ padding: '0 20px' }}>
              {groupSpend.slice(0, 5).map(g => (
                <div key={g.name} style={{ padding: '10px 0', borderBottom: `1px solid ${C.rule}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: C.ink2 }}>{g.icon} {g.name}</span>
                    <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: '14px', color: C.ink }}>{formatBRL(g.value)}</span>
                  </div>
                  <div style={{ height: '4px', background: C.bg, borderRadius: '100px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${stats.total > 0 ? (g.value / stats.total) * 100 : 0}%`, borderRadius: '100px', background: g.color }} />
                  </div>
                </div>
              ))}
            </div>
          </>)}

          {goals && goals.length > 0 && card(<>
            {sec('Metas', { label: 'ver todas', to: '/goals' })}
            <div style={{ padding: '0 20px' }}>
              {goals.slice(0, 3).map(g => {
                const pct = Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100);
                return (
                  <div key={g.id} style={{ padding: '10px 0', borderBottom: `1px solid ${C.rule}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: C.ink2 }}>{g.icon} {g.name}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: pct >= 100 ? C.green : C.blue }}>{pct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: '4px', background: C.bg, borderRadius: '100px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: '100px', background: pct >= 100 ? C.green : g.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>)}

          {viewMode === 'personal' && cardInvoices.length > 0 && card(<>
            {sec('Faturas dos cartões')}
            <div style={{ padding: '0 20px' }}>
              {cardInvoices.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${C.rule}` }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: c.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CreditCard style={{ width: '14px', height: '14px', color: c.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                    <p style={{ fontSize: '11px', color: C.ink3 }}>Fatura atual</p>
                  </div>
                  <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: '15px', color: C.ink }}>{formatBRL(c.invoiceTotal)}</span>
                </div>
              ))}
            </div>
          </>)}
        </div>
      </div>

      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
