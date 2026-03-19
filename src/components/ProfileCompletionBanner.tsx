import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { X, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export function ProfileCompletionBanner() {
  const { user } = useAuth();
  const { tasks, pending, percent, allDone } = useProfileCompletion();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(`profile_banner_dismissed_${user?.id}`) === 'true'
  );

  if (allDone || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(`profile_banner_dismissed_${user?.id}`, 'true');
    setDismissed(true);
  };

  return (
    <div className="card-surface p-4 md:p-5 relative animate-fade-in">
      {/* Botão fechar */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3 pr-6">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
          👤
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Complete seu perfil — {percent}%
          </p>
          <p className="text-xs text-muted-foreground">
            {pending.length} {pending.length === 1 ? 'item pendente' : 'itens pendentes'}
          </p>
        </div>
      </div>

      {/* Barra de progresso */}
      <Progress value={percent} className="h-1.5 mb-3" />

      {/* Lista de tarefas */}
      <div className="space-y-0.5">
        {tasks.map(task => (
          <button
            key={task.id}
            onClick={() => !task.done && navigate(task.href)}
            disabled={task.done}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
              task.done
                ? 'opacity-50 cursor-default'
                : 'hover:bg-primary/10 cursor-pointer'
            )}
          >
            {task.done
              ? <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
              : <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            }
            <span className={cn('flex-1 truncate', task.done && 'line-through text-muted-foreground')}>
              {task.label}
            </span>
            {!task.done && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}
