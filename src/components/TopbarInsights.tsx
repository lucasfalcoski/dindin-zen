import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import { useExpenses } from '@/hooks/useExpenses';
import { useIncomes } from '@/hooks/useIncomes';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/format';

interface Insight {
  text: string;
  type: 'positive' | 'warning' | 'alert';
}

function useInsights(): Insight[] {
  const { user } = useAuth();
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const prevStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
  const prevEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');

  const { data: monthExpenses } = useExpenses({ startDate: monthStart, endDate: monthEnd });
  const { data: monthIncomes } = useIncomes({ startDate: monthStart, endDate: monthEnd });
  const { data: prevExpenses } = useExpenses({ startDate: prevStart, endDate: prevEnd });
  const { data: groups } = useGroups();

  return useMemo(() => {
    const insights: Insight[] = [];
    const myExp = (monthExpenses || []).filter(e => e.user_id === user?.id);
    const myInc = (monthIncomes || []).filter(i => i.user_id === user?.id);
    const myPrevExp = (prevExpenses || []).filter(e => e.user_id === user?.id);

    const totalExp = myExp.reduce((s, e) => s + Number(e.amount), 0);
    const totalInc = myInc.reduce((s, i) => s + Number(i.amount), 0);
    const prevTotal = myPrevExp.reduce((s, e) => s + Number(e.amount), 0);

    // Gasto alto vs mês anterior
    if (prevTotal > 0) {
      const delta = ((totalExp - prevTotal) / prevTotal) * 100;
      if (delta > 20) insights.push({ text: `↑ Gastos ${delta.toFixed(0)}% acima do mês passado`, type: 'alert' });
      else if (delta < -10) insights.push({ text: `↓ Gastos ${Math.abs(delta).toFixed(0)}% abaixo do mês passado`, type: 'positive' });
    }

    // Saldo negativo
    if (totalInc > 0 && totalExp > totalInc) {
      insights.push({ text: `Despesas superam receitas em ${formatBRL(totalExp - totalInc)}`, type: 'alert' });
    }

    // Maior grupo
    if (groups && myExp.length > 0 && totalExp > 0) {
      const byGroup: Record<string, number> = {};
      myExp.forEach(e => { byGroup[e.group_id] = (byGroup[e.group_id] || 0) + Number(e.amount); });
      const topId = Object.entries(byGroup).sort((a, b) => b[1] - a[1])[0];
      if (topId) {
        const g = groups.find(g => g.id === topId[0]);
        const pct = (topId[1] / totalExp) * 100;
        if (g && pct > 40) insights.push({ text: `${g.icon} ${g.name} — ${pct.toFixed(0)}% dos gastos`, type: pct > 60 ? 'alert' : 'warning' });
      }
    }

    // Poupança boa
    if (totalInc > 0) {
      const rate = ((totalInc - totalExp) / totalInc) * 100;
      if (rate >= 20) insights.push({ text: `🎯 Poupando ${rate.toFixed(0)}% da renda este mês`, type: 'positive' });
    }

    return insights;
  }, [monthExpenses, monthIncomes, prevExpenses, groups, user]);
}

const typeColors = {
  positive: { bg: '#d4eddd', color: '#1a7a45', dot: '#1a7a45' },
  warning:  { bg: '#fdefd4', color: '#92580a', dot: '#92580a' },
  alert:    { bg: '#f5dede', color: '#b83232', dot: '#b83232' },
};

export function TopbarInsights() {
  const insights = useInsights();
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (insights.length <= 1) return;
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setCurrent(c => (c + 1) % insights.length); setVisible(true); }, 250);
    }, 5000);
    return () => clearInterval(t);
  }, [insights.length]);

  useEffect(() => { setCurrent(0); setVisible(true); }, [insights.length]);

  if (insights.length === 0) return null;

  const insight = insights[current];
  const colors = typeColors[insight.type];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 12px', borderRadius: '100px',
          background: colors.bg,
          border: `1px solid ${colors.color}22`,
          cursor: 'pointer', opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      >
        {/* Dot pulsante */}
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: colors.dot, flexShrink: 0,
          animation: 'pulse-dot 1.5s ease-in-out infinite',
        }} />
        <span style={{
          fontSize: '11px', fontWeight: 600,
          color: colors.color,
          fontFamily: "'Cabinet Grotesk', sans-serif",
          maxWidth: '280px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {insight.text}
        </span>
        {insights.length > 1 && (
          <span style={{ fontSize: '10px', color: colors.color, opacity: 0.5, flexShrink: 0 }}>
            {current + 1}/{insights.length}
          </span>
        )}
      </button>

      {/* Dropdown com todos os insights */}
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            marginTop: '8px', background: '#fff',
            border: '1px solid #e4e1da', borderRadius: '12px',
            minWidth: '320px', boxShadow: '0 8px 24px rgba(0,0,0,.1)',
            zIndex: 100, overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e4e1da' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#b0aea6', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                💡 Insights do mês
              </span>
            </div>
            {insights.map((ins, i) => {
              const c = typeColors[ins.type];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderBottom: i < insights.length - 1 ? '1px solid #e4e1da' : 'none', background: i === current ? c.bg + '44' : 'none' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#16150f', fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1.5 }}>{ins.text}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
