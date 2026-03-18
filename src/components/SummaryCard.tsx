import { formatBRL } from '@/lib/format';

interface SummaryCardProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
}

export function SummaryCard({ label, value, icon }: SummaryCardProps) {
  return (
    <div className="card-surface p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="label-caps">{label}</span>
        {icon}
      </div>
      <p className="currency text-2xl text-foreground">{formatBRL(value)}</p>
    </div>
  );
}
