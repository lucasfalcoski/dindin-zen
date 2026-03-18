import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGroups } from '@/hooks/useGroups';
import { useCreateExpense, useUpdateExpense, Expense } from '@/hooks/useExpenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const expenseSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória').max(200),
  amount: z.string().min(1, 'Valor é obrigatório'),
  date: z.string().min(1, 'Data é obrigatória'),
  group_id: z.string().uuid('Selecione um grupo'),
  recurrent: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

type FormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingExpense?: Expense | null;
}

export function ExpenseForm({ open, onOpenChange, editingExpense }: ExpenseFormProps) {
  const { data: groups } = useGroups();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const { toast } = useToast();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      group_id: '',
      recurrent: false,
      notes: '',
    },
  });

  const selectedGroupId = watch('group_id');

  useEffect(() => {
    if (editingExpense) {
      setValue('description', editingExpense.description);
      setValue('amount', String(editingExpense.amount));
      setValue('date', editingExpense.date);
      setValue('group_id', editingExpense.group_id);
      setValue('recurrent', editingExpense.recurrent);
      setValue('notes', editingExpense.notes || '');
    } else {
      reset({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        group_id: groups?.[0]?.id || '',
        recurrent: false,
        notes: '',
      });
    }
  }, [editingExpense, open, groups, setValue, reset]);

  const onSubmit = async (data: FormData) => {
    const amount = parseFloat(data.amount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }

    try {
      if (editingExpense) {
        await updateExpense.mutateAsync({
          id: editingExpense.id,
          description: data.description,
          amount,
          date: data.date,
          group_id: data.group_id,
          recurrent: data.recurrent,
          notes: data.notes || undefined,
        });
        toast({ title: 'Despesa atualizada' });
      } else {
        await createExpense.mutateAsync({
          description: data.description,
          amount,
          date: data.date,
          group_id: data.group_id,
          recurrent: data.recurrent,
          notes: data.notes || undefined,
        });
        toast({ title: 'Despesa salva' });
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
          <DialogTitle>{editingExpense ? 'Editar despesa' : 'Nova despesa'}</DialogTitle>
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
            <Input {...register('description')} placeholder="Ex: Almoço no restaurante" />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Grupo</Label>
            <div className="flex flex-wrap gap-2">
              {groups?.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setValue('group_id', g.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                    selectedGroupId === g.id
                      ? 'ring-2 ring-primary bg-primary/5 font-medium'
                      : 'bg-accent hover:bg-accent/80'
                  }`}
                >
                  <span>{g.icon}</span>
                  <span>{g.name}</span>
                </button>
              ))}
            </div>
            {errors.group_id && <p className="text-xs text-destructive">{errors.group_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" {...register('date')} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="recurrent">Recorrente</Label>
            <Switch
              id="recurrent"
              checked={watch('recurrent')}
              onCheckedChange={v => setValue('recurrent', v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea {...register('notes')} placeholder="Observações adicionais..." rows={2} />
          </div>

          <Button type="submit" className="w-full" disabled={createExpense.isPending || updateExpense.isPending}>
            {editingExpense ? 'Atualizar' : 'Salvar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
