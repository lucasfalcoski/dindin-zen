import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useGroups, useCreateGroup, useDeleteGroup, useUpdateGroup, ExpenseGroup } from '@/hooks/useGroups';
import { useExpenses } from '@/hooks/useExpenses';
import { useBudgets, useUpsertBudget } from '@/hooks/useBudgets';
import { formatBRL } from '@/lib/format';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';

const EMOJIS = ['🏠','🍕','🚗','🏥','🎉','📚','👕','📦','💼','🎮','✈️','🎵','🐾','💊','🛒','☕','🎬','💇'];
const COLORS = ['#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#ec4899','#64748b','#f97316','#14b8a6'];
const C = { ink:'#16150f', ink2:'#6b6a63', ink3:'#b0aea6', rule:'#e4e1da', bg:'#f2f0eb', green:'#1a7a45', red:'#b83232', blue:'#1d4ed8', amber:'#92580a' };

export default function Groups() {
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const upsertBudget = useUpsertBudget();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ExpenseGroup | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(EMOJIS[0]);

  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const { data: expenses } = useExpenses({ startDate: monthStart, endDate: monthEnd });
  const { data: budgets } = useBudgets(monthStart);

  const totals = useMemo(() => {
    const map: Record<string, number> = {};
    expenses?.forEach(e => { map[e.group_id] = (map[e.group_id] || 0) + Number(e.amount); });
    return map;
  }, [expenses]);

  const budgetMap = useMemo(() => {
    const map: Record<string, number> = {};
    budgets?.forEach(b => { map[b.group_id] = Number(b.amount); });
    return map;
  }, [budgets]);

  const handleBudgetChange = async (groupId: string, value: string) => {
    const amount = parseFloat(value.replace(',', '.'));
    if (isNaN(amount) || amount < 0) return;
    try {
      await upsertBudget.mutateAsync({ group_id: groupId, amount, month: monthStart });
    } catch { toast({ title: 'Erro ao salvar orçamento', variant: 'destructive' }); }
  };

  const openCreate = () => {
    setEditingGroup(null);
    setName(''); setColor(COLORS[0]); setIcon(EMOJIS[0]);
    setDialogOpen(true);
  };

  const openEdit = (g: ExpenseGroup) => {
    setEditingGroup(g);
    setName(g.name); setColor(g.color); setIcon(g.icon);
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({ id: editingGroup.id, name: name.trim(), color, icon });
        toast({ title: 'Grupo atualizado' });
      } else {
        await createGroup.mutateAsync({ name: name.trim(), color, icon });
        toast({ title: 'Grupo criado' });
      }
      setDialogOpen(false);
    } catch { toast({ title: 'Erro', variant: 'destructive' }); }
  };

  return (
    <div>
      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'6px' }}>organização</p>
          <h1 style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink }}>Grupos</h1>
        </div>
        <button onClick={openCreate} style={{ padding:'6px 16px', borderRadius:'8px', fontSize:'12px', fontWeight:600, fontFamily:"'Cabinet Grotesk',sans-serif", background:C.ink, color:'#fff', border:`1px solid ${C.ink}`, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
          <Plus size={14} /> Novo grupo
        </button>
      </div>

      {/* GRID */}
      {isLoading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px' }}>
          {[...Array(6)].map((_, i) => <div key={i} style={{ height:'120px', background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px' }} />)}
        </div>
      ) : groups && groups.length > 0 ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px' }}>
          {groups.map(g => {
            const spent = totals[g.id] || 0;
            const budget = budgetMap[g.id] || 0;
            const pct = budget > 0 ? (spent / budget) * 100 : 0;
            const barColor = pct > 100 ? C.red : pct >= 80 ? C.amber : g.color;
            return (
              <div
                key={g.id}
                style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'20px', transition:'border-color .15s, box-shadow .15s', cursor:'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#ccc9c0'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.rule; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
              >
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: g.color + '20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>
                      {g.icon}
                    </div>
                    <div>
                      <div style={{ fontSize:'14px', fontWeight:700, color:C.ink }}>{g.name}</div>
                      <div style={{ fontSize:'11px', color:C.ink3 }}>{formatBRL(spent)} gastos</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'4px' }}>
                    <button onClick={() => openEdit(g)} style={{ width:'28px', height:'28px', borderRadius:'6px', border:'none', background:'none', color:C.ink3, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f2f0eb'; (e.currentTarget as HTMLButtonElement).style.color = C.ink; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = C.ink3; }}>
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => deleteGroup.mutate(g.id)} style={{ width:'28px', height:'28px', borderRadius:'6px', border:'none', background:'none', color:C.ink3, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5dede'; (e.currentTarget as HTMLButtonElement).style.color = C.red; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = C.ink3; }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {budget > 0 && (
                  <>
                    <div style={{ height:'4px', background:C.bg, borderRadius:'100px', overflow:'hidden', marginBottom:'4px' }}>
                      <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, borderRadius:'100px', background:barColor }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px' }}>
                      <span style={{ color:C.ink3 }}>Orçamento: {formatBRL(budget)}</span>
                      <span style={{ fontWeight:700, color: pct > 100 ? C.red : pct >= 80 ? C.amber : C.green }}>{pct.toFixed(0)}%</span>
                    </div>
                  </>
                )}

                {!budget && (
                  <button
                    onClick={() => navigate('/budget')}
                    style={{ fontSize:'11px', color:C.blue, background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:"'Cabinet Grotesk',sans-serif" }}
                  >
                    + Definir orçamento
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'48px', textAlign:'center' }}>
          <p style={{ fontSize:'40px', marginBottom:'12px' }}>📂</p>
          <p style={{ color:C.ink2, fontWeight:600 }}>Nenhum grupo criado ainda.</p>
        </div>
      )}

      {/* DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingGroup ? 'Editar grupo' : 'Novo grupo'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do grupo" /></div>
            <div className="space-y-2"><Label>Ícone</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => setIcon(e)}
                    className={`h-9 w-9 rounded-lg text-lg flex items-center justify-center transition-all ${icon === e ? 'ring-2 ring-primary bg-primary/5' : 'bg-accent hover:bg-accent/80'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2"><Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={createGroup.isPending || updateGroup.isPending}>
              {editingGroup ? (updateGroup.isPending ? 'Salvando...' : 'Salvar') : (createGroup.isPending ? 'Criando...' : 'Criar grupo')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
