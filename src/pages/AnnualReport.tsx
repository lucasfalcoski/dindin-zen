import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useExpenses } from '@/hooks/useExpenses';
import { useIncomes } from '@/hooks/useIncomes';
import { useGroups } from '@/hooks/useGroups';
import { useView } from '@/contexts/ViewContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/format';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';
import { Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const C = { ink:'#16150f', ink2:'#6b6a63', ink3:'#b0aea6', rule:'#e4e1da', bg:'#f2f0eb', green:'#1a7a45', red:'#b83232', blue:'#1d4ed8', amber:'#92580a' };

export default function AnnualReport() {
  const { user } = useAuth();
  const { viewMode, selectedMemberId } = useView();
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: allExpenses, isLoading } = useExpenses({ startDate:`${year}-01-01`, endDate:`${year}-12-31` });
  const { data: allIncomes } = useIncomes({ startDate:`${year}-01-01`, endDate:`${year}-12-31` });
  const { data: groups } = useGroups();

  const expenses = useMemo(() => {
    if (!allExpenses) return [];
    if (viewMode==='personal') return allExpenses.filter(e=>e.user_id===user?.id);
    if (viewMode==='family') return allExpenses.filter((e:any)=>e.visibility==='family');
    if (viewMode==='member') return allExpenses.filter((e:any)=>e.user_id===selectedMemberId);
    return allExpenses;
  }, [allExpenses, viewMode, user?.id, selectedMemberId]);

  const incomes = useMemo(() => {
    if (!allIncomes) return [];
    if (viewMode==='personal') return allIncomes.filter(i=>i.user_id===user?.id);
    if (viewMode==='family') return allIncomes.filter((i:any)=>i.visibility==='family');
    if (viewMode==='member') return allIncomes.filter((i:any)=>i.user_id===selectedMemberId);
    return allIncomes;
  }, [allIncomes, viewMode, user?.id, selectedMemberId]);

  const monthlyData = useMemo(() => {
    let cumulative = 0;
    return MONTHS_PT.map((m, i) => {
      const monthStr = `${year}-${String(i+1).padStart(2,'0')}`;
      const expTotal = expenses.filter(e=>e.date.startsWith(monthStr)).reduce((s,e)=>s+Number(e.amount),0);
      const incTotal = incomes.filter(inc=>inc.date.startsWith(monthStr)).reduce((s,inc)=>s+Number(inc.amount),0);
      cumulative += incTotal - expTotal;
      return { month:m, despesas:expTotal, receitas:incTotal, saldo:cumulative };
    });
  }, [expenses, incomes, year]);

  const stats = useMemo(() => {
    const totalExp = expenses.reduce((s,e)=>s+Number(e.amount),0);
    const totalInc = incomes.reduce((s,i)=>s+Number(i.amount),0);
    const saved = totalInc - totalExp;
    let mostExpMonth={idx:0,val:0}, leastExpMonth={idx:0,val:Infinity};
    monthlyData.forEach((m,i)=>{
      if(m.despesas>mostExpMonth.val) mostExpMonth={idx:i,val:m.despesas};
      if(m.despesas>0&&m.despesas<leastExpMonth.val) leastExpMonth={idx:i,val:m.despesas};
    });
    if(leastExpMonth.val===Infinity) leastExpMonth={idx:0,val:0};
    return { totalExp, totalInc, saved, mostExpMonth:MONTHS_FULL[mostExpMonth.idx], leastExpMonth:MONTHS_FULL[leastExpMonth.idx] };
  }, [expenses, incomes, monthlyData]);

  const breakdown = useMemo(() => {
    if (!expenses.length||!groups) return [];
    const byGroup:Record<string,number>={};
    expenses.forEach(e=>{ byGroup[e.group_id]=(byGroup[e.group_id]||0)+Number(e.amount); });
    return groups.filter(g=>byGroup[g.id]).map(g=>({ ...g, total:byGroup[g.id], pct:stats.totalExp>0?(byGroup[g.id]/stats.totalExp)*100:0 })).sort((a,b)=>b.total-a.total);
  }, [expenses, groups, stats.totalExp]);

  const handleExportCSV = () => {
    if (!expenses.length) return;
    const header='Data,Descrição,Grupo,Valor\n';
    const rows=expenses.map(e=>{ const g=groups?.find(g=>g.id===e.group_id); return `${e.date},"${e.description}","${g?.name||''}",${e.amount}`; }).join('\n');
    const blob=new Blob(['\uFEFF'+header+rows],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download=`relatorio-anual-${year}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc=new jsPDF(); doc.setFontSize(16); doc.text(`Relatório Anual ${year}`,14,20);
    doc.setFontSize(11); doc.text(`Total gasto: ${formatBRL(stats.totalExp)}`,14,30); doc.text(`Total recebido: ${formatBRL(stats.totalInc)}`,14,38); doc.text(`Poupado: ${formatBRL(stats.saved)}`,14,46);
    (doc as any).autoTable({ head:[['Mês','Receitas','Despesas','Saldo']], body:monthlyData.map(m=>[m.month,formatBRL(m.receitas),formatBRL(m.despesas),formatBRL(m.saldo)]), startY:52 });
    doc.save(`relatorio-anual-${year}.pdf`);
  };

  return (
    <div>
      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'6px' }}>análise</p>
          <h1 style={{ fontFamily:"'Instrument Serif',Georgia,serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink }}>
            Relatório <em style={{ fontStyle:'italic', color:C.ink2 }}>{year}</em>
          </h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'4px', background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'8px', padding:'4px 8px' }}>
            <button onClick={()=>setYear(y=>y-1)} style={{ border:'none', background:'none', cursor:'pointer', color:C.ink2, padding:'2px 4px' }}><ChevronLeft size={16}/></button>
            <span style={{ fontSize:'14px', fontWeight:700, color:C.ink, padding:'0 8px' }}>{year}</span>
            <button onClick={()=>setYear(y=>y+1)} style={{ border:'none', background:'none', cursor:'pointer', color:C.ink2, padding:'2px 4px' }}><ChevronRight size={16}/></button>
          </div>
          <button onClick={handleExportCSV} style={{ padding:'6px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", border:`1px solid ${C.rule}`, background:'none', color:C.ink2, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
            <Download size={13}/> CSV
          </button>
          <button onClick={handleExportPDF} style={{ padding:'6px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", border:`1px solid ${C.rule}`, background:'none', color:C.ink2, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
            <FileText size={13}/> PDF
          </button>
          <Link to="/reports" style={{ padding:'6px 14px', borderRadius:'8px', fontSize:'12px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", border:`1px solid ${C.rule}`, background:'none', color:C.ink2, cursor:'pointer', textDecoration:'none' }}>← Voltar</Link>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'14px', marginBottom:'20px' }}>
        {[
          { label:'Total gasto', value:formatBRL(stats.totalExp), color:C.red, dot:C.red },
          { label:'Total recebido', value:formatBRL(stats.totalInc), color:C.green, dot:C.green },
          { label:'Total poupado', value:formatBRL(stats.saved), color:stats.saved>=0?C.green:C.red, dot:stats.saved>=0?C.green:C.red },
          { label:'Mês mais caro', value:stats.mostExpMonth, color:C.ink, dot:C.amber, isText:true },
          { label:'Mês + econômico', value:stats.leastExpMonth, color:C.ink, dot:C.blue, isText:true },
        ].map(card=>(
          <div key={card.label} style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}><span style={{ width:'7px', height:'7px', borderRadius:'50%', background:card.dot, display:'inline-block' }}/><span style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3 }}>{card.label}</span></div>
            <p style={{ fontFamily:card.isText?'inherit':"'Instrument Serif',serif", fontSize:card.isText?'16px':'24px', letterSpacing:'-0.5px', lineHeight:1, color:card.color, fontWeight:card.isText?700:400 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* GRÁFICO */}
      <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden', marginBottom:'14px' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
          <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Receitas vs Despesas por mês</span>
        </div>
        <div style={{ padding:'20px' }}>
          {isLoading ? <div style={{ height:'300px', background:C.rule, borderRadius:'8px' }}/> : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.rule}/>
                <XAxis dataKey="month" tick={{ fontSize:11, fill:C.ink3 }} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="left" tick={{ fontSize:10, fill:C.ink3 }} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize:10, fill:C.ink3 }} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v:number)=>formatBRL(v)} contentStyle={{ border:`1px solid ${C.rule}`, borderRadius:'8px', fontSize:'12px' }}/>
                <Legend wrapperStyle={{ fontSize:11 }}/>
                <Bar yAxisId="left" dataKey="receitas" name="Receitas" fill={C.green} radius={[4,4,0,0]}/>
                <Bar yAxisId="left" dataKey="despesas" name="Despesas" fill={C.red} radius={[4,4,0,0]}/>
                <Line yAxisId="right" type="monotone" dataKey="saldo" name="Saldo acumulado" stroke={C.ink} strokeWidth={2} dot={{ fill:C.ink, r:3 }}/>
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* BREAKDOWN */}
      {breakdown.length>0&&(
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
            <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Top categorias do ano</span>
          </div>
          <div style={{ padding:'0 20px' }}>
            {breakdown.map(g=>(
              <div key={g.id} style={{ padding:'12px 0', borderBottom:`1px solid ${C.rule}` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
                  <span style={{ fontSize:'13px', fontWeight:600, color:C.ink }}>{g.icon} {g.name}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px', fontSize:'12px' }}>
                    <span style={{ color:C.ink3 }}>{g.pct.toFixed(1)}%</span>
                    <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:'15px', color:C.ink, fontWeight:400 }}>{formatBRL(g.total)}</span>
                  </div>
                </div>
                <div style={{ height:'4px', background:C.bg, borderRadius:'100px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${g.pct}%`, borderRadius:'100px', background:g.color }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
