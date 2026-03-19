import { useEffect, useRef } from 'react';
import { format, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { useExpenses } from '@/hooks/useExpenses';
import { useBudgets } from '@/hooks/useBudgets';
import { useGroups } from '@/hooks/useGroups';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function NotificationAlerts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const notified = useRef(new Set<string>());

  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: expenses } = useExpenses({ startDate: monthStart, endDate: monthEnd });
  const { data: budgets } = useBudgets(monthStart);
  const { data: groups } = useGroups();
  const { data: creditCards } = useCreditCards();

  useEffect(() => {
    if (!user || !expenses || !budgets || !groups) return;

    const myExpenses = expenses.filter(e => e.user_id === user.id);

    // Budget alerts: group above 80%
    budgets.forEach(b => {
      const spent = myExpenses
        .filter(e => e.group_id === b.group_id)
        .reduce((s, e) => s + Number(e.amount), 0);
      const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      const key = `budget_${b.group_id}_${monthStart}`;

      if (pct >= 80 && !notified.current.has(key)) {
        notified.current.add(key);
        const group = groups.find(g => g.id === b.group_id);
        toast({
          title: `⚠️ ${group?.icon || ''} ${group?.name || 'Grupo'} a ${pct.toFixed(0)}% do orçamento`,
          description: `Você já gastou ${pct.toFixed(0)}% do limite de R$ ${b.amount.toFixed(2)}`,
          variant: pct >= 100 ? 'destructive' : undefined,
        });
      }
    });
  }, [expenses, budgets, groups, user]);

  // Credit card due date reminders (3 days before)
  useEffect(() => {
    if (!creditCards || !user) return;

    const today = now.getDate();
    creditCards.forEach(card => {
      const dueDay = card.due_day;
      const daysUntilDue = dueDay >= today ? dueDay - today : (30 - today + dueDay);
      const key = `card_due_${card.id}_${format(now, 'yyyy-MM')}`;

      if (daysUntilDue <= 3 && daysUntilDue >= 0 && !notified.current.has(key)) {
        notified.current.add(key);
        toast({
          title: `💳 Fatura do ${card.name} vence em ${daysUntilDue === 0 ? 'hoje' : `${daysUntilDue} dia(s)`}`,
          description: 'Não esqueça de pagar sua fatura!',
        });
      }
    });
  }, [creditCards, user]);

  return null;
}
