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
      <div className="flex items-center justify-between mb-2">
        <span className="label-caps">{label}</span>
        {icon}
      </div>
      <p className={cn('currency text-2xl text-foreground', valueClassName)}>
        {formatFn ? formatFn(value) : formatBRL(value)}
      </p>
    </div>
  );
}
