import { useView } from '@/contexts/ViewContext';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, Users, User } from 'lucide-react';

export function ViewSelector() {
  const { viewMode, setView, hasFamily, familyMembers, selectedMemberId } = useView();
  const { user } = useAuth();

  if (!hasFamily) return null;

  const otherMembers = familyMembers.filter(m => m.user_id !== user?.id);

  return (
    <div className="relative group">
      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-accent text-muted-foreground hover:text-foreground transition-colors">
        {viewMode === 'personal' && <><Eye className="h-3.5 w-3.5" /> Minha visão</>}
        {viewMode === 'family' && <><Users className="h-3.5 w-3.5" /> Família</>}
        {viewMode === 'member' && <><User className="h-3.5 w-3.5" /> Membro</>}
      </button>
      <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
        <div className="p-1">
          <button
            onClick={() => setView('personal')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              viewMode === 'personal' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-accent'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Minha visão
          </button>
          <button
            onClick={() => setView('family')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              viewMode === 'family' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-accent'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Visão familiar
          </button>
          {otherMembers.length > 0 && (
            <>
              <div className="border-t border-border my-1" />
              <p className="px-3 py-1 text-[10px] text-muted-foreground uppercase tracking-wider">Membros</p>
              {otherMembers.map(m => (
                <button
                  key={m.user_id}
                  onClick={() => setView('member', m.user_id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    viewMode === 'member' && selectedMemberId === m.user_id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  {m.invited_email?.split('@')[0] || 'Membro'}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
