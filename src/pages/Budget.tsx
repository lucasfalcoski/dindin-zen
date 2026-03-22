import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useGroups } from '@/hooks/useGroups';
import { useExpenses } from '@/hooks/useExpenses';
import { useBudgets, useUpsertBudget, useCopyBudgets } from '@/hooks/useBudgets';
import { formatBRL } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const C = { ink: '#16150f', ink2: '#6b6a63', ink3: '#b0aea6', rule: '#e4e1da', bg: '#f2f0eb', green: '#1a7a45', red: '#b83232', amber: '#92580a', blue: '#1d4ed8' };

export default function BudgetPage() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
  const monthStr = format(selectedMonth, 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

  const { data: groups } = useGroups();
  const { data: budgets, isLoading: budgetsLoading } = useBudgets(monthStr);
  const { data: expenses } = useExpenses({ startDate: monthStart, endDate: monthEnd });
  const upsertBudget = useUpsertBudget();
  const copyBudgets = useCopyBudgets();

  const prevMonth = () => setSelectedMonth(prev => subMonths(prev, 1));
  const nextMonth = () => setSelectedMonth(prev => addMonths(prev, 1));

  const budgetMap = useMemo(() => {
    const map: Record<string, number> = {};
    budgets?.forEach(b => { map[b.group_id] = Number(b.amount); });
    return map;
  }, [budgets]);

  const spentMap = useMemo(() => {
    const map: Record<string, number> = {};
    expenses?.forEach(e => { map[e.group_id] = (map[e.group_id] || 0) + Number(e.amount); });
    return map;
  }, [expenses]);

  const totals = useMemo(() => {
    let budgetTotal = 0, spentTotal = 0;
    groups?.forEach(g => { budgetTotal += budgetMap[g.id] || 0; spentTotal += spentMap[g.id] || 0; });
    return { budgetTotal, spentTotal };
  }, [groups, budgetMap, spentMap]);

  const handleBudgetChange = async (groupId: string, value: string) => {
    const amount = parseFloat(value.replace(',', '.'));
    if (isNaN(amount) || amount < 0) return;
    try {
      await upsertBudget.mutateAsync({ group_id: groupId, amount, month: monthStr });
    } catch { toast({ title: 'Erro ao salvar', variant: 'destructive' }); }
  };

  const handleCopy = async () => {
    const prevMonthStr = format(subMonths(selectedMonth, 1), 'yyyy-MM-dd');
    try {
      await copyBudgets.mutateAsync({ fromMonth: prevMonthStr, toMonth: monthStr });
      toast({ title: 'Orçamentos copiados!' });
    } catch { toast({ title: 'Erro ao copiar', variant: 'destructive' }); }
  };

  return (
    <div>
      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'6px' }}>limites</p>
          <h1 style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink }}>Orçamento</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          {/* Seletor de mês */}
          <div style={{ display:'flex', alignItems:'center', gap:'4px', background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'8px', padding:'4px 8px' }}>
            <button onClick={prevMonth} style={{ border:'none', background:'none', cursor:'pointer', color:C.ink2, padding:'2px 4px', borderRadius:'4px' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize:'13px', fontWeight:600, color:C.ink, minWidth:'100px', textAlign:'center' }}>
              {format(selectedMonth, 'MMM yyyy', { locale: ptBR })}
            </span>
            <button onClick={nextMonth} style={{ border:'none', background:'none', cursor:'pointer', color:C.ink2, padding:'2px 4px', borderRadius:'4px' }}>
              <ChevronRight size={16} />
            </button>
          </div>
          <button onClick={handleCopy} disabled={copyBudgets.isPending} style={{ padding:'6px 14px', borderRadius:'8px', fontSize:'12px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", border:`1px solid ${C.rule}`, background:'none', color:C.ink2, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
            <Copy size={14} /> Copiar mês anterior
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'20px' }}>
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
            <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:C.blue, display:'inline-block' }} />
            <span style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3 }}>Total orçado</span>
          </div>
          <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', letterSpacing:'-0.5px', lineHeight:1, color:C.blue }}>{formatBRL(totals.budgetTotal)}</p>
        </div>
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
            <span style={{ width:'7px', height:'7px', borderRadius:'50%', background: totals.spentTotal > totals.budgetTotal ? C.red : C.green, display:'inline-block' }} />
            <span style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3 }}>Gasto até agora</span>
          </div>
          <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', letterSpacing:'-0.5px', lineHeight:1, color: totals.spentTotal > totals.budgetTotal ? C.red : C.green }}>
            {formatBRL(totals.spentTotal)}
          </p>
          {totals.budgetTotal > 0 && (
            <p style={{ fontSize:'11px', color:C.ink3, marginTop:'8px', paddingTop:'8px', borderTop:`1px solid ${C.rule}`, fontWeight:500 }}>
              <span style={{ color: totals.spentTotal > totals.budgetTotal ? C.red : C.green }}>
                {((totals.spentTotal / totals.budgetTotal) * 100).toFixed(0)}%
              </span> utilizado · {formatBRL(Math.max(0, totals.budgetTotal - totals.spentTotal))} livre
            </p>
          )}
        </div>
      </div>

      {/* CATEGORIAS */}
      <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
          <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Categorias</span>
        </div>
        {budgetsLoading ? (
          <div style={{ padding:'20px' }}>
            {[...Array(5)].map((_, i) => <div key={i} style={{ height:'48px', background:C.rule, borderRadius:'8px', marginBottom:'8px' }} />)}
          </div>
        ) : (
          <div style={{ padding:'0 20px' }}>
            {(groups || []).map(g => {
              const budget = budgetMap[g.id] || 0;
              const spent = spentMap[g.id] || 0;
              const pct = budget > 0 ? (spent / budget) * 100 : 0;
              const barColor = pct > 100 ? C.red : pct >= 80 ? C.amber : g.color;
              return (
                <div key={g.id} style={{ padding:'12px 0', borderBottom:`1px solid ${C.rule}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'8px' }}>
                    <span style={{ fontSize:'13px', fontWeight:600, color:C.ink, flex:1 }}>{g.icon} {g.name}</span>
                    <Input
                      type="number"
                      min="0"
                      step="10"
                      defaultValue={budget || ''}
                      placeholder="0"
                      onBlur={e => handleBudgetChange(g.id, e.target.value)}
                      style={{ width:'110px', height:'32px', fontSize:'13px', textAlign:'right' }}
                    />
                  </div>
                  {budget > 0 && (
                    <>
                      <div style={{ height:'4px', background:C.bg, borderRadius:'100px', overflow:'hidden', marginBottom:'4px' }}>
                        <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, borderRadius:'100px', background:barColor, transition:'width .3s' }} />
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:C.ink3 }}>
                        <span style={{ color: pct > 100 ? C.red : pct >= 80 ? C.amber : C.ink3 }}>{formatBRL(spent)}</span>
                        <span style={{ fontWeight:600, color: pct > 100 ? C.red : pct >= 80 ? C.amber : C.green }}>{pct.toFixed(0)}%</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
