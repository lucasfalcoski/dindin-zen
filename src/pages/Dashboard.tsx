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
import { useGoals } from '@/hooks/useGoals';
import { ExpenseRow } from '@/components/ExpenseRow';
import { ExpenseForm } from '@/components/ExpenseForm';
import { InsightsSection } from '@/components/InsightsSection';
import { formatBRL, getMonthYear } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const C = {
  ink: '#16150f', ink2: '#6b6a63', ink3: '#b0aea6',
  rule: '#e4e1da', rule2: '#ccc9c0', bg: '#f2f0eb',
  green: '#1a7a45', green_s: '#d4eddd',
  red: '#b83232', red_s: '#f5dede',
  blue: '#1d4ed8', blue_s: '#dce8ff',
  amber: '#92580a', amber_s: '#fdefd4',
};

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

  const { data: allMonthExpenses, isLoading } = useExpenses({ startDate: monthStart, endDate: monthEnd });
  const { data: allMonthIncomes } = useIncomes({ startDate: monthStart, endDate: monthEnd });
  const { data: sixMonthExpenses } = useExpenses({ startDate: sixMonthsAgo, endDate: monthEnd });
  const { data: sixMonthIncomes } = useIncomes({ startDate: sixMonthsAgo, endDate: monthEnd });
  const { data: groups } = useGroups();
  const { data: creditCards } = useCreditCards();
  const { data: budgets } = useBudgets(monthStart);
  const { data: profiles } = useFamilyProfiles();
  const { data: goals } = useGoals();

  // ── Nome real do usuário ──
  const userName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] || '';

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
    const incTotal = monthIncomes.reduce((s, i) => s + Number(i.amount), 0);
    const balance = incTotal - total;
    const savingsRate = incTotal > 0 ? (balance / incTotal) * 100 : 0;
    return { total, incTotal, balance, savingsRate };
  }, [monthExpenses, monthIncomes]);

  // ── Orçamento real (budgets x gastos) ──
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
        const pct = budget > 0 ? (spent / budget) * 100 : 0;
        return { group, spent, budget, pct };
      })
      .filter(b => b.group)
      .sort((a, b) => b.pct - a.pct);
  }, [budgets, groups, monthExpenses, viewMode]);

  // Gastos por grupo para gráfico
  const groupSpend = useMemo(() => {
    if (!monthExpenses.length || !groups) return [];
    const byGroup: Record<string, number> = {};
    monthExpenses.forEach(e => { byGroup[e.group_id] = (byGroup[e.group_id] || 0) + Number(e.amount); });
    return groups.filter(g => byGroup[g.id])
      .map(g => ({ name: g.name, icon: g.icon, value: byGroup[g.id], color: g.color }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses, groups]);

  // Mini barras de receitas (6 meses)
  const barData = useMemo(() => {
    const byMonth: Record<string, { receitas: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(now, i);
      byMonth[format(m, 'yyyy-MM')] = { receitas: 0 };
    }
    (sixMonthIncomes || []).forEach(i => {
      const key = i.date.substring(0, 7);
      if (key in byMonth) byMonth[key].receitas += Number(i.amount);
    });
    return Object.values(byMonth).map(v => v.receitas);
  }, [sixMonthIncomes]);

  const cardInvoices = useMemo(() => {
    if (!creditCards || !monthExpenses.length || viewMode !== 'personal') return [];
    return creditCards.map(card => {
      const p = getInvoicePeriod(card.closing_day);
      const total = monthExpenses.filter((e: any) => e.credit_card_id === card.id && e.date >= p.start && e.date <= p.end).reduce((s, e) => s + Number(e.amount), 0);
      return { ...card, invoiceTotal: total };
    }).filter(c => c.invoiceTotal > 0);
  }, [creditCards, monthExpenses, viewMode]);

  const recentExpenses = useMemo(() => monthExpenses.slice(0, 6), [monthExpenses]);
  const maxBar = Math.max(...barData, 1);

  if (isLoading) {
    return (
      <div>
        <div style={{ height:'56px', width:'300px', background:C.rule, borderRadius:'8px', marginBottom:'28px' }} />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px' }}>
          {[...Array(4)].map((_, i) => <div key={i} style={{ height:'110px', background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── HEADER ── */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'6px' }}>
            {format(now, 'MMMM yyyy', { locale: ptBR })}
          </p>
          <h1 style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink }}>
            {viewMode === 'family'
              ? <span style={{ display:'flex', alignItems:'center', gap:'8px' }}><Users size={28} style={{ color:C.green }} /> Dashboard Familiar</span>
              : <>Bom dia, <em style={{ fontStyle:'italic', color:C.ink2 }}>{userName}</em></>
            }
          </h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          {(['mensal', 'trimestral', 'anual'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className="capitalize"
              style={{ padding:'6px 14px', borderRadius:'100px', fontSize:'12px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", border:`1px solid ${period === p ? C.ink : C.rule2}`, background: period === p ? C.ink : 'none', color: period === p ? '#fff' : C.ink2, cursor:'pointer', transition:'all .15s' }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4 SUMMARY CARDS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'20px' }}>

        {/* Saldo líquido */}
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px', transition:'border-color .15s, box-shadow .15s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
            <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:C.green, display:'inline-block' }} />
            <span style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3 }}>Saldo líquido</span>
          </div>
          <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', letterSpacing:'-0.5px', lineHeight:1, color: stats.balance >= 0 ? C.green : C.red }}>
            {formatBRL(stats.balance)}
          </p>
          <p style={{ fontSize:'11px', color:C.ink3, marginTop:'8px', paddingTop:'8px', borderTop:`1px solid ${C.rule}`, fontWeight:500 }}>
            <span style={{ color: stats.savingsRate >= 0 ? C.green : C.red }}>↓ {Math.abs(stats.savingsRate).toFixed(0)}%</span> vs mês anterior
          </p>
        </div>

        {/* Receitas com mini barra */}
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px', transition:'border-color .15s, box-shadow .15s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
            <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:C.blue, display:'inline-block' }} />
            <span style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3 }}>Receitas</span>
          </div>
          <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', letterSpacing:'-0.5px', lineHeight:1, color:C.blue }}>{formatBRL(stats.incTotal)}</p>
          <div style={{ display:'flex', alignItems:'flex-end', gap:'3px', height:'32px', marginTop:'10px' }}>
            {barData.map((v, i) => (
              <div key={i} style={{ flex:1, height:`${(v / maxBar) * 100}%`, minHeight:'2px', borderRadius:'2px 2px 0 0', background: i === barData.length - 1 ? C.blue : C.blue_s }} />
            ))}
          </div>
        </div>

        {/* Despesas */}
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px', transition:'border-color .15s, box-shadow .15s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
            <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:C.red, display:'inline-block' }} />
            <span style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3 }}>Despesas</span>
          </div>
          <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', letterSpacing:'-0.5px', lineHeight:1, color:C.red }}>{formatBRL(stats.total)}</p>
          <p style={{ fontSize:'11px', color:C.ink3, marginTop:'8px', paddingTop:'8px', borderTop:`1px solid ${C.rule}`, fontWeight:500 }}>
            <span style={{ color:C.red }}>↑ 12%</span> vs mês anterior
          </p>
        </div>

        {/* Orçamento com progress */}
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px', transition:'border-color .15s, box-shadow .15s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
            <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:C.amber, display:'inline-block' }} />
            <span style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3 }}>Orçamento</span>
          </div>
          {(() => {
            const totalBudget = budgetAlerts.reduce((s, b) => s + b.budget, 0);
            const pct = totalBudget > 0 ? (stats.total / totalBudget) * 100 : 0;
            return (
              <>
                <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', letterSpacing:'-0.5px', lineHeight:1, color: pct > 100 ? C.red : C.amber }}>
                  {totalBudget > 0 ? `${pct.toFixed(0)}%` : '—'}
                </p>
                {totalBudget > 0 && (
                  <>
                    <div style={{ height:'3px', background:C.bg, borderRadius:'100px', overflow:'hidden', marginTop:'10px' }}>
                      <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, borderRadius:'100px', background: pct > 100 ? C.red : C.amber }} />
                    </div>
                    <p style={{ fontSize:'11px', color:C.ink3, marginTop:'8px', fontWeight:500 }}>
                      {formatBRL(Math.max(0, totalBudget - stats.total))} restantes
                    </p>
                  </>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* ── BODY 2 COLUNAS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:'14px' }}>

        {/* COLUNA ESQUERDA */}
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* Últimas transações */}
          <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
              <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Últimas transações</span>
              <button onClick={() => navigate('/expenses')} style={{ fontSize:'11px', color:C.blue, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:"'Cabinet Grotesk',sans-serif" }}>ver todas →</button>
            </div>
            {recentExpenses.length > 0
              ? <div>{recentExpenses.map(e => <ExpenseRow key={e.id} expense={e} />)}</div>
              : <p style={{ fontSize:'13px', color:C.ink3, padding:'32px', textAlign:'center' }}>Nenhuma despesa este mês.</p>
            }
          </div>

          {/* Insights dentro da coluna esquerda */}
          {viewMode === 'personal' && <InsightsSection />}
        </div>

        {/* COLUNA DIREITA */}
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* Orçamento por categoria (budgets reais) */}
          {budgetAlerts.length > 0 && (
            <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
                <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Orçamento por categoria</span>
                <button onClick={() => navigate('/budget')} style={{ fontSize:'11px', color:C.blue, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:"'Cabinet Grotesk',sans-serif" }}>ajustar →</button>
              </div>
              <div style={{ padding:'0 20px' }}>
                {budgetAlerts.slice(0, 5).map(b => (
                  <div key={b.group!.id} style={{ padding:'10px 0', borderBottom:`1px solid ${C.rule}` }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'5px' }}>
                      <span style={{ fontSize:'12px', fontWeight:600, color:C.ink2 }}>{b.group!.icon} {b.group!.name}</span>
                      <span style={{ fontSize:'11px', fontWeight:700, color: b.pct > 100 ? C.red : b.pct >= 80 ? C.amber : C.green }}>{b.pct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height:'4px', background:C.bg, borderRadius:'100px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(b.pct,100)}%`, borderRadius:'100px', background: b.pct > 100 ? C.red : b.pct >= 80 ? C.amber : b.group!.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metas */}
          {goals && goals.length > 0 && (
            <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
                <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Metas</span>
                <button onClick={() => navigate('/goals')} style={{ fontSize:'11px', color:C.blue, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:"'Cabinet Grotesk',sans-serif" }}>ver todas →</button>
              </div>
              <div style={{ padding:'0 20px' }}>
                {goals.slice(0, 3).map(g => {
                  const pct = Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100);
                  return (
                    <div key={g.id} style={{ padding:'10px 0', borderBottom:`1px solid ${C.rule}` }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'5px' }}>
                        <span style={{ fontSize:'12px', fontWeight:600, color:C.ink2 }}>{g.icon} {g.name}</span>
                        <span style={{ fontSize:'11px', fontWeight:700, color: pct >= 100 ? C.green : pct >= 80 ? C.blue : C.amber }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div style={{ height:'4px', background:C.bg, borderRadius:'100px', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, borderRadius:'100px', background: pct >= 100 ? C.green : g.color, transition:'width .6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Faturas cartões */}
          {viewMode === 'personal' && cardInvoices.length > 0 && (
            <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
                <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Faturas dos cartões</span>
              </div>
              <div style={{ padding:'0 20px' }}>
                {cardInvoices.map(c => (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 0', borderBottom:`1px solid ${C.rule}` }}>
                    <div style={{ width:'32px', height:'32px', borderRadius:'8px', background: c.color + '20', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <CreditCard style={{ width:'14px', height:'14px', color: c.color }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:'13px', fontWeight:600, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</p>
                      <p style={{ fontSize:'11px', color:C.ink3 }}>Fatura atual</p>
                    </div>
                    <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:'15px', color:C.ink }}>{formatBRL(c.invoiceTotal)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gastos por grupo (donut alternativo — barras simples quando não há orçamento) */}
          {budgetAlerts.length === 0 && groupSpend.length > 0 && (
            <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
                <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Gastos por categoria</span>
              </div>
              <div style={{ padding:'0 20px' }}>
                {groupSpend.slice(0, 5).map(g => (
                  <div key={g.name} style={{ padding:'10px 0', borderBottom:`1px solid ${C.rule}` }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'5px' }}>
                      <span style={{ fontSize:'12px', fontWeight:600, color:C.ink2 }}>{g.icon} {g.name}</span>
                      <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:'14px', color:C.ink }}>{formatBRL(g.value)}</span>
                    </div>
                    <div style={{ height:'4px', background:C.bg, borderRadius:'100px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${stats.total > 0 ? (g.value/stats.total)*100 : 0}%`, borderRadius:'100px', background:g.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
