import { useState } from 'react';
import { useGoals, useCreateGoal, useDeleteGoal, useAddContribution, useGoalContributions } from '@/hooks/useGoals';
import { formatBRL } from '@/lib/format';
import { differenceInDays, format } from 'date-fns';
import { Plus, Trash2, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

const ICONS = ['🎯', '🏠', '✈️', '🚗', '📚', '💻', '🎓', '💍', '🏖️', '🎉'];
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

function GoalCard({ goal }: { goal: any }) {
  const [contribAmount, setContribAmount] = useState('');
  const [showContrib, setShowContrib] = useState(false);
  const addContrib = useAddContribution();
  const deleteGoal = useDeleteGoal();
  const { toast } = useToast();

  const pct = Math.min(100, (Number(goal.current_amount) / Number(goal.target_amount)) * 100);
  const completed = pct >= 100;

  // Projection
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

  return (
    <div className="card-surface p-5 space-y-3 relative overflow-hidden">
      {completed && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-success/5" />
          <PartyPopper className="h-16 w-16 text-success/20 animate-bounce" />
        </div>
      )}

      <div className="flex items-start justify-between relative">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: goal.color + '20' }}
          >
            {goal.icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{goal.name}</h3>
            {goal.deadline && (
              <p className="text-xs text-muted-foreground">
                Prazo: {goal.deadline.split('-').reverse().join('/')}
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteGoal.mutate(goal.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="currency text-foreground">{formatBRL(Number(goal.current_amount))}</span>
          <span className="currency text-muted-foreground">{formatBRL(Number(goal.target_amount))}</span>
        </div>
        <Progress
          value={pct}
          className="h-3"
          style={{ '--progress-color': completed ? 'hsl(var(--success))' : goal.color } as any}
        />
        <p className="text-xs text-muted-foreground text-right">{pct.toFixed(0)}%</p>
      </div>

      {projection && (
        <p className="text-xs text-muted-foreground">
          📅 No ritmo atual, você atinge essa meta em <span className="font-medium text-foreground">{projection}</span>
        </p>
      )}

      {showContrib ? (
        <div className="flex gap-2">
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
          <Button size="sm" variant="ghost" onClick={() => setShowContrib(false)}>
            ✕
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setShowContrib(true)} disabled={completed}>
          <Plus className="h-3.5 w-3.5" /> Adicionar aporte
        </Button>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Metas</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Nova meta
            </Button>
          </DialogTrigger>
          <DialogContent className="flex flex-col max-h-[90dvh] p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
              <DialogTitle>Nova meta</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0 space-y-4">
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
                    <button
                      key={icon}
                      onClick={() => setForm(f => ({ ...f, icon }))}
                      className={`h-9 w-9 rounded-lg text-lg flex items-center justify-center transition-colors ${form.icon === icon ? 'bg-primary/10 ring-2 ring-primary' : 'bg-accent hover:bg-accent/80'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label-caps block mb-1.5">Cor</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`h-7 w-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-primary' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 pt-3 flex-shrink-0 border-t border-border bg-card rounded-b-lg">
              <Button onClick={handleCreate} disabled={createGoal.isPending} className="w-full">
                Criar meta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : goals && goals.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {goals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
        </div>
      ) : (
        <div className="card-surface p-12 text-center">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-muted-foreground">Nenhuma meta criada ainda.</p>
          <p className="text-sm text-muted-foreground mt-1">Comece criando sua primeira meta de economia!</p>
        </div>
      )}
    </div>
  );
}
