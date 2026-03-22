import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useExpenses } from '@/hooks/useExpenses';
import { useIncomes } from '@/hooks/useIncomes';
import { useGroups } from '@/hooks/useGroups';
import { useBudgets } from '@/hooks/useBudgets';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/format';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const C = { ink:'#16150f', ink2:'#6b6a63', ink3:'#b0aea6', rule:'#e4e1da', bg:'#f2f0eb', green:'#1a7a45', red:'#b83232', amber:'#92580a' };

function getScoreColor(score: number) {
  if (score >= 70) return C.green;
  if (score >= 40) return C.amber;
  return C.red;
}
function getScoreLabel(score: number) {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Bom';
  if (score >= 40) return 'Regular';
  return 'Precisa melhorar';
}

export default function Score() {
  const { user } = useAuth();
  const now = new Date();
  const currentMonth = format(startOfMonth(now), 'yyyy-MM-dd');
  const sixMonthsAgo = format(subMonths(startOfMonth(now), 6), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: allExpenses } = useExpenses({ startDate: sixMonthsAgo, endDate: monthEnd });
  const { data: allIncomes } = useIncomes({ startDate: sixMonthsAgo, endDate: monthEnd });
  const { data: groups } = useGroups();
  const { data: budgets } = useBudgets(currentMonth);

  const myExpenses = useMemo(() => (allExpenses || []).filter(e => e.user_id === user?.id), [allExpenses, user]);
  const myIncomes = useMemo(() => (allIncomes || []).filter(i => i.user_id === user?.id), [allIncomes, user]);

  const { totalScore, components, monthlyScores } = useMemo(() => {
    const comps: { label: string; score: number; maxScore: number; tip: string; emoji: string }[] = [];
    const monthPrefix = format(now, 'yyyy-MM');
    const monthExp = myExpenses.filter(e => e.date.startsWith(monthPrefix));
    const monthInc = myIncomes.filter(i => i.date.startsWith(monthPrefix));
    const totalExp = monthExp.reduce((s, e) => s + Number(e.amount), 0);
    const totalInc = monthInc.reduce((s, i) => s + Number(i.amount), 0);

    // 1. Poupança (30 pts)
    let savingsScore = 0;
    if (totalInc > 0) savingsScore = Math.max(0, Math.min(30, Math.round(((totalInc - totalExp) / totalInc) * 100)));
    comps.push({ label: 'Taxa de poupança', score: savingsScore, maxScore: 30, emoji: '💰', tip: totalInc > 0 ? `Você poupou ${((totalInc - totalExp) / totalInc * 100).toFixed(0)}% da renda. Meta: 20%+` : 'Registre suas receitas para calcular' });

    // 2. Orçamento (30 pts)
    let budgetScore = 0;
    if (budgets && budgets.length > 0 && groups) {
      let withinCount = 0;
      budgets.forEach(b => { const spent = monthExp.filter(e => e.group_id === b.group_id).reduce((s, e) => s + Number(e.amount), 0); if (spent <= b.amount) withinCount++; });
      budgetScore = Math.round((withinCount / budgets.length) * 30);
    }
    comps.push({ label: 'Controle de orçamento', score: budgetScore, maxScore: 30, emoji: '📊', tip: budgets && budgets.length > 0 ? `${budgetScore === 30 ? 'Todos' : 'Alguns'} grupos dentro do limite` : 'Configure orçamentos para pontuar' });

    // 3. Consistência (20 pts)
    let consecutive = 0;
    for (let i = 0; i < 6; i++) {
      const m = format(subMonths(startOfMonth(now), i), 'yyyy-MM');
      const mExp = myExpenses.filter(e => e.date.startsWith(m)).reduce((s, e) => s + Number(e.amount), 0);
      const mInc = myIncomes.filter(inc => inc.date.startsWith(m)).reduce((s, inc) => s + Number(inc.amount), 0);
      if (mInc > mExp) consecutive++; else break;
    }
    const consistencyScore = Math.min(20, Math.round((consecutive / 6) * 20));
    comps.push({ label: 'Consistência', score: consistencyScore, maxScore: 20, emoji: '📈', tip: `${consecutive} meses seguidos com saldo positivo` });

    // 4. Diversificação (10 pts)
    const categories = new Set(monthInc.map(i => i.category));
    const diversScore = Math.min(10, categories.size * 3);
    comps.push({ label: 'Diversificação de receitas', score: diversScore, maxScore: 10, emoji: '🌐', tip: `${categories.size} fonte(s) de renda` });

    // 5. Impulso (10 pts)
    const leisureGroups = (groups || []).filter(g => ['lazer', 'entretenimento', 'compras'].some(k => g.name.toLowerCase().includes(k)));
    const leisureIds = new Set(leisureGroups.map(g => g.id));
    const avgMonthly = totalInc > 0 ? totalInc * 0.15 : totalExp * 0.15;
    const bigLeisure = monthExp.filter(e => leisureIds.has(e.group_id) && Number(e.amount) > avgMonthly);
    const impulseScore = Math.max(0, 10 - bigLeisure.length * 3);
    comps.push({ label: 'Controle de impulsos', score: impulseScore, maxScore: 10, emoji: '🛡️', tip: bigLeisure.length === 0 ? 'Sem gastos impulsivos altos' : `${bigLeisure.length} gasto(s) alto(s) em lazer` });

    const total = comps.reduce((s, c) => s + c.score, 0);
    const history = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(startOfMonth(now), i);
      const prefix = format(m, 'yyyy-MM');
      const mExp = myExpenses.filter(e => e.date.startsWith(prefix)).reduce((s, e) => s + Number(e.amount), 0);
      const mInc = myIncomes.filter(inc => inc.date.startsWith(prefix)).reduce((s, inc) => s + Number(inc.amount), 0);
      let mScore = 0;
      if (mInc > 0) mScore += Math.max(0, Math.min(30, Math.round(((mInc - mExp) / mInc) * 100)));
      mScore += budgetScore + consistencyScore + diversScore + impulseScore;
      history.push({ month: MONTHS_PT[m.getMonth()], score: Math.min(100, mScore) });
    }
    return { totalScore: total, components: comps, monthlyScores: history };
  }, [myExpenses, myIncomes, groups, budgets]);

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (totalScore / 100) * circumference;
  const scoreColor = getScoreColor(totalScore);

  return (
    <div>
      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'6px' }}>análise</p>
          <h1 style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink }}>Score <em style={{ fontStyle:'italic', color:C.ink2 }}>Financeiro</em></h1>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>
        {/* Score ring */}
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'32px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div style={{ position:'relative', width:'160px', height:'160px' }}>
            <svg style={{ width:'100%', height:'100%', transform:'rotate(-90deg)' }} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke={C.rule} strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="none" stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:'42px', color:C.ink, lineHeight:1 }}>{totalScore}</span>
              <span style={{ fontSize:'11px', color:C.ink3 }}>de 100</span>
            </div>
          </div>
          <p style={{ marginTop:'16px', fontSize:'18px', fontWeight:700, color:scoreColor, fontFamily:"'Cabinet Grotesk',sans-serif" }}>
            {getScoreLabel(totalScore)}
          </p>
        </div>

        {/* Breakdown */}
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
            <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Composição</span>
          </div>
          <div style={{ padding:'0 20px' }}>
            {components.map((comp, i) => (
              <div key={i} style={{ padding:'12px 0', borderBottom: i < components.length - 1 ? `1px solid ${C.rule}` : 'none' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
                  <span style={{ fontSize:'13px', color:C.ink, fontWeight:500 }}>{comp.emoji} {comp.label}</span>
                  <span style={{ fontSize:'12px', fontWeight:700, color: getScoreColor((comp.score / comp.maxScore) * 100) }}>
                    {comp.score}/{comp.maxScore}
                  </span>
                </div>
                <div style={{ height:'4px', background:C.bg, borderRadius:'100px', overflow:'hidden', marginBottom:'4px' }}>
                  <div style={{ height:'100%', width:`${(comp.score / comp.maxScore) * 100}%`, borderRadius:'100px', background: getScoreColor((comp.score / comp.maxScore) * 100), transition:'width .7s ease' }} />
                </div>
                <p style={{ fontSize:'11px', color:C.ink3 }}>{comp.tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
          <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Histórico do score</span>
        </div>
        <div style={{ padding:'20px' }}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyScores}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.rule} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.ink3 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: C.ink3 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ border:`1px solid ${C.rule}`, borderRadius:'8px', fontSize:'12px' }} />
              <Line type="monotone" dataKey="score" name="Score" stroke={C.green} strokeWidth={2} dot={{ fill: C.green, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
