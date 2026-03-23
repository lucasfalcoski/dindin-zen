import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useExpenses } from '@/hooks/useExpenses';
import { useGroups } from '@/hooks/useGroups';
import { useView } from '@/contexts/ViewContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/format';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Input } from '@/components/ui/input';
import { Download, FileText, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type Period = 'week' | 'month' | 'quarter' | 'year' | 'custom';
const C = { ink:'#16150f', ink2:'#6b6a63', ink3:'#b0aea6', rule:'#e4e1da', bg:'#f2f0eb', green:'#1a7a45', red:'#b83232', blue:'#1d4ed8', amber:'#92580a' };

const PERIODS = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year', label: 'Ano' },
  { key: 'custom', label: 'Período' },
] as const;

export default function Reports() {
  const { user } = useAuth();
  const { viewMode, selectedMemberId } = useView();
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const { data: groups } = useGroups();

  const now = new Date();
  const { startDate, endDate } = useMemo(() => {
    switch (period) {
      case 'week': return { startDate: format(startOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd'), endDate: format(endOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd') };
      case 'month': return { startDate: format(startOfMonth(now), 'yyyy-MM-dd'), endDate: format(endOfMonth(now), 'yyyy-MM-dd') };
      case 'quarter': return { startDate: format(startOfQuarter(now), 'yyyy-MM-dd'), endDate: format(endOfQuarter(now), 'yyyy-MM-dd') };
      case 'year': return { startDate: format(startOfYear(now), 'yyyy-MM-dd'), endDate: format(endOfYear(now), 'yyyy-MM-dd') };
      case 'custom': return { startDate: customStart, endDate: customEnd };
    }
  }, [period, customStart, customEnd]);

  const { data: allExpenses, isLoading } = useExpenses({ startDate, endDate });

  const expenses = useMemo(() => {
    if (!allExpenses) return [];
    switch (viewMode) {
      case 'personal': return allExpenses.filter(e => e.user_id === user?.id);
      case 'family': return allExpenses.filter((e: any) => e.visibility === 'family');
      case 'member': return allExpenses.filter((e: any) => e.user_id === selectedMemberId && e.visibility === 'family');
      default: return allExpenses;
    }
  }, [allExpenses, viewMode, user?.id, selectedMemberId]);

  const totalPeriod = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  const breakdown = useMemo(() => {
    if (!expenses.length || !groups) return [];
    const byGroup: Record<string, number> = {};
    let firstExpenseDate: Date | null = null;
    expenses.forEach(e => {
      byGroup[e.group_id] = (byGroup[e.group_id] || 0) + Number(e.amount);
      const d = new Date(e.date);
      if (!firstExpenseDate || d < firstExpenseDate) firstExpenseDate = d;
    });
    const today = new Date();
    const effectiveEnd = endDate ? (new Date(endDate) < today ? new Date(endDate) : today) : today;
    const effectiveDays = firstExpenseDate
      ? Math.max(1, Math.ceil((effectiveEnd.getTime() - firstExpenseDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 1;
    return groups.filter(g => byGroup[g.id])
      .map(g => ({ ...g, total: byGroup[g.id], pct: totalPeriod > 0 ? (byGroup[g.id] / totalPeriod * 100) : 0, avgDay: byGroup[g.id] / effectiveDays }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, groups, totalPeriod, startDate, endDate]);

  const dailyData = useMemo(() => {
    if (!expenses.length || !startDate || !endDate) return [];
    try {
      const days = eachDayOfInterval({ start: new Date(startDate + 'T00:00:00'), end: new Date(endDate + 'T00:00:00') });
      const byDay: Record<string, number> = {};
      days.forEach(d => { byDay[format(d, 'yyyy-MM-dd')] = 0; });
      expenses.forEach(e => { if (e.date in byDay) byDay[e.date] += Number(e.amount); });
      return days.map(d => ({ date: format(d, 'dd/MM', { locale: ptBR }), total: byDay[format(d, 'yyyy-MM-dd')] }));
    } catch { return []; }
  }, [expenses, startDate, endDate]);

  const handleExportCSV = () => {
    if (!expenses.length) return;
    const header = 'Data,Descrição,Grupo,Valor,Recorrente,Notas\n';
    const rows = expenses.map(e => {
      const group = groups?.find(g => g.id === e.group_id);
      return `${e.date},"${e.description}","${group?.name || ''}",${e.amount},${e.recurrent ? 'Sim' : 'Não'},"${(e as any).notes || ''}"`;
    }).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `relatorio-${startDate}-${endDate}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Despesas', 14, 20);
    doc.setFontSize(11);
    doc.text(`Período: ${startDate} a ${endDate}`, 14, 30);
    doc.text(`Total: ${formatBRL(totalPeriod)}`, 14, 38);
    const tableData = expenses.map(e => {
      const group = groups?.find(g => g.id === e.group_id);
      return [e.date, e.description, group?.name || '', formatBRL(Number(e.amount))];
    });
    (doc as any).autoTable({ head: [['Data', 'Descrição', 'Grupo', 'Valor']], body: tableData, startY: 45 });
    doc.save(`relatorio-${startDate}-${endDate}.pdf`);
  };

  return (
    <div>
      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'6px' }}>análise</p>
          <h1 style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink }}>Relatórios</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key as Period)}
              style={{ padding:'6px 14px', borderRadius:'100px', fontSize:'12px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", border:`1px solid ${period === p.key ? C.ink : '#ccc9c0'}`, background: period === p.key ? C.ink : 'none', color: period === p.key ? '#fff' : C.ink2, cursor:'pointer', transition:'all 0.15s' }}>
              {p.label}
            </button>
          ))}
          <button onClick={handleExportCSV} style={{ padding:'6px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", border:`1px solid ${C.rule}`, background:'none', color:C.ink2, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
            <Download size={13} /> CSV
          </button>
          <button onClick={handleExportPDF} style={{ padding:'6px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", border:`1px solid ${C.rule}`, background:'none', color:C.ink2, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
            <FileText size={13} /> PDF
          </button>
          <Link to="/reports/annual" style={{ padding:'6px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", border:`1px solid ${C.rule}`, background:'none', color:C.ink2, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', textDecoration:'none' }}>
            <CalendarDays size={13} /> Anual
          </Link>
        </div>
      </div>

      {period === 'custom' && (
        <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
          <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
          <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
        </div>
      )}

      {/* STATS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px', marginBottom:'20px' }}>
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}><span style={{ width:'7px', height:'7px', borderRadius:'50%', background:C.red, display:'inline-block' }} /><span style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3 }}>Total período</span></div>
          <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', letterSpacing:'-0.5px', lineHeight:1, color:C.red }}>{formatBRL(totalPeriod)}</p>
        </div>
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3, marginBottom:'8px' }}>Maior categoria</div>
          <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'22px', letterSpacing:'-0.5px', lineHeight:1, color:C.blue }}>
            {breakdown[0] ? `${breakdown[0].icon} ${breakdown[0].name}` : '—'}
          </p>
        </div>
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3, marginBottom:'8px' }}>Média diária</div>
          <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', letterSpacing:'-0.5px', lineHeight:1, color:C.amber }}>
            {breakdown.length > 0 && dailyData.length > 0 ? formatBRL(totalPeriod / dailyData.length) : '—'}
          </p>
        </div>
      </div>

      {/* GRÁFICO DIÁRIO */}
      <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden', marginBottom:'14px' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
          <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Gastos diários</span>
        </div>
        <div style={{ padding:'20px' }}>
          {isLoading ? (
            <div style={{ height:'200px', background:C.rule, borderRadius:'8px', animation:'pulse 1.5s infinite' }} />
          ) : dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.rule} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.ink3 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: C.ink3 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ border:`1px solid ${C.rule}`, borderRadius:'8px', fontSize:'12px' }} />
                <Line type="monotone" dataKey="total" stroke={C.green} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontSize:'13px', color:C.ink3, padding:'32px', textAlign:'center' }}>Sem dados para o período</p>
          )}
        </div>
      </div>

      {/* BREAKDOWN POR GRUPO */}
      <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
          <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Detalhamento por grupo</span>
        </div>
        {isLoading ? (
          <div style={{ padding:'20px' }}>{[...Array(4)].map((_, i) => <div key={i} style={{ height:'20px', background:C.rule, borderRadius:'4px', marginBottom:'10px' }} />)}</div>
        ) : breakdown.length > 0 ? (
          <div style={{ padding:'0 20px' }}>
            {breakdown.map(g => (
              <div key={g.id} style={{ padding:'12px 0', borderBottom:`1px solid ${C.rule}` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
                  <span style={{ fontSize:'13px', fontWeight:600, color:C.ink }}>{g.icon} {g.name}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'16px', fontSize:'12px' }}>
                    <span style={{ color:C.ink3 }}>média {formatBRL(g.avgDay)}/dia</span>
                    <span style={{ fontWeight:700, color:C.ink }}>{formatBRL(g.total)}</span>
                    <span style={{ color:C.ink3 }}>{g.pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div style={{ height:'4px', background:C.bg, borderRadius:'100px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${g.pct}%`, borderRadius:'100px', background:g.color }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize:'13px', color:C.ink3, padding:'32px', textAlign:'center' }}>Nenhuma despesa no período.</p>
        )}
      </div>
    </div>
  );
}
