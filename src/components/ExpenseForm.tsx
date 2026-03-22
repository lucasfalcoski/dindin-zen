import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGroups } from '@/hooks/useGroups';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useFamilySharedAccounts, useFamilySharedCreditCards } from '@/hooks/useFamilyAccounts';
import { useMyFamilies, useFamilyMembers } from '@/hooks/useFamily';
import { useCreateExpense, useUpdateExpense, Expense, useCreateInstallments } from '@/hooks/useExpenses';
import { useSetExpenseTags, useExpenseTags } from '@/hooks/useTags';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTimezone } from '@/contexts/TimezoneContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { TagInput } from '@/components/TagInput';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

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
  visibility: z.enum(['personal', 'family'] as const).default('personal'),
  split_enabled: z.boolean().default(false),
});

type FormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingExpense?: Expense | null;
}

export function ExpenseForm({ open, onOpenChange, editingExpense }: ExpenseFormProps) {
  const { user } = useAuth();
  const { todayString } = useUserTimezone();
  const { data: groups } = useGroups();
  const { data: accounts } = useAccounts();
  const { data: creditCards } = useCreditCards();
  const { data: familyAccounts } = useFamilySharedAccounts();
  const { data: familyCards } = useFamilySharedCreditCards();
  const { data: families } = useMyFamilies();
  const hasFamily = families && families.length > 0;
  const familyId = families?.[0]?.id;
  const { data: members } = useFamilyMembers(familyId);
  const activeMembers = (members || []).filter(m => m.status === 'active' && m.user_id);
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const createInstallments = useCreateInstallments();
  const setExpenseTags = useSetExpenseTags();
  const { data: existingTags } = useExpenseTags(editingExpense?.id);
  const { toast } = useToast();

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [splitMembers, setSplitMembers] = useState<Record<string, boolean>>({});
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});

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
      visibility: 'personal',
      split_enabled: false,
    },
  });

  const selectedGroupId = watch('group_id');
  const selectedPayment = watch('payment_method');
  const installmentsEnabled = watch('installments_enabled');
  const isRecurrent = watch('recurrent');
  const isFamilyVisible = watch('visibility') === 'family';
  const splitEnabled = watch('split_enabled');
  const watchedAmount = watch('amount');

  // Auto-calculate split amounts
  useEffect(() => {
    if (!splitEnabled) return;
    const totalAmount = parseFloat((watchedAmount || '0').replace(',', '.'));
    if (isNaN(totalAmount) || totalAmount <= 0) return;

    const selectedIds = Object.entries(splitMembers).filter(([, v]) => v).map(([k]) => k);
    if (selectedIds.length === 0) return;

    const perPerson = totalAmount / selectedIds.length;
    const newAmounts: Record<string, string> = {};
    selectedIds.forEach(id => { newAmounts[id] = perPerson.toFixed(2); });
    setSplitAmounts(newAmounts);
  }, [splitEnabled, splitMembers, watchedAmount]);

  // Init split members when enabling
  useEffect(() => {
    if (splitEnabled && activeMembers.length > 0) {
      const initial: Record<string, boolean> = {};
      activeMembers.forEach(m => { if (m.user_id) initial[m.user_id] = true; });
      setSplitMembers(initial);
    }
  }, [splitEnabled, activeMembers.length]);

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
      setValue('visibility', (editingExpense as any).visibility || 'personal');
      setValue('split_enabled', false);
      setSelectedTagIds(existingTags?.map(t => t.id) || []);
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
        visibility: 'personal',
        split_enabled: false,
      });
      setSplitMembers({});
      setSplitAmounts({});
      setSelectedTagIds([]);
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
      visibility: data.visibility,
    };

    try {
      let savedExpenseId: string | null = null;
      if (editingExpense) {
        await updateExpense.mutateAsync({ id: editingExpense.id, ...payload });
        savedExpenseId = editingExpense.id;
        toast({ title: 'Despesa atualizada' });
      } else if (data.split_enabled && isFamilyVisible) {
        const splitGroupId = crypto.randomUUID();
        const selectedIds = Object.entries(splitMembers).filter(([, v]) => v).map(([k]) => k);
        if (selectedIds.length === 0) {
          toast({ title: 'Selecione pelo menos um membro', variant: 'destructive' });
          return;
        }
        const rows = selectedIds.map(uid => ({
          ...payload,
          user_id: uid,
          amount: parseFloat(splitAmounts[uid] || '0'),
          split_group_id: splitGroupId,
          visibility: 'family',
        }));
        const { error } = await supabase.from('expenses').insert(rows as any);
        if (error) throw error;
        toast({ title: `Despesa dividida entre ${selectedIds.length} membros` });
      } else if (data.installments_enabled && !data.recurrent) {
        const total = parseInt(data.installment_total || '2', 10);
        if (total < 2 || total > 72) {
          toast({ title: 'Parcelas devem ser entre 2 e 72', variant: 'destructive' });
          return;
        }
        await createInstallments.mutateAsync({ ...payload, installment_total: total });
        toast({ title: `${total} parcelas criadas` });
      } else {
        const result = await createExpense.mutateAsync(payload);
        savedExpenseId = result.id;
        toast({ title: 'Despesa salva' });
      }

      // Save tags
      if (savedExpenseId && selectedTagIds.length > 0) {
        await setExpenseTags.mutateAsync({ expenseId: savedExpenseId, tagIds: selectedTagIds });
      }

      onOpenChange(false);
      reset();
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[90dvh] p-0 gap-0 sm:max-w-md">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>{editingExpense ? 'Editar despesa' : 'Nova despesa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0 space-y-4">
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
            (creditCards && creditCards.length > 0 || familyCards && familyCards.length > 0) && (
              <div className="space-y-2">
                <Label>Cartão de crédito</Label>
                <select
                  {...register('credit_card_id')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {creditCards && creditCards.length > 0 && (
                    <optgroup label="Meus cartões">
                      {creditCards.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {familyCards && familyCards.length > 0 && (
                    <optgroup label="Cartões da família">
                      {familyCards.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.owner_emoji || '👤'} {c.owner_name} — {c.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )
          ) : (
            (accounts && accounts.length > 0 || familyAccounts && familyAccounts.length > 0) && (
              <div className="space-y-2">
                <Label>Conta</Label>
                <select
                  {...register('account_id')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {accounts && accounts.length > 0 && (
                    <optgroup label="Minhas contas">
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {familyAccounts && familyAccounts.length > 0 && (
                    <optgroup label="Contas da família">
                      {familyAccounts.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.owner_emoji || '👤'} {a.owner_name} — {a.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
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
                    max={48}
                    placeholder="12"
                  />
                  {(() => {
                    const total = parseFloat((watchedAmount || '0').replace(',', '.'));
                    const parcelas = parseInt(watch('installment_total') || '2', 10);
                    if (!isNaN(total) && total > 0 && !isNaN(parcelas) && parcelas >= 2) {
                      const perMonth = total / parcelas;
                      return (
                        <p className="text-xs text-muted-foreground">
                          💳 {parcelas}x de <span className="font-medium text-foreground">R$ {perMonth.toFixed(2).replace('.', ',')}</span> por mês
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </>
          )}

          {hasFamily && (
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="visibility">Compartilhar com a família</Label>
                <p className="text-[11px] text-muted-foreground">Todos os membros poderão ver</p>
              </div>
              <Switch
                id="visibility"
                checked={isFamilyVisible}
                onCheckedChange={v => {
                  setValue('visibility', v ? 'family' : 'personal');
                  if (!v) setValue('split_enabled', false);
                }}
              />
            </div>
          )}

          {/* Split between members */}
          {hasFamily && isFamilyVisible && !editingExpense && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="split">Dividir entre membros</Label>
                  <p className="text-[11px] text-muted-foreground">Cria registro individual para cada um</p>
                </div>
                <Switch
                  id="split"
                  checked={splitEnabled}
                  onCheckedChange={v => setValue('split_enabled', v)}
                />
              </div>

              {splitEnabled && activeMembers.length > 0 && (
                <div className="space-y-2 rounded-lg bg-accent/50 p-3">
                  <p className="text-xs text-muted-foreground font-medium">Selecione os membros:</p>
                  {activeMembers.map(m => {
                    const uid = m.user_id!;
                    const isMe = uid === user?.id;
                    const label = isMe ? 'Você' : (m.invited_email?.split('@')[0] || 'Membro');
                    return (
                      <div key={uid} className="flex items-center gap-3">
                        <Checkbox
                          checked={!!splitMembers[uid]}
                          onCheckedChange={v => setSplitMembers(prev => ({ ...prev, [uid]: !!v }))}
                        />
                        <span className="text-sm text-foreground flex-1">{label}</span>
                        <Input
                          className="w-24 h-7 text-xs text-right"
                          value={splitAmounts[uid] || ''}
                          onChange={e => setSplitAmounts(prev => ({ ...prev, [uid]: e.target.value }))}
                          placeholder="0,00"
                          inputMode="decimal"
                          disabled={!splitMembers[uid]}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label>Tags (opcional)</Label>
            <TagInput selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea {...register('notes')} placeholder="Observações adicionais..." rows={2} />
          </div>

          </div>
          <div className="px-6 pb-6 pt-3 flex-shrink-0 border-t border-border bg-card rounded-b-lg">
            <Button type="submit" className="w-full" disabled={createExpense.isPending || updateExpense.isPending || createInstallments.isPending}>
              {editingExpense ? 'Atualizar' : splitEnabled ? 'Dividir e salvar' : installmentsEnabled ? 'Criar parcelas' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
