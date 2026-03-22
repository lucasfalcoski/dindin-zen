import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useView } from '@/contexts/ViewContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { useExpenses } from '@/hooks/useExpenses';
import { useFamilyBudgets, useUpsertFamilyBudget } from '@/hooks/useFamilyBudgets';
import { useFamilyProfiles } from '@/hooks/useProfiles';
import { formatBRL } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

const C = { ink:'#16150f', ink2:'#6b6a63', ink3:'#b0aea6', rule:'#e4e1da', bg:'#f2f0eb', green:'#1a7a45', red:'#b83232', blue:'#1d4ed8', amber:'#92580a' };

export default function FamilyBudgetPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { familyId, familyMembers } = useView();
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
  const monthStr = format(selectedMonth, 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
  const isAdmin = familyMembers.some(m => m.user_id === user?.id && m.role === 'admin');
  const { data: groups } = useGroups();
  const { data: familyBudgets } = useFamilyBudgets(familyId, monthStr);
  const { data: expenses } = useExpenses({ startDate: monthStart, endDate: monthEnd });
  const upsertBudget = useUpsertFamilyBudget();
  const memberUserIds = useMemo(() => familyMembers.filter(m => m.user_id).map(m => m.user_id!), [familyMembers]);
  const { data: profiles } = useFamilyProfiles(memberUserIds);
  const prevMonth = () => setSelectedMonth(prev => subMonths(prev, 1));
  const nextMonth = () => setSelectedMonth(prev => addMonths(prev, 1));
  const familyExpenses = useMemo(() => (expenses || []).filter((e: any) => e.visibility === 'family'), [expenses]);
  const budgetMap = useMemo(() => { const map: Record<string,number> = {}; familyBudgets?.forEach(b => { map[b.group_id] = Number(b.amount); }); return map; }, [familyBudgets]);
  const spentMap = useMemo(() => { const map: Record<string,number> = {}; familyExpenses.forEach(e => { map[e.group_id] = (map[e.group_id]||0)+Number(e.amount); }); return map; }, [familyExpenses]);
  const spentByGroupAndUser = useMemo(() => { const map: Record<string,Record<string,number>> = {}; familyExpenses.forEach(e => { if (!map[e.group_id]) map[e.group_id] = {}; map[e.group_id][e.user_id]=(map[e.group_id][e.user_id]||0)+Number(e.amount); }); return map; }, [familyExpenses]);
  const totals = useMemo(() => { let bt=0,st=0; groups?.forEach(g => { bt+=budgetMap[g.id]||0; st+=spentMap[g.id]||0; }); return { budgetTotal:bt, spentTotal:st }; }, [groups,budgetMap,spentMap]);
  const getName = (uid: string) => uid===user?.id ? 'Você' : profiles?.find(p=>p.id===uid)?.display_name || 'Membro';
  const handleBudgetChange = async (groupId: string, value: string) => {
    if (!familyId) return;
    const amount = parseFloat(value.replace(',','.'));
    if (isNaN(amount)||amount<0) return;
    try { await upsertBudget.mutateAsync({ family_id:familyId, group_id:groupId, month:monthStr, amount }); }
    catch { toast({ title:'Erro ao salvar', variant:'destructive' }); }
  };

  if (!familyId) return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-end', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
        <div><p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'6px' }}>família</p>
          <h1 style={{ fontFamily:"'Instrument Serif',Georgia,serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink }}>Orçamento Familiar</h1></div>
      </div>
      <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'48px', textAlign:'center' }}>
        <p style={{ color:C.ink3 }}>Crie ou entre em uma família para usar o orçamento familiar.</p>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={() => navigate('/family')} style={{ width:'36px', height:'36px', borderRadius:'10px', border:`1px solid ${C.rule}`, background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.ink2 }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'6px' }}>família</p>
            <h1 style={{ fontFamily:"'Instrument Serif',Georgia,serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink }}>Orçamento <em style={{ fontStyle:'italic', color:C.ink2 }}>Familiar</em></h1>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'4px', background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'8px', padding:'4px 8px' }}>
          <button onClick={prevMonth} style={{ border:'none', background:'none', cursor:'pointer', color:C.ink2, padding:'2px 4px' }}><ChevronLeft size={16}/></button>
          <span style={{ fontSize:'13px', fontWeight:600, color:C.ink, minWidth:'110px', textAlign:'center' }}>{format(selectedMonth,'MMM yyyy',{locale:ptBR})}</span>
          <button onClick={nextMonth} style={{ border:'none', background:'none', cursor:'pointer', color:C.ink2, padding:'2px 4px' }}><ChevronRight size={16}/></button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'20px' }}>
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3, marginBottom:'8px' }}>Total orçado</div>
          <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', letterSpacing:'-0.5px', lineHeight:1, color:C.blue }}>{formatBRL(totals.budgetTotal)}</p>
        </div>
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
            <span style={{ width:'7px', height:'7px', borderRadius:'50%', background: totals.spentTotal > totals.budgetTotal ? C.red : C.green, display:'inline-block' }} />
            <span style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:C.ink3 }}>Gasto familiar</span>
          </div>
          <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', letterSpacing:'-0.5px', lineHeight:1, color: totals.spentTotal > totals.budgetTotal ? C.red : C.green }}>{formatBRL(totals.spentTotal)}</p>
        </div>
      </div>

      <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
          <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Por categoria</span>
        </div>
        <div style={{ padding:'0 20px' }}>
          {(groups||[]).map(g => {
            const budget = budgetMap[g.id]||0;
            const spent = spentMap[g.id]||0;
            const pct = budget>0 ? Math.min((spent/budget)*100,100) : 0;
            const over = spent>budget && budget>0;
            const memberSpending = spentByGroupAndUser[g.id]||{};
            const barColor = over ? C.red : pct>=80 ? C.amber : g.color;
            return (
              <div key={g.id} style={{ padding:'14px 0', borderBottom:`1px solid ${C.rule}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'8px' }}>
                  <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:g.color+'20', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{g.icon}</div>
                  <span style={{ fontSize:'13px', fontWeight:600, color:C.ink, flex:1 }}>{g.name}</span>
                  {isAdmin ? (
                    <Input className="w-24 h-8 text-sm text-right" defaultValue={budget>0?budget.toFixed(2):''} placeholder="0,00" inputMode="decimal"
                      onBlur={e => handleBudgetChange(g.id,e.target.value)}
                      onKeyDown={e => { if (e.key==='Enter') (e.target as HTMLInputElement).blur(); }} />
                  ) : budget>0 ? <span style={{ fontSize:'13px', color:C.ink3 }}>{formatBRL(budget)}</span> : null}
                </div>
                {budget>0 && <>
                  <div style={{ height:'4px', background:C.bg, borderRadius:'100px', overflow:'hidden', marginBottom:'6px' }}>
                    <div style={{ height:'100%', width:`${pct}%`, borderRadius:'100px', background:barColor }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', marginBottom:'4px' }}>
                    <span style={{ color:C.ink3 }}>{formatBRL(spent)} de {formatBRL(budget)}</span>
                    <span style={{ fontWeight:700, color: over ? C.red : C.green }}>{over ? `−${formatBRL(Math.abs(budget-spent))} excedido` : `${formatBRL(budget-spent)} restante`}</span>
                  </div>
                  {Object.keys(memberSpending).length>0 && (
                    <div style={{ marginTop:'4px' }}>
                      {Object.entries(memberSpending).sort((a,b)=>b[1]-a[1]).map(([uid,amt]) => (
                        <div key={uid} style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', padding:'2px 0' }}>
                          <span style={{ color:C.ink3 }}>{getName(uid)}</span>
                          <span style={{ color:C.ink3 }}>{formatBRL(amt as number)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
