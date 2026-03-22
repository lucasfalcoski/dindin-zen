import { usePendingWhatsAppTransactions } from '@/hooks/useWhatsAppTransactions';
import { formatBRL } from '@/lib/format';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export function WhatsAppPendingBanner() {
  const { data: pending } = usePendingWhatsAppTransactions();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = pending?.filter(t => !dismissed.has(t.id)) || [];
  if (!visible.length) return null;

  const tx = visible[0];
  const relTime = formatDistanceToNow(new Date(tx.created_at), { addSuffix: true, locale: ptBR });

  return (
    <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl p-4 flex items-start gap-3">
      <MessageCircle className="h-5 w-5 text-[#25D366] shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm text-foreground">
          📱 Você tem uma movimentação pendente via WhatsApp:{' '}
          <span className="font-semibold">{tx.parsed_description || 'sem descrição'}</span>{' '}
          {tx.parsed_amount != null && (
            <span className="currency font-semibold">{formatBRL(tx.parsed_amount)}</span>
          )}
          . Confirme no WhatsApp respondendo <strong>sim</strong>.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">{relTime}</span>
          <Link to="/whatsapp-history" className="text-xs text-primary hover:underline">
            Ver histórico
          </Link>
        </div>
      </div>
      <button
        onClick={() => setDismissed(prev => new Set(prev).add(tx.id))}
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
