import { useState } from 'react';
import { useGoals, useCreateGoal, useDeleteGoal, useAddContribution, useGoalContributions } from '@/hooks/useGoals';
import { formatBRL } from '@/lib/format';
import { differenceInDays, format } from 'date-fns';
import { Plus, Trash2, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const ICONS = ['🎯', '🏠', '✈️', '🚗', '📚', '💻', '🎓', '💍', '🏖️', '🎉'];
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const C = {
  ink: '#16150f', ink2: '#6b6a63', ink3: '#b0aea6',
  rule: '#e4e1da', bg: '#f2f0eb',
  green: '#1a7a45', red: '#b83232', blue: '#1d4ed8', amber: '#92580a',
};

function GoalCard({ goal }: { goal: any }) {
  const [contribAmount, setContribAmount] = useState('');
  const [showContrib, setShowContrib] = useState(false);
  const addContrib = useAddContribution();
  const deleteGoal = useDeleteGoal();
  const { toast } = useToast();

  const pct = Math.min(100, (Number(goal.current_amount) / Number(goal.target_amount)) * 100);
  const completed = pct >= 100;

  const { data: contributions } = useGoalContributions(goal.id);
  const projection = (() => {
    if (!contributions || contributions.length < 2 || completed) return null;
    const remaining = Number(goal.target_amount) - Number(goal.current_amount);
    if (remaining <= 0) return null;
    const sorted = [...contributions].sort((a, b) => a.date.localeCompare(b.date));
    const firstDate = new Date(sorted[0].date);
    const lastDate = new Date(sorted[sorted.length - 1].date);
    const daysDiff = Math.max(1, differenceInDays(lastDate, firstDate));
    const totalContrib = contributions.reduce((s, c) => s + Number(c.amount), 0);
    const dailyRate = totalContrib / daysDiff;
    if (dailyRate <= 0) return null;
    const daysNeeded = Math.ceil(remaining / dailyRate);
    const projDate = new Date();
    projDate.setDate(projDate.getDate() + daysNeeded);
    return format(projDate, 'dd/MM/yyyy');
  })();

  const handleAddContrib = () => {
    const amount = parseFloat(contribAmount);
    if (!amount || amount <= 0) return;
    addContrib.mutate({ goalId: goal.id, amount }, {
      onSuccess: () => {
        setContribAmount('');
        setShowContrib(false);
        const newTotal = Number(goal.current_amount) + amount;
        if (newTotal >= Number(goal.target_amount)) {
          toast({ title: '🎉 Meta atingida!', description: `Parabéns! Você alcançou a meta "${goal.name}"!` });
        } else {
          toast({ title: 'Aporte registrado', description: `${formatBRL(amount)} adicionado à meta "${goal.name}"` });
        }
      },
    });
  };

  const pctColor = completed ? C.green : pct >= 80 ? C.blue : pct >= 50 ? C.amber : C.ink2;

  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${C.rule}`,
        borderRadius: '14px',
        padding: '20px',
        transition: 'border-color .15s, box-shadow .15s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#ccc9c0';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.06)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = C.rule;
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {completed && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: 'rgba(26,122,69,0.04)' }} />
          <PartyPopper className="h-16 w-16 animate-bounce" style={{ color: 'rgba(26,122,69,0.15)' }} />
        </div>
      )}

      {/* Top */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', position: 'relative' }}>
        <div>
          <div style={{ fontSize: '22px', marginBottom: '8px' }}>{goal.icon}</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: C.ink }}>{goal.name}</div>
          <div style={{ fontSize: '11px', color: C.ink3, fontWeight: 500, marginTop: '2px' }}>
            {formatBRL(Number(goal.current_amount))} de {formatBRL(Number(goal.target_amount))}
            {goal.deadline && ` · Prazo: ${goal.deadline.split('-').reverse().join('/')}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: '26px',
            color: pctColor,
            lineHeight: 1,
          }}>
            {pct.toFixed(0)}%
          </div>
          <button
            onClick={() => deleteGoal.mutate(goal.id)}
            style={{
              width: '28px', height: '28px', borderRadius: '8px', border: 'none',
              background: 'none', color: C.ink3, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#f5dede';
              (e.currentTarget as HTMLButtonElement).style.color = C.red;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'none';
              (e.currentTarget as HTMLButtonElement).style.color = C.ink3;
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '5px', background: C.bg, borderRadius: '100px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: '100px',
          background: completed ? C.green : goal.color,
          transition: 'width .6s ease',
        }} />
      </div>

      {/* Projection */}
      {projection && (
        <p style={{ fontSize: '11px', color: C.ink3, marginTop: '8px' }}>
          📅 No ritmo atual, você atinge essa meta em{' '}
          <span style={{ fontWeight: 600, color: C.ink }}>{projection}</span>
        </p>
      )}

      {/* Aporte */}
      {showContrib ? (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <Input
            type="number"
            placeholder="Valor do aporte"
            value={contribAmount}
            onChange={e => setContribAmount(e.target.value)}
            className="flex-1"
            min="0"
            step="0.01"
          />
          <Button size="sm" onClick={handleAddContrib} disabled={addContrib.isPending}>
            Salvar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowContrib(false)}>✕</Button>
        </div>
      ) : (
        <button
          onClick={() => setShowContrib(true)}
          disabled={completed}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '8px',
            borderRadius: '10px',
            border: `1px solid ${C.rule}`,
            background: 'none',
            color: C.ink2,
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: "'Cabinet Grotesk', sans-serif",
            cursor: completed ? 'default' : 'pointer',
            opacity: completed ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all .15s',
          }}
          onMouseEnter={e => {
            if (!completed) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = C.ink2;
              (e.currentTarget as HTMLButtonElement).style.color = C.ink;
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = C.rule;
            (e.currentTarget as HTMLButtonElement).style.color = C.ink2;
          }}
        >
          <Plus size={14} /> Adicionar aporte
        </button>
      )}
    </div>
  );
}

