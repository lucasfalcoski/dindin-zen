import { useAccounts } from '@/hooks/useAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Users } from 'lucide-react';

export function FamilySharingSettings() {
  const { data: accounts } = useAccounts();
  const { data: creditCards } = useCreditCards();
  const qc = useQueryClient();
  const { toast } = useToast();

  const toggleAccount = async (id: string, shared: boolean) => {
    const { error } = await supabase
      .from('accounts')
      .update({ shared_with_family: shared } as any)
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['accounts'] });
    qc.invalidateQueries({ queryKey: ['family_shared_accounts'] });
    toast({ title: shared ? 'Conta compartilhada com a família' : 'Compartilhamento removido' });
  };

  const toggleCard = async (id: string, shared: boolean) => {
    const { error } = await supabase
      .from('credit_cards')
      .update({ shared_with_family: shared } as any)
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['credit_cards'] });
    qc.invalidateQueries({ queryKey: ['family_shared_cards'] });
    toast({ title: shared ? 'Cartão compartilhado com a família' : 'Compartilhamento removido' });
  };

  const hasItems = (accounts && accounts.length > 0) || (creditCards && creditCards.length > 0);

  if (!hasItems) {
    return (
      <div className="card-surface p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="label-caps">Compartilhamento com a família</h2>
        </div>
        <p className="text-sm text-muted-foreground">Cadastre contas ou cartões para compartilhar.</p>
      </div>
    );
  }

  return (
    <div className="card-surface p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h2 className="label-caps">Compartilhamento com a família</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Contas e cartões compartilhados ficam visíveis para membros da família no formulário de despesas.
      </p>

      {accounts && accounts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contas</p>
          {accounts.map(a => (
            <div key={a.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">{a.name}</span>
                {(a as any).shared_with_family && (
                  <span className="text-xs">👨‍👩‍👧</span>
                )}
              </div>
              <Switch
                checked={!!(a as any).shared_with_family}
                onCheckedChange={(v) => toggleAccount(a.id, v)}
              />
            </div>
          ))}
        </div>
      )}

      {creditCards && creditCards.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cartões</p>
          {creditCards.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                {(c as any).shared_with_family && (
                  <span className="text-xs">👨‍👩‍👧</span>
                )}
              </div>
              <Switch
                checked={!!(c as any).shared_with_family}
                onCheckedChange={(v) => toggleCard(c.id, v)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
