import { useState, useEffect } from 'react';
import { Plus, ArrowDown } from 'lucide-react';
import { useGroups } from '@/hooks/useGroups';
import { useCreateExpense } from '@/hooks/useExpenses';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTimezone } from '@/contexts/TimezoneContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function ExpenseFormContent({
  amount,
  setAmount,
  description,
  setDescription,
  groupId,
  setGroupId,
  groups,
  handleSave,
  isPending,
  autoFocus,
}: {
  amount: string;
  setAmount: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  groupId: string;
  setGroupId: (v: string) => void;
  groups: Array<{ id: string; name: string; icon: string }> | undefined;
  handleSave: () => void;
  isPending: boolean;
  autoFocus: boolean;
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto space-y-3 px-1">
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Valor (R$)"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="text-2xl h-14 currency"
          autoFocus={autoFocus}
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
      </div>
      <div className="sticky bottom-0 bg-card pt-3 pb-[env(safe-area-inset-bottom,0px)]">
        <Button
          onClick={handleSave}
          disabled={!amount || !description.trim() || isPending}
          className="w-full h-12 text-base"
        >
          Salvar despesa
        </Button>
      </div>
    </div>
  );
}

export function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState('');
  const { data: groups } = useGroups();
  const createExpense = useCreateExpense();
  const { user } = useAuth();
  const { todayString } = useUserTimezone();
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
        date: todayString(),
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

  const formProps = {
    amount,
    setAmount,
    description,
    setDescription,
    groupId,
    setGroupId,
    groups,
    handleSave,
    isPending: createExpense.isPending,
    autoFocus: open,
  };

  return (
    <>
      {/* Mobile: Sheet from bottom */}
      {isMobile && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl max-h-[90vh] overflow-y-auto flex flex-col p-0"
          >
            <div className="bg-[#E05555] rounded-t-2xl px-5 py-4 flex items-center gap-2">
              <ArrowDown className="h-5 w-5 text-white" />
              <SheetTitle className="text-white text-base font-semibold">Nova Despesa</SheetTitle>
            </div>
            <div className="p-5 flex-1 flex flex-col min-h-0">
              <ExpenseFormContent {...formProps} />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop: Dialog */}
      {!isMobile && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto flex flex-col p-0 gap-0">
            <div className="bg-[#E05555] px-6 py-4 flex items-center gap-2 rounded-t-lg">
              <span className="text-lg">💸</span>
              <DialogTitle className="text-white text-base font-semibold">Nova Despesa Rápida</DialogTitle>
            </div>
            <div className="p-6 flex-1 flex flex-col min-h-0">
              <ExpenseFormContent {...formProps} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed z-[55] h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg',
          'hidden md:flex items-center justify-center transition-all duration-200',
          'hover:scale-105 hover:shadow-xl active:scale-95',
          'right-5 bottom-8'
        )}
      >
        <Plus className="h-6 w-6" />
      </button>
    </>
  );
}
