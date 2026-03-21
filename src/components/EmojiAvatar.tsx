import { cn } from '@/lib/utils';

const EMOJI_OPTIONS = ['🦊', '🐼', '🦁', '🐸', '🦋', '🌟', '⚡', '🎯', '🚀', '🎸', '🌈', '🦄', '🐉', '🎩', '🦅'];

export function getDefaultEmoji(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return EMOJI_OPTIONS[Math.abs(hash) % EMOJI_OPTIONS.length];
}

interface EmojiAvatarProps {
  emoji?: string | null;
  color?: string;
  userId?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-base',
  md: 'h-10 w-10 text-xl',
  lg: 'h-16 w-16 text-3xl',
};

export function EmojiAvatar({ emoji, color = '#3b82f6', userId, size = 'md', className }: EmojiAvatarProps) {
  const displayEmoji = emoji || (userId ? getDefaultEmoji(userId) : '🌟');

  return (
    <div
      className={cn('rounded-full flex items-center justify-center shrink-0', sizeClasses[size], className)}
      style={{ backgroundColor: color }}
    >
      {displayEmoji}
    </div>
  );
}

interface EmojiPickerProps {
  value?: string | null;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {EMOJI_OPTIONS.map(e => (
        <button
          key={e}
          type="button"
          onClick={() => onChange(e)}
          className={cn(
            'h-12 w-12 rounded-xl text-2xl flex items-center justify-center transition-all',
            value === e
              ? 'bg-primary/20 ring-2 ring-primary scale-110'
              : 'bg-muted hover:bg-accent hover:scale-105'
          )}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

export { EMOJI_OPTIONS };
