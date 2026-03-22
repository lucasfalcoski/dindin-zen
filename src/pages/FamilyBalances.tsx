import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useView } from '@/contexts/ViewContext';
import { useExpenses } from '@/hooks/useExpenses';
import { useSettlements, useCreateSettlement } from '@/hooks/useSettlements';
import { useFamilyProfiles, Profile } from '@/hooks/useProfiles';
import { formatBRL } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const C = { ink:'#16150f', ink2:'#6b6a63', ink3:'#b0aea6', rule:'#e4e1da', bg:'#f2f0eb', green:'#1a7a45', red:'#b83232', blue:'#1d4ed8' };
const AVATAR_COLORS = [
  { bg:'#dce8ff', text:'#1d4ed8' }, { bg:'#f5dede', text:'#b83232' },
  { bg:'#d4eddd', text:'#1a7a45' }, { bg:'#fdefd4', text:'#92580a' }, { bg:'#ece4f9', text:'#5b3589' },
];

export default function FamilyBalances() {
  const { user } = useAuth();
  const { familyId, familyMembers } = useView();
  const { toast } = useToast();
  const navigate = useNavigate();
  const createSettlement = useCreateSettlement();
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const memberUserIds = useMemo(() => familyMembers.filter(m => m.user_id).map(m => m.user_id!), [familyMembers]);
  const { data: profiles } = useFamilyProfiles(memberUserIds);
  const { data: expenses } = useExpenses({ startDate: monthStart, endDate: monthEnd });
  const { data: settlements } = useSettlements(familyId);

  const profileMap = useMemo(() => {
    const map: Record<string, Profile> = {};
    profiles?.forEach(p => { map[p.id] = p; });
    return map;
  }, [profiles]);

  const getName = (userId: string) => userId === user?.id ? 'Você' : profileMap[userId]?.display_name || 'Membro';
  const getInitials = (userId: string) => getName(userId).substring(0, 2).toUpperCase();
  const getAvatarColor = (userId: string) => AVATAR_COLORS[Math.max(0, memberUserIds.indexOf(userId)) % AVATAR_COLORS.length];

  const balances = useMemo(() => {
    if (!expenses || !familyMembers.length) return [];
    const splitGroups: Record<string, typeof expenses> = {};
    expenses.forEach(e => {
      const sgid = (e as any).split_group_id;
      if (sgid) { if (!splitGroups[sgid]) splitGroups[sgid] = []; splitGroups[sgid].push(e); }
    });
    const netOwed: Record<string, Record<string, number>> = {};
    Object.values(splitGroups).forEach(group => {
      const payer = group.find(e => (e as any).is_split_original)?.user_id;
      if (!payer) return;
      group.forEach(e => {
        if (e.user_id === payer) return;
        if (!netOwed[e.user_id]) netOwed[e.user_id] = {};
        netOwed[e.user_id][payer] = (netOwed[e.user_id][payer] || 0) + Number(e.amount);
      });
    });
    const result: { fromId: string; toId: string; amount: number }[] = [];
    Object.entries(netOwed).forEach(([fromId, toMap]) => {
      Object.entries(toMap).forEach(([toId, amount]) => {
        const net = amount - (netOwed[toId]?.[fromId] || 0);
        if (net > 0.01) result.push({ fromId, toId, amount: net });
      });
    });
    return result;
  }, [expenses, familyMembers, settlements]);

  const handleSettle = async (b: { fromId: string; toId: string; amount: number }) => {
    if (!familyId) return;
    try {
      await createSettlement.mutateAsync({ familyId, fromUserId: b.fromId, toUserId: b.toId, amount: b.amount });
      toast({ title: 'Pagamento registrado!' });
    } catch { toast({ title: 'Erro', variant: 'destructive' }); }
  };

  if (!familyId) return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-end', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'6px' }}>família</p>
          <h1 style={{ fontFamily:"'Instrument Serif',Georgia,serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink }}>Saldos</h1>
        </div>
      </div>
      <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'48px', textAlign:'center' }}>
        <p style={{ color:C.ink3 }}>Você precisa fazer parte de uma família para ver os saldos.</p>
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
            <h1 style={{ fontFamily:"'Instrument Serif',Georgia,serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink }}>Quem deve <em style={{ fontStyle:'italic', color:C.ink2 }}>pra quem</em></h1>
          </div>
        </div>
      </div>

      <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
          <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Pendências este mês</span>
        </div>
        {balances.length > 0 ? (
          <div>
            {balances.map((b, i) => {
              const fromCol = getAvatarColor(b.fromId);
              const toCol = getAvatarColor(b.toId);
              const isInvolved = b.fromId === user?.id || b.toId === user?.id;
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:fromCol.bg, color:fromCol.text, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, flexShrink:0 }}>{getInitials(b.fromId)}</div>
                  <span style={{ fontSize:'13px', fontWeight:600, color:C.ink }}>{getName(b.fromId)}</span>
                  <ArrowRight style={{ width:'16px', height:'16px', color:C.ink3, flexShrink:0 }} />
                  <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:toCol.bg, color:toCol.text, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, flexShrink:0 }}>{getInitials(b.toId)}</div>
                  <span style={{ fontSize:'13px', fontWeight:600, color:C.ink, flex:1 }}>{getName(b.toId)}</span>
                  <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:'18px', color:C.red, flexShrink:0 }}>{formatBRL(b.amount)}</span>
                  {isInvolved && (
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleSettle(b)} disabled={createSettlement.isPending}>
                      <Check className="h-3 w-3" /> Pago
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize:'13px', color:C.ink3, padding:'48px', textAlign:'center' }}>Nenhum saldo pendente. Divida despesas para ver quem deve pra quem.</p>
        )}
      </div>
    </div>
  );
}
