import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateIncome } from '@/hooks/useIncomes';
import { useGroups } from '@/hooks/useGroups';
import { useBudgets, useUpsertBudget } from '@/hooks/useBudgets';
import { useCreateCreditCard } from '@/hooks/useCreditCards';
import { useMyFamilies, useCreateFamily } from '@/hooks/useFamily';
import { format, startOfMonth } from 'date-fns';
import { useUserTimezone } from '@/contexts/TimezoneContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const BUDGET_SUGGESTIONS: Record<string, number> = {
  'Moradia': 30,
  'Alimentação': 25,
  'Transporte': 15,
  'Saúde': 10,
  'Lazer': 10,
  'Educação': 5,
  'Vestuário': 3,
  'Outros': 2,
};

export function OnboardingWizard() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const { toast } = useToast();

  // Step 1
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const createIncome = useCreateIncome();

  // Step 2
  const { data: groups } = useGroups();
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const upsertBudget = useUpsertBudget();

  // Step 3
  const [cardName, setCardName] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const createCard = useCreateCreditCard();

  // Step 4
  const [familyName, setFamilyName] = useState('');
  const createFamily = useCreateFamily();

  // Check if should show
  useEffect(() => {
    if (!user) return;
    const key = `onboarding_done_${user.id}`;
    const stepKey = `onboarding_step_${user.id}`;
    if (localStorage.getItem(key) === 'true') {
      setShow(false);
      return;
    }
    const savedStep = parseInt(localStorage.getItem(stepKey) || '0');
    setStep(savedStep);
    // Show after a brief delay to not flash on login
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, [user]);

  // Save step progress
  useEffect(() => {
    if (user) localStorage.setItem(`onboarding_step_${user.id}`, String(step));
  }, [step, user]);

  // Pre-fill budget suggestions based on income
  useEffect(() => {
    if (monthlyIncome && groups) {
      const income = parseFloat(monthlyIncome);
      if (income > 0) {
        const newBudgets: Record<string, string> = {};
        groups.forEach(g => {
          const pct = BUDGET_SUGGESTIONS[g.name] || 5;
          newBudgets[g.id] = Math.round(income * pct / 100).toString();
        });
        setBudgets(newBudgets);
      }
    }
  }, [monthlyIncome, groups]);

  const finish = () => {
    if (user) localStorage.setItem(`onboarding_done_${user.id}`, 'true');
    setShow(false);
    toast({ title: '🎉 Tudo pronto!', description: 'Seu app está configurado.' });
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-help-guide'));
    }, 700);
  };

  const handleStep1 = async () => {
    const amount = parseFloat(monthlyIncome);
    if (amount > 0) {
      await createIncome.mutateAsync({
        description: 'Salário',
        amount,
        date: format(new Date(), 'yyyy-MM-dd'),
        category: 'salario',
        recurrent: true,
      });
    }
    setStep(1);
  };

  const handleStep2 = async () => {
    const month = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    for (const [groupId, amount] of Object.entries(budgets)) {
      const val = parseFloat(amount);
      if (val > 0) {
        await upsertBudget.mutateAsync({ group_id: groupId, month, amount: val });
      }
    }
    setStep(2);
  };

  const handleStep3 = async () => {
    if (cardName && cardLimit) {
      await createCard.mutateAsync({
        name: cardName,
        limit: parseFloat(cardLimit) || 0,
        closing_day: 25,
        due_day: 10,
      });
    }
    setStep(3);
  };

  const handleStep4 = async () => {
    if (familyName.trim()) {
      await createFamily.mutateAsync(familyName.trim());
    }
    finish();
  };

  if (!show) return null;

  const steps = [
    { title: '💰 Qual sua renda mensal?', emoji: '1' },
    { title: '📊 Defina seus orçamentos', emoji: '2' },
    { title: '💳 Tem cartões de crédito?', emoji: '3' },
    { title: '👨‍👩‍👧‍👦 Convide sua família', emoji: '4' },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Progress */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Passo {step + 1} de 4</span>
            <button onClick={finish} className="hover:text-foreground transition-colors">Pular</button>
          </div>
          <Progress value={(step + 1) / 4 * 100} className="h-1.5" />
        </div>

        <div className="p-6 pt-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">{steps[step].title}</h2>

          {step === 0 && (
            <div className="space-y-4">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="Ex: 5000.00"
                value={monthlyIncome}
                onChange={e => setMonthlyIncome(e.target.value)}
                className="text-xl h-14 currency"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Isso criará uma receita recorrente de salário.</p>
              <Button onClick={handleStep1} className="w-full" disabled={createIncome.isPending}>
                Próximo
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {(groups || []).map(g => (
                  <div key={g.id} className="flex items-center gap-3">
                    <span className="text-sm w-24 truncate">{g.icon} {g.name}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={budgets[g.id] || ''}
                      onChange={e => setBudgets(prev => ({ ...prev, [g.id]: e.target.value }))}
                      className="flex-1 currency"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Valores sugeridos com base na sua renda.</p>
              <Button onClick={handleStep2} className="w-full" disabled={upsertBudget.isPending}>
                Próximo
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Input
                placeholder="Nome do cartão (ex: Nubank)"
                value={cardName}
                onChange={e => setCardName(e.target.value)}
              />
              <Input
                type="number"
                inputMode="decimal"
                placeholder="Limite do cartão"
                value={cardLimit}
                onChange={e => setCardLimit(e.target.value)}
                className="currency"
              />
              <p className="text-xs text-muted-foreground">Opcional. Você pode adicionar mais cartões depois.</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">Pular</Button>
                <Button onClick={handleStep3} className="flex-1" disabled={createCard.isPending}>
                  Próximo
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Input
                placeholder="Nome da família (ex: Família Silva)"
                value={familyName}
                onChange={e => setFamilyName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Opcional. Compartilhe despesas e orçamentos com sua família.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={finish} className="flex-1">Pular</Button>
                <Button onClick={handleStep4} className="flex-1" disabled={createFamily.isPending}>
                  Finalizar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
