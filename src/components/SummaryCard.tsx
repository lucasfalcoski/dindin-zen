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
  const formatted = formatFn ? formatFn(value) : formatBRL(value);
  const isLong = formatted.length > 10;
  return (
    <div className="card-surface p-4 md:p-5 animate-fade-in overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="label-caps truncate">{label}</span>
        {icon}
      </div>
      <p className={cn('currency text-foreground truncate tabular-nums', isLong ? 'text-lg md:text-2xl' : 'text-xl md:text-2xl', valueClassName)}>
        {formatted}
      </p>
    </div>
  );
}
