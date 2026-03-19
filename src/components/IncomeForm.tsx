import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateIncome, useUpdateIncome, Income, INCOME_CATEGORIES, IncomeCategory } from '@/hooks/useIncomes';
import { useMyFamilies } from '@/hooks/useFamily';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const incomeSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória').max(200),
  amount: z.string().min(1, 'Valor é obrigatório'),
  date: z.string().min(1, 'Data é obrigatória'),
  category: z.enum(['salario', 'freelance', 'investimento', 'presente', 'outro'] as const),
  recurrent: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

type FormData = z.infer<typeof incomeSchema>;

interface IncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingIncome?: Income | null;
}

export function IncomeForm({ open, onOpenChange, editingIncome }: IncomeFormProps) {
  const createIncome = useCreateIncome();
  const updateIncome = useUpdateIncome();
  const { toast } = useToast();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: 'outro',
      recurrent: false,
      notes: '',
    },
  });

  const selectedCategory = watch('category');

  useEffect(() => {
    if (editingIncome) {
      setValue('description', editingIncome.description);
      setValue('amount', String(editingIncome.amount));
      setValue('date', editingIncome.date);
      setValue('category', editingIncome.category);
      setValue('recurrent', editingIncome.recurrent);
      setValue('notes', editingIncome.notes || '');
    } else {
      reset({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: 'outro',
        recurrent: false,
        notes: '',
      });
    }
  }, [editingIncome, open, setValue, reset]);

  const onSubmit = async (data: FormData) => {
    const amount = parseFloat(data.amount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }

    try {
      if (editingIncome) {
        await updateIncome.mutateAsync({
          id: editingIncome.id,
          description: data.description,
          amount,
          date: data.date,
          category: data.category,
          recurrent: data.recurrent,
          notes: data.notes || undefined,
        });
        toast({ title: 'Receita atualizada' });
      } else {
        await createIncome.mutateAsync({
          description: data.description,
          amount,
          date: data.date,
          category: data.category,
          recurrent: data.recurrent,
          notes: data.notes || undefined,
        });
        toast({ title: 'Receita salva' });
      }
      onOpenChange(false);
      reset();
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingIncome ? 'Editar receita' : 'Nova receita'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              {...register('amount')}
              placeholder="0,00"
              inputMode="decimal"
              autoFocus
              className="currency text-lg"
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input {...register('description')} placeholder="Ex: Salário mensal" />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <div className="flex flex-wrap gap-2">
              {INCOME_CATEGORIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setValue('category', c.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                    selectedCategory === c.value
                      ? 'ring-2 ring-primary bg-primary/5 font-medium'
                      : 'bg-accent hover:bg-accent/80'
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" {...register('date')} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="income-recurrent">Recorrente</Label>
            <Switch
              id="income-recurrent"
              checked={watch('recurrent')}
              onCheckedChange={v => setValue('recurrent', v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea {...register('notes')} placeholder="Observações adicionais..." rows={2} />
          </div>

          <Button type="submit" className="w-full" disabled={createIncome.isPending || updateIncome.isPending}>
            {editingIncome ? 'Atualizar' : 'Salvar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