export default function Goals() {
  const { data: goals, isLoading } = useGoals();
  const createGoal = useCreateGoal();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', target_amount: '', deadline: '', color: COLORS[0], icon: ICONS[0] });
  const { toast } = useToast();

  const handleCreate = () => {
    if (!form.name || !form.target_amount) return;
    createGoal.mutate(
      {
        name: form.name,
        target_amount: parseFloat(form.target_amount),
        deadline: form.deadline || undefined,
        color: form.color,
        icon: form.icon,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setForm({ name: '', target_amount: '', deadline: '', color: COLORS[0], icon: ICONS[0] });
          toast({ title: 'Meta criada!' });
        },
      }
    );
  };

  return (
    <div>
      {/* ── PAGE HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: '28px', paddingBottom: '20px', borderBottom: `1px solid ${C.rule}`,
      }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.ink3, marginBottom: '6px' }}>
            planejamento
          </p>
          <h1 style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: '34px', lineHeight: 1, letterSpacing: '-0.5px', color: C.ink,
          }}>
            Suas <em style={{ fontStyle: 'italic', color: C.ink2 }}>Metas</em>
          </h1>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button style={{
              padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              fontFamily: "'Cabinet Grotesk', sans-serif",
              background: C.ink, color: '#fff', border: `1px solid ${C.ink}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <Plus size={14} /> Nova meta
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova meta</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="label-caps block mb-1.5">Nome</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Viagem Europa" />
              </div>
              <div>
                <label className="label-caps block mb-1.5">Valor objetivo</label>
                <Input type="number" min="0" step="0.01" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} placeholder="10000.00" />
              </div>
              <div>
                <label className="label-caps block mb-1.5">Prazo (opcional)</label>
                <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
              <div>
                <label className="label-caps block mb-1.5">Ícone</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(icon => (
                    <button key={icon} onClick={() => setForm(f => ({ ...f, icon }))}
                      className={`h-9 w-9 rounded-lg text-lg flex items-center justify-center transition-colors ${form.icon === icon ? 'bg-primary/10 ring-2 ring-primary' : 'bg-accent hover:bg-accent/80'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label-caps block mb-1.5">Cor</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`h-7 w-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-primary' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <Button onClick={handleCreate} disabled={createGoal.isPending} className="w-full">
                Criar meta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── GRID DE METAS ── */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: '160px', background: '#fff', border: `1px solid ${C.rule}`, borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : goals && goals.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {goals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
        </div>
      ) : (
        <div style={{
          background: '#fff', border: `1px solid ${C.rule}`, borderRadius: '14px',
          padding: '48px', textAlign: 'center',
        }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>🎯</p>
          <p style={{ color: C.ink2, fontWeight: 600 }}>Nenhuma meta criada ainda.</p>
          <p style={{ fontSize: '13px', color: C.ink3, marginTop: '4px' }}>Comece criando sua primeira meta de economia!</p>
        </div>
      )}
    </div>
  );
}
