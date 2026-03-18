interface GroupBadgeProps {
  name: string;
  color: string;
  icon: string;
  size?: 'sm' | 'md';
}

export function GroupBadge({ name, color, icon, size = 'sm' }: GroupBadgeProps) {
  const sizeClass = size === 'md' ? 'h-8 w-8 text-base' : 'h-6 w-6 text-xs';
  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClass} rounded-lg flex items-center justify-center flex-shrink-0`}
        style={{ backgroundColor: color + '20' }}
      >
        {icon}
      </div>
      <span className="text-sm font-medium text-foreground truncate">{name}</span>
    </div>
  );
}
