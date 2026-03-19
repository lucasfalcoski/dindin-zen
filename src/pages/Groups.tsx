import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useGroups, useCreateGroup, useDeleteGroup, ExpenseGroup } from '@/hooks/useGroups';
import { useExpenses } from '@/hooks/useExpenses';
import { useBudgets, useUpsertBudget } from '@/hooks/useBudgets';
import { formatBRL } from '@/lib/format';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';

const EMOJIS = ['🏠','🍕','🚗','🏥','🎉','📚','👕','📦','💼','🎮','✈️','🎵','🐾','💊','🛒','☕','🎬','💇'];
const COLORS = ['#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#ec4899','#64748b','#f97316','#14b8a6'];

export default function Groups() {
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const deleteGroup = useDeleteGroup();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(EMOJIS[0]);

  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const { data: expenses } = useExpenses({ startDate: monthStart, endDate: monthEnd });

  const totals = useMemo(() => {
    const map: Record<string, number> = {};
    expenses?.forEach(e => {
      map[e.group_id] = (map[e.group_id] || 0) + Number(e.amount);
    });
    return map;
  }, [expenses]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createGroup.mutateAsync({ name: name.trim(), color, icon });
      toast({ title: 'Grupo criado' });
      setDialogOpen(false);
      setName('');
    } catch {
      toast({ title: 'Erro ao criar grupo', variant: 'destructive' });
    }
  };

  const handleDelete = async (group: ExpenseGroup) => {
    if (group.is_default) return;
    try {
      await deleteGroup.mutateAsync(group.id);
      toast({ title: 'Grupo removido' });
    } catch {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Grupos</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card-surface p-5 h-28 animate-pulse">
              <div className="h-8 w-8 bg-muted rounded-lg mb-3" />
              <div className="h-3 w-16 bg-muted rounded mb-2" />
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Grupos</h1>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo grupo
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {groups?.map(g => (
          <div
            key={g.id}
            className="card-surface-hover p-5 cursor-pointer group relative"
            onClick={() => navigate(`/expenses?group=${g.id}`)}
          >
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-lg mb-3"
              style={{ backgroundColor: g.color + '20' }}
            >
              {g.icon}
            </div>
            <p className="text-sm font-medium text-foreground">{g.name}</p>
            <p className="currency text-xs text-muted-foreground mt-1">
              {formatBRL(totals[g.id] || 0)}
            </p>
            {!g.is_default && (
              <button
                onClick={e => { e.stopPropagation(); handleDelete(g); }}
                className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Create group dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do grupo" />
            </div>
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setIcon(e)}
                    className={`h-9 w-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                      icon === e ? 'ring-2 ring-primary bg-primary/5' : 'bg-accent hover:bg-accent/80'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full transition-all ${
                      color === c ? 'ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={createGroup.isPending}>
              {createGroup.isPending ? 'Criando...' : 'Criar grupo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
