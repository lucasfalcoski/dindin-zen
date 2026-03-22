import { formatBRL } from '@/lib/format';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
  valueClassName?: string;
  formatFn?: (value: number) => string;
  dotColor?: string;
  meta?: string;
  showMiniBar?: boolean;
  barData?: number[];
  barColor?: string;
  showProgress?: boolean;
  progressValue?: number;
  progressColor?: string;
}

export function SummaryCard({
  label, value, icon, valueClassName, formatFn,
  dotColor, meta, showMiniBar, barData, barColor,
  showProgress, progressValue, progressColor,
}: SummaryCardProps) {
  const maxBar = barData ? Math.max(...barData, 1) : 1;

  return (
    <div className="card-surface p-5 animate-fade-in">
      {/* Label */}
      <div className="flex items-center gap-1.5 mb-2">
        {dotColor && (
          <span
            className="inline-block flex-shrink-0 rounded-full"
            style={{ width: '7px', height: '7px', background: dotColor }}
          />
        )}
        <span className="label-caps">{label}</span>
        {icon && !dotColor && <span className="ml-auto opacity-50">{icon}</span>}
      </div>

      {/* Valor */}
      <p
        className={cn('leading-none', valueClassName)}
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: '28px',
          letterSpacing: '-0.5px',
          lineHeight: 1,
        }}
      >
        {formatFn ? formatFn(value) : formatBRL(value)}
      </p>

      {/* Mini barra */}
      {showMiniBar && barData && (
        <div className="flex items-end gap-[3px] h-8 mt-2.5">
          {barData.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${(v / maxBar) * 100}%`,
                minHeight: '2px',
                background: i === barData.length - 1
                  ? (barColor || 'hsl(var(--primary))')
                  : (barColor ? barColor + '33' : 'hsl(var(--primary) / 0.2)'),
              }}
            />
          ))}
        </div>
      )}

      {/* Mini progress */}
      {showProgress && progressValue !== undefined && (
        <div className="h-[3px] bg-background rounded-full overflow-hidden mt-2.5">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(progressValue, 100)}%`,
              background: progressColor || 'hsl(var(--primary))',
            }}
          />
        </div>
      )}

      {/* Meta info */}
      {meta && (
        <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border font-medium">
          {meta}
        </p>
      )}
    </div>
  );
}
