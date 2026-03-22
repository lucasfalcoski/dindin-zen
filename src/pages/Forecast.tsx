import { useState, useMemo } from 'react';
import { format, addDays, addMonths, startOfDay } from 'date-fns';
import { useExpenses } from '@/hooks/useExpenses';
import { useIncomes } from '@/hooks/useIncomes';
import { useAccounts } from '@/hooks/useAccounts';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/format';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertTriangle } from 'lucide-react';

type Period = 30 | 60 | 90;
const C = { ink:'#16150f', ink2:'#6b6a63', ink3:'#b0aea6', rule:'#e4e1da', bg:'#f2f0eb', green:'#1a7a45', red:'#b83232', blue:'#1d4ed8', amber:'#92580a' };

export default function Forecast() {
  const { user } = useAuth();
  const [days, setDays] = useState<Period>(30);
  const today = startOfDay(new Date());
  const endDate = addDays(today, days);
  const todayStr = format(today, 'yyyy-MM-dd');
  const pastStart = format(addMonths(today, -3), 'yyyy-MM-dd');
  const futureEnd = format(addDays(today, 90), 'yyyy-MM-dd');

  const { data: allExpenses } = useExpenses({ startDate: pastStart, endDate: futureEnd });
  const { data: allIncomes } = useIncomes({ startDate: pastStart, endDate: futureEnd });
  const { data: accounts } = useAccounts();

  const myExpenses = useMemo(() => (allExpenses || []).filter(e => e.user_id === user?.id), [allExpenses, user]);
  const myIncomes = useMemo(() => (allIncomes || []).filter(i => i.user_id === user?.id), [allIncomes, user]);

  const currentBalance = useMemo(() => {
    const totalAccounts = (accounts || []).filter(a => a.type !== 'credito').reduce((s, a) => s + Number(a.balance), 0);
    return totalAccounts;
  }, [accounts]);

  const futureEvents = useMemo(() => {
    const events: { date: string; description: string; amount: number; type: 'income' | 'expense'; source: 'recorrente' | 'parcela' }[] = [];
    const endStr = format(endDate, 'yyyy-MM-dd');

    // Recurrent expenses
    const recurrentExpenses = myExpenses.filter(e => e.recurrent);
    const seenExpRecurrent = new Map<string, typeof recurrentExpenses[0]>();
    recurrentExpenses.forEach(e => {
      const key = `${e.description}-${e.amount}`;
      const existing = seenExpRecurrent.get(key);
      if (!existing || e.date > existing.date) seenExpRecurrent.set(key, e);
    });
    seenExpRecurrent.forEach(e => {
      let nextDate = new Date(e.date + 'T12:00:00');
      for (let j = 0; j < 4; j++) {
        nextDate = addMonths(nextDate, 1);
        const dateStr = format(nextDate, 'yyyy-MM-dd');
        if (dateStr > todayStr && dateStr <= endStr) events.push({ date: dateStr, description: e.description, amount: Number(e.amount), type: 'expense', source: 'recorrente' });
      }
    });

    // Installments
    const installments = myExpenses.filter(e => (e as any).installment_total && (e as any).installment_current < (e as any).installment_total);
    installments.forEach(e => {
      const remaining = (e as any).installment_total - (e as any).installment_current;
      let nextDate = new Date(e.date + 'T12:00:00');
      for (let j = 0; j < Math.min(remaining, 4); j++) {
        nextDate = addMonths(nextDate, 1);
        const dateStr = format(nextDate, 'yyyy-MM-dd');
        if (dateStr > todayStr && dateStr <= endStr) events.push({ date: dateStr, description: `${e.description} (${(e as any).installment_current + j + 1}/${(e as any).installment_total})`, amount: Number(e.amount), type: 'expense', source: 'parcela' });
      }
    });

    // Recurrent incomes
    const recurrentIncomes = myIncomes.filter(i => i.recurrent);
    const seenIncRecurrent = new Map<string, typeof recurrentIncomes[0]>();
    recurrentIncomes.forEach(i => {
      const key = `${i.description}-${i.amount}`;
      const existing = seenIncRecurrent.get(key);
      if (!existing || i.date > existing.date) seenIncRecurrent.set(key, i);
    });
    seenIncRecurrent.forEach(i => {
      let nextDate = new Date(i.date + 'T12:00:00');
      for (let j = 0; j < 4; j++) {
        nextDate = addMonths(nextDate, 1);
        const dateStr = format(nextDate, 'yyyy-MM-dd');
        if (dateStr > todayStr && dateStr <= endStr) events.push({ date: dateStr, description: i.description, amount: Number(i.amount), type: 'income', source: 'recorrente' });
      }
    });
    return events.sort((a, b) => a.date.localeCompare(b.date));
  }, [myExpenses, myIncomes, today, endDate]);

  const { chartData, minBalance, endBalance, hasNegative } = useMemo(() => {
    const data: { date: string; label: string; saldo: number; isProjection: boolean }[] = [];
    let balance = currentBalance;
    let min = balance;
    let negative = false;
    const eventsByDate: Record<string, { income: number; expense: number }> = {};
    futureEvents.forEach(ev => {
      if (!eventsByDate[ev.date]) eventsByDate[ev.date] = { income: 0, expense: 0 };
      if (ev.type === 'income') eventsByDate[ev.date].income += ev.amount;
      else eventsByDate[ev.date].expense += ev.amount;
    });
    for (let i = 0; i <= days; i++) {
      const d = addDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const ev = eventsByDate[dateStr];
      if (ev) { balance += ev.income - ev.expense; }
      if (balance < min) min = balance;
      if (balance < 0) negative = true;
      if (i % Math.max(1, Math.floor(days / 30)) === 0 || ev) {
        data.push({ date: dateStr, label: format(d, 'dd/MM'), saldo: Math.round(balance), isProjection: i > 0 });
      }
    }
    return { chartData: data, minBalance: min, endBalance: balance, hasNegative: negative };
  }, [currentBalance, futureEvents, today, days]);

  return (
    <div>
      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'6px' }}>planejamento</p>
          <h1 style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink }}>Projeção</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          {([30, 60, 90] as Period[]).map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{ padding:'6px 14px', borderRadius:'100px', fontSize:'12px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", border:`1px solid ${days === d ? C.ink : '#ccc9c0'}`, background: days === d ? C.ink : 'none', color: days === d ? '#fff' : C.ink2, cursor:'pointer', transition:'all .15s' }}>
              {d} dias
            </button>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'20px' }}>
        {[
          { label:'Saldo atual', value: formatBRL(currentBalance), color: currentBalance >= 0 ? C.green : C.red, dot: currentBalance >= 0 ? C.green : C.red },
          { label:`Saldo em ${days} dias`, value: formatBRL(endBalance), color: endBalance >= 0 ? C.green : C.red, dot: endBalance >= 0 ? C.green : C.red },
          { label:'Menor saldo projetado', value: formatBRL(minBalance), color: minBalance >= 0 ? C.ink : C.red, dot: minBalance >= 0 ? C.ink3 : C.red },
          { label:'Lançamentos previstos', value: `${futureEvents.length} itens`, color: C.ink, dot: C.ink3, isText: true },
        ].map(card => (
          <div key={card.label} style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
              <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:card.dot, display:'inline-block' }} />
              <span style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3 }}>{card.label}</span>
            </div>
            <p style={{ fontFamily:"'Instrument Serif',serif", fontSize: card.isText ? '22px' : '28px', letterSpacing:'-0.5px', lineHeight:1, color:card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ALERTA */}
      {hasNegative && (
        <div style={{ display:'flex', alignItems:'center', gap:'10px', background:'#f5dede', border:'1px solid rgba(184,50,50,.2)', borderRadius:'12px', padding:'12px 16px', marginBottom:'14px' }}>
          <AlertTriangle style={{ width:'16px', height:'16px', color:C.red, flexShrink:0 }} />
          <span style={{ fontSize:'13px', color:C.red, fontWeight:600 }}>Saldo projetado fica negativo em algum momento do período</span>
        </div>
      )}

      {/* GRÁFICO */}
      <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden', marginBottom:'14px' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
          <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Saldo projetado dia a dia</span>
        </div>
        <div style={{ padding:'20px' }}>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.green} stopOpacity={0.1} />
                  <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.rule} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.ink3 }} axisLine={false} tickLine={false} interval={Math.max(1, Math.floor(chartData.length / 8))} />
              <YAxis tick={{ fontSize: 10, fill: C.ink3 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatBRL(v)} labelFormatter={l => `Dia ${l}`} contentStyle={{ border:`1px solid ${C.rule}`, borderRadius:'8px', fontSize:'12px' }} />
              {hasNegative && <ReferenceLine y={0} stroke={C.red} strokeDasharray="4 4" strokeWidth={1.5} />}
              <Area type="monotone" dataKey="saldo" fill="url(#saldoGrad)" stroke="none" />
              <Line type="monotone" dataKey="saldo" name="Saldo" stroke={C.green} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: C.green }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TIMELINE */}
      <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
          <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>O que está por vir</span>
        </div>
        {futureEvents.length > 0 ? (
          <div style={{ maxHeight:'360px', overflowY:'auto', padding:'0 20px' }}>
            {futureEvents.map((ev, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'11px 0', borderBottom:`1px solid ${C.rule}` }}>
                <div style={{ minWidth:'44px', textAlign:'center' }}>
                  <p style={{ fontSize:'11px', color:C.ink3, fontWeight:600 }}>{ev.date.split('-').slice(1).reverse().join('/')}</p>
                </div>
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: ev.type === 'income' ? C.green : C.red, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:'13px', color:C.ink, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.description}</p>
                  <p style={{ fontSize:'11px', color:C.ink3 }}>{ev.source === 'recorrente' ? 'Recorrente' : 'Parcela'}</p>
                </div>
                <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:'14px', color: ev.type === 'income' ? C.green : C.ink, flexShrink:0 }}>
                  {ev.type === 'income' ? '+' : '−'}{formatBRL(ev.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize:'13px', color:C.ink3, padding:'32px', textAlign:'center' }}>Nenhum lançamento recorrente ou parcela encontrada para o período.</p>
        )}
      </div>
    </div>
  );
}
