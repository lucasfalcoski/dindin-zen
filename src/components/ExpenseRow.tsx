import { Expense, useDeleteExpense, useCancelInstallments } from '@/hooks/useExpenses';
import { formatBRL, formatDate } from '@/lib/format';
import { GroupBadge } from './GroupBadge';
import { Trash2, Pencil, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { format } from 'date-fns';

interface ExpenseRowProps {
  expense: Expense;
  onEdit?: (expense: Expense) => void;
}

export function ExpenseRow({ expense, onEdit }: ExpenseRowProps) {
  const deleteExpense = useDeleteExpense();
  const cancelInstallments = useCancelInstallments();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const group = expense.expense_groups;
  const isInstallment = expense.installment_total && expense.installment_current;

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    await deleteExpense.mutateAsync(expense.id);
    toast({ title: 'Despesa removida' });
  };

  return (
    <div className="group grid grid-cols-[auto_1fr_auto] gap-3 items-center py-3 px-4 hover:bg-accent/50 rounded-lg transition-colors duration-150">
      <div className="flex-shrink-0">
        {group && (
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center text-sm"
            style={{ backgroundColor: group.color + '20' }}
          >
            {group.icon}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{expense.description}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(expense.date)}
          {group && <span> · {group.name}</span>}
          {expense.recurrent && <span> · 🔄</span>}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="currency text-sm text-foreground font-medium">{formatBRL(expense.amount)}</span>
        <div className="hidden group-hover:flex items-center gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(expense)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className={`p-1.5 rounded-md transition-colors ${
              confirming
                ? 'text-destructive bg-destructive/10'
                : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
