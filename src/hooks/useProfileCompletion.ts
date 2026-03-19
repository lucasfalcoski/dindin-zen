import { useProfile } from '@/hooks/useProfiles';
import { useAccounts } from '@/hooks/useAccounts';
import { useIncomes } from '@/hooks/useIncomes';
import { useCreditCards } from '@/hooks/useCreditCards';

export interface ProfileTask {
  id: string;
  label: string;
  done: boolean;
  href: string;
}

export function useProfileCompletion() {
  const { data: profile } = useProfile();
  const { data: accounts } = useAccounts();
  const { data: incomes } = useIncomes({});
  const { data: cards } = useCreditCards();

  const tasks: ProfileTask[] = [
    {
      id: 'name',
      label: 'Adicionar seu nome',
      done: !!profile?.display_name && profile.display_name !== profile?.id?.slice(0, 8),
      href: '/profile',
    },
    {
      id: 'income',
      label: 'Registrar sua renda mensal',
      done: (incomes?.filter(i => i.recurrent && i.category === 'salario').length ?? 0) > 0,
      href: '/income',
    },
    {
      id: 'account',
      label: 'Cadastrar uma conta bancária',
      done: (accounts?.length ?? 0) > 0,
      href: '/accounts',
    },
    {
      id: 'card',
      label: 'Adicionar um cartão de crédito',
      done: (cards?.length ?? 0) > 0,
      href: '/credit-cards',
    },
  ];

  const pending = tasks.filter(t => !t.done);
  const completed = tasks.filter(t => t.done);
  const percent = Math.round((completed.length / tasks.length) * 100);
  const allDone = pending.length === 0;

  return { tasks, pending, completed, percent, allDone };
}
