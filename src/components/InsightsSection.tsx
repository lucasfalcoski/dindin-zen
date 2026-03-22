import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import { useExpenses } from '@/hooks/useExpenses';
import { useIncomes } from '@/hooks/useIncomes';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/format';
import { TrendingUp, TrendingDown, AlertTriangle, Award, Repeat, ShoppingBag, Lightbulb } from 'lucide-react';

const C = {
  ink: '#16150f', ink2: '#6b6a63', ink3: '#b0aea6',
  rule: '#e4e1da', bg: '#f2f0eb',
  green: '#1a7a45', green_s: '#d4eddd',
  red: '#b83232', red_s: '#f5dede',
  amber: '#92580a', amber_s: '#fdefd4',
  blue: '#1d4ed8', blue_s: '#dce8ff',
};

interface Insight {
  text: string;
  type: 'positive' | 'warning' | 'alert' | 'info';
  icon: React.ReactNode;
}

const typeStyle = {
  positive: { bg: C.green_s, color: C.green, iconBg: 'rgba(26,122,69,0.15)' },
  warning:  { bg: C.amber_s,  color: C.amber,  iconBg: 'rgba(146,88,10,0.12)' },
  alert:    { bg: C.red_s,    color: C.red,    iconBg: 'rgba(184,50,50,0.12)' },
  info:     { bg: C.blue_s,   color: C.blue,   iconBg: 'rgba(29,78,216,0.12)' },
};

function useInsights(): Insight[] {
  const { user } = useAuth();
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const prevStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
  const prevEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
  const yearStart = format(startOfYear(now), 'yyyy-MM-dd');

  const { data: monthExpenses } = useExpenses({ startDate: monthStart, endDate: monthEnd });
  const { data: monthIncomes } = useIncomes({ startDate: monthStart, endDate: monthEnd });
  const { data: prevExpenses } = useExpenses({ startDate: prevStart, endDate: prevEnd });
  const { data: yearExpenses } = useExpenses({ startDate: yearStart, endDate: monthEnd });
  const { data: yearIncomes } = useIncomes({ startDate: yearStart, endDate: monthEnd });
  const { data: groups } = useGroups();

  return useMemo(() => {
    const insights: Insight[] = [];

    const myMonthExp = (monthExpenses || []).filter(e => e.user_id === user?.id);
    const myMonthInc = (monthIncomes || []).filter(i => i.user_id === user?.id);
    const myPrevExp  = (prevExpenses  || []).filter(e => e.user_id === user?.id);
    const myYearExp  = (yearExpenses  || []).filter(e => e.user_id === user?.id);
    const myYearInc  = (yearIncomes   || []).filter(i => i.user_id === user?.id);

    const totalExp  = myMonthExp.reduce((s, e) => s + Number(e.amount), 0);
    const totalInc  = myMonthInc.reduce((s, i) => s + Number(i.amount), 0);
    const prevTotal = myPrevExp.reduce((s, e) => s + Number(e.amount), 0);

    // 1. Gasto alto vs mês anterior
    if (prevTotal > 0) {
      const delta = ((totalExp - prevTotal) / prevTotal) * 100;
      if (delta > 20) {
        insights.push({
          text: `Seus gastos subiram ${delta.toFixed(0)}% vs mês anterior (${formatBRL(prevTotal)} → ${formatBRL(totalExp)})`,
          type: 'alert',
          icon: <TrendingUp size={14} />,
        });
      } else if (delta < -10) {
        insights.push({
          text: `Ótimo! Você gastou ${Math.abs(delta).toFixed(0)}% menos que o mês passado`,
          type: 'positive',
          icon: <TrendingDown size={14} />,
        });
      }
    }

    // 2. Taxa de poupança
    if (totalInc > 0) {
      const rate = ((totalInc - totalExp) / totalInc) * 100;
      if (rate >= 20) {
        insights.push({
          text: `Excelente! Você está poupando ${rate.toFixed(0)}% da sua renda este mês`,
          type: 'positive',
          icon: <Award size={14} />,
        });
      } else if (rate < 0) {
        insights.push({
          text: `Atenção: suas despesas (${formatBRL(totalExp)}) superam suas receitas (${formatBRL(totalInc)}) este mês`,
          type: 'alert',
          icon: <AlertTriangle size={14} />,
        });
      }
    }

    // 3. Maior grupo de gastos
    if (groups && myMonthExp.length > 0 && totalExp > 0) {
      const byGroup: Record<string, number> = {};
      myMonthExp.forEach(e => { byGroup[e.group_id] = (byGroup[e.group_id] || 0) + Number(e.amount); });
      const topId = Object.entries(byGroup).sort((a, b) => b[1] - a[1])[0];
      if (topId) {
        const g = groups.find(g => g.id === topId[0]);
        const pct = (topId[1] / totalExp) * 100;
        if (g && pct > 25) {
          insights.push({
            text: `${g.icon} ${g.name} representa ${pct.toFixed(0)}% dos seus gastos${pct > 50 ? ' — acima do recomendado (25%)' : ''}`,
            type: pct > 50 ? 'alert' : 'warning',
            icon: <ShoppingBag size={14} />,
          });
        }
      }
    }

    // 4. Maior gasto do mês
    if (myMonthExp.length > 0) {
      const biggest = [...myMonthExp].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
      insights.push({
        text: `Seu maior gasto este mês foi "${biggest.description}" (${formatBRL(Number(biggest.amount))}) em ${biggest.date.split('-').reverse().join('/')}`,
        type: 'info',
        icon: <ShoppingBag size={14} />,
      });
    }

    // 5. Receitas recorrentes
    if (myMonthInc.length > 0 && totalInc > 0) {
      const recCount = myMonthInc.filter(i => i.recurrent).reduce((s, i) => s + Number(i.amount), 0);
      const recPct = (recCount / totalInc) * 100;
      if (recPct < 50) {
        insights.push({
          text: `Apenas ${recPct.toFixed(0)}% das suas receitas são recorrentes — considere diversificar`,
          type: 'warning',
          icon: <Repeat size={14} />,
        });
      }
    }

    // 6. Melhor mês do ano
    if (myYearExp.length > 0 && myYearInc.length > 0) {
      const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      let bestMonth = { idx: -1, saved: -Infinity };
      for (let m = 0; m <= now.getMonth(); m++) {
        const prefix = `${now.getFullYear()}-${String(m + 1).padStart(2, '0')}`;
        const mExp = myYearExp.filter(e => e.date.startsWith(prefix)).reduce((s, e) => s + Number(e.amount), 0);
        const mInc = myYearInc.filter(i => i.date.startsWith(prefix)).reduce((s, i) => s + Number(i.amount), 0);
        const saved = mInc - mExp;
        if (saved > bestMonth.saved) bestMonth = { idx: m, saved };
      }
      if (bestMonth.idx >= 0 && bestMonth.saved > 0) {
        insights.push({
          text: `Melhor mês do ano: ${MONTHS_FULL[bestMonth.idx]} com ${formatBRL(bestMonth.saved)} poupados`,
          type: 'positive',
          icon: <Award size={14} />,
        });
      }
    }

    return insights;
  }, [monthExpenses, monthIncomes, prevExpenses, yearExpenses, yearIncomes, groups, user]);
}

