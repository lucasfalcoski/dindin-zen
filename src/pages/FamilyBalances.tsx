import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useView } from '@/contexts/ViewContext';
import { useExpenses } from '@/hooks/useExpenses';
import { useSettlements, useCreateSettlement } from '@/hooks/useSettlements';
import { useFamilyProfiles, Profile } from '@/hooks/useProfiles';
import { formatBRL } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight } from 'lucide-react';
import { EmojiAvatar } from '@/components/EmojiAvatar';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface Balance {
  fromId: string;
  toId: string;
  amount: number;
}

export default function FamilyBalances() {
  const { user } = useAuth();
  const { familyId, familyMembers } = useView();
  const { toast } = useToast();
  const createSettlement = useCreateSettlement();

  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const memberUserIds = useMemo(() =>
    familyMembers.filter(m => m.user_id).map(m => m.user_id!),
    [familyMembers]
  );
  const { data: profiles } = useFamilyProfiles(memberUserIds);
  const { data: expenses } = useExpenses({ startDate: monthStart, endDate: monthEnd });
  const { data: settlements } = useSettlements(familyId);

  const profileMap = useMemo(() => {
    const map: Record<string, Profile> = {};
    profiles?.forEach(p => { map[p.id] = p; });
    return map;
  }, [profiles]);

  const getName = (userId: string) => {
    if (userId === user?.id) return 'Você';
    return profileMap[userId]?.display_name || 'Membro';
  };

  // Calculate net balances from split expenses
  const balances = useMemo(() => {
    if (!expenses || !familyMembers.length) return [];

    // Find split expenses (those with split_group_id and visibility=family)
    const splitGroups: Record<string, typeof expenses> = {};
    expenses.forEach(e => {
      const sgid = (e as any).split_group_id;
      if (sgid) {
        if (!splitGroups[sgid]) splitGroups[sgid] = [];
        splitGroups[sgid].push(e);
      }
    });

    // For each split group, the original payer paid for others
    // Net amounts: who owes who
    const netMap: Record<string, number> = {}; // "fromId->toId" => amount

    Object.values(splitGroups).forEach(group => {
      if (group.length < 2) return;
      // Find the "original" - first one created or the one who created them
      // All share same split_group_id; each has user_id = the person it's assigned to
      // The person who CREATED the expense is the payer
      // Others owe their share to the payer
      const sorted = [...group].sort((a, b) => a.created_at.localeCompare(b.created_at));
      const payerId = sorted[0].user_id; // creator/payer

      sorted.forEach(e => {
        if (e.user_id !== payerId) {
          const key = `${e.user_id}->${payerId}`;
          netMap[key] = (netMap[key] || 0) + Number(e.amount);
        }
      });
    });

    // Subtract settlements from this month
    const monthSettlements = (settlements || []).filter(s => s.settled_at >= monthStart);
    monthSettlements.forEach(s => {
      const key = `${s.from_user_id}->${s.to_user_id}`;
      netMap[key] = (netMap[key] || 0) - Number(s.amount);
    });

    // Simplify: net out bidirectional debts
    const result: Balance[] = [];
    const processed = new Set<string>();

    Object.entries(netMap).forEach(([key, amount]) => {
      if (processed.has(key) || amount <= 0.01) return;
      const [fromId, toId] = key.split('->');
      const reverseKey = `${toId}->${fromId}`;
      const reverseAmount = netMap[reverseKey] || 0;
      processed.add(key);
      processed.add(reverseKey);

      const net = amount - reverseAmount;
      if (Math.abs(net) > 0.01) {
        if (net > 0) {
          result.push({ fromId, toId, amount: net });
        } else {
          result.push({ fromId: toId, toId: fromId, amount: Math.abs(net) });
        }
      }
    });

    return result;
  }, [expenses, settlements, familyMembers, monthStart]);

  const handleSettle = async (balance: Balance) => {
    if (!familyId) return;
    try {
      await createSettlement.mutateAsync({
        family_id: familyId,
        from_user_id: balance.fromId,
        to_user_id: balance.toId,
        amount: balance.amount,
      });
      toast({ title: 'Pagamento registrado!' });
    } catch {
      toast({ title: 'Erro ao registrar pagamento', variant: 'destructive' });
    }
  };

  if (!familyId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Saldos da Família</h1>
        <div className="card-surface p-8 text-center">
          <p className="text-sm text-muted-foreground">Você precisa fazer parte de uma família para ver os saldos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Quem deve pra quem</h1>
      <p className="text-sm text-muted-foreground">Saldos baseados nas despesas divididas do mês atual</p>

      <div className="card-surface divide-y divide-border/50">
        {balances.length > 0 ? (
          balances.map((b, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
                  {getName(b.fromId)[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-foreground truncate">{getName(b.fromId)}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
                  {getName(b.toId)[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-foreground truncate">{getName(b.toId)}</span>
              </div>
              <span className="currency text-sm font-semibold text-destructive">{formatBRL(b.amount)}</span>
              {(b.fromId === user?.id || b.toId === user?.id) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => handleSettle(b)}
                  disabled={createSettlement.isPending}
                >
                  <Check className="h-3 w-3" />
                  Pago
                </Button>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground p-8 text-center">
            Nenhum saldo pendente. Divida despesas para ver quem deve pra quem.
          </p>
        )}
      </div>
    </div>
  );
}
