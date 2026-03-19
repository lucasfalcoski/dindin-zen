import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGroups } from '@/hooks/useGroups';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useCreateExpense, useUpdateExpense, Expense, useCreateInstallments } from '@/hooks/useExpenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type PaymentMethod = 'dinheiro' | 'debito' | 'credito' | 'pix' | 'transferencia' | 'outro';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'dinheiro', label: '💵 Dinheiro' },
  { value: 'debito', label: '💳 Débito' },
  { value: 'credito', label: '💳 Crédito' },
  { value: 'pix', label: '⚡ Pix' },
  { value: 'transferencia', label: '🔄 Transferência' },
  { value: 'outro', label: '📦 Outro' },
];

const expenseSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória').max(200),
  amount: z.string().min(1, 'Valor é obrigatório'),
  date: z.string().min(1, 'Data é obrigatória'),
  group_id: z.string().uuid('Selecione um grupo'),
  recurrent: z.boolean().default(false),
  notes: z.string().max(500).optional(),
  payment_method: z.enum(['dinheiro', 'debito', 'credito', 'pix', 'transferencia', 'outro'] as const).default('outro'),
  account_id: z.string().optional(),
  credit_card_id: z.string().optional(),
  installments_enabled: z.boolean().default(false),
  installment_total: z.string().optional(),
});

type FormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingExpense?: Expense | null;
}

export function ExpenseForm({ open, onOpenChange, editingExpense }: ExpenseFormProps) {
  const { data: groups } = useGroups();
  const { data: accounts } = useAccounts();
  const { data: creditCards } = useCreditCards();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const createInstallments = useCreateInstallments();
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
      payment_method: 'outro',
      account_id: '',
      credit_card_id: '',
      installments_enabled: false,
      installment_total: '2',
    },
  });

  const selectedGroupId = watch('group_id');
  const selectedPayment = watch('payment_method');
  const installmentsEnabled = watch('installments_enabled');
  const isRecurrent = watch('recurrent');

  useEffect(() => {
    if (editingExpense) {
      setValue('description', editingExpense.description);
      setValue('amount', String(editingExpense.amount));
      setValue('date', editingExpense.date);
      setValue('group_id', editingExpense.group_id);
      setValue('recurrent', editingExpense.recurrent);
      setValue('notes', editingExpense.notes || '');
      setValue('payment_method', (editingExpense as any).payment_method || 'outro');
      setValue('account_id', (editingExpense as any).account_id || '');
      setValue('credit_card_id', (editingExpense as any).credit_card_id || '');
      setValue('installments_enabled', false);
      setValue('installment_total', '2');
    } else {
      reset({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        group_id: groups?.[0]?.id || '',
        recurrent: false,
        notes: '',
        payment_method: 'outro',
        account_id: '',
        credit_card_id: '',
        installments_enabled: false,
        installment_total: '2',
      });
    }
  }, [editingExpense, open, groups, setValue, reset]);

  const onSubmit = async (data: FormData) => {
    const amount = parseFloat(data.amount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }

    const payload: any = {
      description: data.description,
      amount,
      date: data.date,
      group_id: data.group_id,
      recurrent: data.recurrent,
      notes: data.notes || undefined,
      payment_method: data.payment_method,
      account_id: data.account_id || null,
      credit_card_id: data.credit_card_id || null,
    };

    try {
      if (editingExpense) {
        await updateExpense.mutateAsync({ id: editingExpense.id, ...payload });
        toast({ title: 'Despesa atualizada' });
      } else if (data.installments_enabled && !data.recurrent) {
        const total = parseInt(data.installment_total || '2', 10);
        if (total < 2 || total > 72) {
          toast({ title: 'Parcelas devem ser entre 2 e 72', variant: 'destructive' });
          return;
        }
        await createInstallments.mutateAsync({ ...payload, installment_total: total });
        toast({ title: `${total} parcelas criadas` });
      } else {
        await createExpense.mutateAsync(payload);
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
            <Label>Método de pagamento</Label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => {
                    setValue('payment_method', pm.value);
                    if (pm.value === 'credito') {
                      setValue('account_id', '');
                    } else {
                      setValue('credit_card_id', '');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                    selectedPayment === pm.value
                      ? 'ring-2 ring-primary bg-primary/5 font-medium'
                      : 'bg-accent hover:bg-accent/80'
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {selectedPayment === 'credito' ? (
            creditCards && creditCards.length > 0 && (
              <div className="space-y-2">
                <Label>Cartão de crédito</Label>
                <select
                  {...register('credit_card_id')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {creditCards.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )
          ) : (
            accounts && accounts.length > 0 && (
              <div className="space-y-2">
                <Label>Conta</Label>
                <select
                  {...register('account_id')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )
          )}

          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" {...register('date')} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="recurrent">Recorrente</Label>
            <Switch
              id="recurrent"
              checked={isRecurrent}
              onCheckedChange={v => {
                setValue('recurrent', v);
                if (v) setValue('installments_enabled', false);
              }}
            />
          </div>

          {!isRecurrent && !editingExpense && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="installments">Parcelar</Label>
                <Switch
                  id="installments"
                  checked={installmentsEnabled}
                  onCheckedChange={v => setValue('installments_enabled', v)}
                />
              </div>

              {installmentsEnabled && (
                <div className="space-y-2">
                  <Label>Número de parcelas</Label>
                  <Input
                    {...register('installment_total')}
                    type="number"
                    min={2}
                    max={72}
                    placeholder="12"
                  />
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea {...register('notes')} placeholder="Observações adicionais..." rows={2} />
          </div>

          <Button type="submit" className="w-full" disabled={createExpense.isPending || updateExpense.isPending || createInstallments.isPending}>
            {editingExpense ? 'Atualizar' : installmentsEnabled ? 'Criar parcelas' : 'Salvar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
