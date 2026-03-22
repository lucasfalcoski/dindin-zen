import { formatBRL } from '@/lib/format';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
  valueClassName?: string;
  formatFn?: (value: number) => string;
}

export function SummaryCard({ label, value, icon, valueClassName, formatFn }: SummaryCardProps) {
  return (
    <div className="card-surface p-5 animate-fade-in">
      {/* Label + ícone — igual .card-label do protótipo */}
      <div className="flex items-center justify-between mb-2">
        <span className="label-caps">{label}</span>
        {icon && <span className="opacity-50">{icon}</span>}
      </div>

      {/* Valor — Instrument Serif 28px, igual .card-value do protótipo */}
      <p
        className={cn('text-foreground leading-none', valueClassName)}
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: '28px',
          letterSpacing: '-0.5px',
          lineHeight: 1,
        }}
      >
        {formatFn ? formatFn(value) : formatBRL(value)}
      </p>
    </div>
  );
}
