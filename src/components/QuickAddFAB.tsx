import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { useGroups } from '@/hooks/useGroups';
import { useCreateExpense } from '@/hooks/useExpenses';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState('');
  const { data: groups } = useGroups();
  const createExpense = useCreateExpense();
  const { user } = useAuth();
  const { toast } = useToast();

  // Set default group
  useEffect(() => {
    if (groups && groups.length > 0 && !groupId) {
      setGroupId(groups[0].id);
    }
  }, [groups, groupId]);

  const handleSave = () => {
    const val = parseFloat(amount);
    if (!val || !description.trim() || !groupId) return;

    createExpense.mutate(
      {
        amount: val,
        description: description.trim(),
        group_id: groupId,
        date: new Date().toISOString().split('T')[0],
        recurrent: false,
        payment_method: 'outro',
      },
      {
        onSuccess: () => {
          toast({ title: 'Despesa salva!' });
          setAmount('');
          setDescription('');
          setOpen(false);
        },
      }
    );
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom sheet */}
      <div
        className={cn(
          'fixed left-0 right-0 bottom-0 z-[70] transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="bg-card rounded-t-2xl border-t border-border p-5 pb-8 max-w-lg mx-auto shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">Despesa rápida</h3>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-accent text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Valor (R$)"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="text-2xl h-14 currency"
              autoFocus={open}
              min="0"
              step="0.01"
            />
            <Input
              placeholder="Descrição"
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <div className="flex flex-wrap gap-1.5">
              {(groups || []).slice(0, 8).map(g => (
                <button
                  key={g.id}
                  onClick={() => setGroupId(g.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    groupId === g.id
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'bg-accent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {g.icon} {g.name}
                </button>
              ))}
            </div>
            <Button
              onClick={handleSave}
              disabled={!amount || !description.trim() || createExpense.isPending}
              className="w-full h-12 text-base"
            >
              Salvar despesa
            </Button>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed z-[55] h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg',
          'flex items-center justify-center transition-all duration-200',
          'hover:scale-105 hover:shadow-xl active:scale-95',
          'right-5 bottom-20 md:bottom-8'
        )}
      >
        <Plus className="h-6 w-6" />
      </button>
    </>
  );
}
