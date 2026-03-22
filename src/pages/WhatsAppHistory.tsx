import { useState } from 'react';
import { useWhatsAppTransactions, WhatsAppTransaction } from '@/hooks/useWhatsAppTransactions';
import { formatBRL } from '@/lib/format';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MessageCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_CONFIG: Record<string, { label: string; icon: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', icon: '🟡', variant: 'secondary' },
  confirmed: { label: 'Confirmado', icon: '✅', variant: 'default' },
  rejected: { label: 'Rejeitado', icon: '❌', variant: 'destructive' },
  error: { label: 'Erro', icon: '⚠️', variant: 'destructive' },
};

const TABS = [
  { value: 'all', label: 'Todos' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'rejected', label: 'Rejeitados' },
];

function TransactionCard({ tx }: { tx: WhatsAppTransaction }) {
  const status = STATUS_CONFIG[tx.status] || STATUS_CONFIG.error;
  const relTime = formatDistanceToNow(new Date(tx.created_at), { addSuffix: true, locale: ptBR });

  return (
    <div className="card-surface p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{tx.parsed_type === 'income' ? '💰' : '💸'}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {tx.parsed_description || 'Sem descrição'}
            </p>
            {tx.parsed_amount != null && (
              <p className="currency text-sm font-semibold text-foreground">
                {formatBRL(tx.parsed_amount)}
              </p>
            )}
          </div>
        </div>
        <Badge variant={status.variant} className="shrink-0 text-xs">
          {status.icon} {status.label}
        </Badge>
      </div>

      <div className="bg-muted/50 rounded-md p-2">
        <p className="text-xs text-muted-foreground italic truncate">"{tx.raw_message}"</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{relTime}</span>
        {tx.status === 'confirmed' && (tx.expense_id || tx.income_id) && (
          <Link
            to={tx.expense_id ? '/expenses' : '/income'}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Ver registro <ExternalLink className="h-3 w-3" />
          </Link>
        )}
        {tx.status === 'error' && tx.error_message && (
          <span className="text-xs text-destructive truncate max-w-[200px]">{tx.error_message}</span>
        )}
      </div>
    </div>
  );
}

export default function WhatsAppHistory() {
  const [tab, setTab] = useState('all');
  const { data: transactions, isLoading, refetch, isFetching } = useWhatsAppTransactions(tab);

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-[#25D366]" />
          Histórico WhatsApp
        </h1>
        <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-colors ${
              tab === t.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card-surface p-4 h-24 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : !transactions?.length ? (
        <div className="card-surface p-8 text-center">
          <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {tab === 'all'
              ? 'Nenhuma transação via WhatsApp ainda.'
              : `Nenhuma transação ${TABS.find(t => t.value === tab)?.label.toLowerCase()}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map(tx => (
            <TransactionCard key={tx.id} tx={tx} />
          ))}
        </div>
      )}
    </div>
  );
}