export function InsightsSection() {
  const insights = useInsights();
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  // Rotaciona a cada 5 segundos com fade
  useEffect(() => {
    if (insights.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent(c => (c + 1) % insights.length);
        setVisible(true);
      }, 300);
    }, 5000);
    return () => clearInterval(timer);
  }, [insights.length]);

  // Reset quando insights mudam
  useEffect(() => { setCurrent(0); setVisible(true); }, [insights.length]);

  if (insights.length === 0) return null;

  const insight = insights[current];
  const style = typeStyle[insight.type];

  return (
    <div
      style={{
        background: style.bg,
        border: `1px solid ${style.color}22`,
        borderRadius: '14px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        cursor: insights.length > 1 ? 'pointer' : 'default',
        userSelect: 'none',
      }}
      onClick={() => {
        if (insights.length <= 1) return;
        setVisible(false);
        setTimeout(() => {
          setCurrent(c => (c + 1) % insights.length);
          setVisible(true);
        }, 200);
      }}
    >
      {/* Ícone */}
      <div style={{
        width: '28px', height: '28px', borderRadius: '8px',
        background: style.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: style.color, flexShrink: 0,
      }}>
        {insight.icon}
      </div>

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: style.color, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            💡 Insights
          </span>
          {/* Dots */}
          {insights.length > 1 && (
            <div style={{ display: 'flex', gap: '3px', marginLeft: 'auto' }}>
              {insights.map((_, i) => (
                <div key={i} style={{ width: i === current ? '14px' : '5px', height: '5px', borderRadius: '100px', background: style.color, opacity: i === current ? 1 : 0.3, transition: 'all .3s' }} />
              ))}
            </div>
          )}
        </div>
        <p style={{ fontSize: '13px', color: style.color, lineHeight: 1.5, fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 500 }}>
          {insight.text}
        </p>
      </div>
    </div>
  );
}
