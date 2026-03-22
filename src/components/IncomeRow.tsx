import { Income, INCOME_CATEGORIES, useDeleteIncome } from '@/hooks/useIncomes';
import { formatBRL, formatDateShort } from '@/lib/format';
import { Trash2, Pencil, RefreshCw, MessageCircle } from 'lucide-react';
import { useWhatsAppConfirmedIds } from '@/hooks/useWhatsAppTransactions';
import { useToast } from '@/hooks/use-toast';

interface IncomeRowProps {
  income: Income;
  onEdit?: (income: Income) => void;
}

export function IncomeRow({ income, onEdit }: IncomeRowProps) {
  const deleteIncome = useDeleteIncome();
  const { toast } = useToast();
  const cat = INCOME_CATEGORIES.find(c => c.value === income.category);
  const { data: waIds } = useWhatsAppConfirmedIds();
  const isWhatsApp = waIds?.incomeIds.has(income.id);

  const handleDelete = async () => {
    try {
      await deleteIncome.mutateAsync(income.id);
      toast({ title: 'Receita excluída' });
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 group hover:bg-accent/30 transition-colors duration-100">
      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-base bg-emerald-500/10">
        {cat?.icon || '📦'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{income.description}</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{formatDateShort(income.date)}</span>
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="text-[11px] text-muted-foreground">{cat?.label}</span>
          {income.recurrent && <RefreshCw className="h-3 w-3 text-muted-foreground" />}
          {(income as any).visibility === 'family' && <span className="text-[11px]">👨‍👩‍👧</span>}
          {isWhatsApp && <MessageCircle className="inline h-3 w-3 text-[#25D366]" />}
        </div>
      </div>
      <span className="currency text-sm font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
        +{formatBRL(Number(income.amount))}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <button onClick={() => onEdit(income)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={handleDelete} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
