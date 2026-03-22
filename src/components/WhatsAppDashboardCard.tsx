import { Link } from 'react-router-dom';
import { MessageCircle, ChevronRight, Zap } from 'lucide-react';
import { useWhatsAppUser } from '@/hooks/useWhatsApp';
import { useWhatsAppTransactions } from '@/hooks/useWhatsAppTransactions';
import { formatBRL } from '@/lib/format';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

export function WhatsAppDashboardCard() {
  const { data: whatsappUser, isLoading } = useWhatsAppUser();
  const { data: transactions } = useWhatsAppTransactions('confirmed');

  if (isLoading) return null;

  const lastTx = transactions?.[0];

  if (!whatsappUser) {
    return (
      <div className="card-surface p-5 space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[#25D366]" />
          <h2 className="label-caps">WhatsApp</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Registre despesas e receitas enviando uma mensagem no WhatsApp.
        </p>
        <Link to="/profile" state={{ scrollTo: 'whatsapp' }}>
          <Button size="sm" className="gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white">
            <Zap className="h-3.5 w-3.5" />
            Conectar WhatsApp
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="card-surface p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[#25D366]" />
          <h2 className="label-caps">WhatsApp</h2>
        </div>
        <span className="text-xs text-[#25D366] font-medium">✅ Conectado</span>
      </div>
      {lastTx ? (
        <div className="text-sm text-muted-foreground">
          <p>Última transação: <span className="text-foreground font-medium">{lastTx.parsed_description}</span></p>
          {lastTx.parsed_amount != null && (
            <p className="currency text-foreground">{formatBRL(lastTx.parsed_amount)}</p>
          )}
          <p className="text-xs mt-1">
            {formatDistanceToNow(new Date(lastTx.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma transação via WhatsApp ainda.</p>
      )}
      <Link to="/whatsapp-history" className="text-sm text-primary hover:underline flex items-center gap-1">
        Ver histórico <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
