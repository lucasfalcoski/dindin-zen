import { useState, useEffect } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfiles';
import { ViewSelector } from '@/components/ViewSelector';
import { GlobalSearch } from '@/components/GlobalSearch';
import { QuickAddFAB } from '@/components/QuickAddFAB';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationAlerts } from '@/components/NotificationAlerts';
import { LayoutDashboard, Receipt, FolderOpen, BarChart3, LogOut, DollarSign, Building2, CreditCard, Target, Users, Search, Tag, Gauge, Goal, TrendingUp, MoreHorizontal, X, User, HelpCircle } from 'lucide-react';
import { EmojiAvatar } from '@/components/EmojiAvatar';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HelpGuide } from '@/components/HelpGuide';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/expenses', label: 'Despesas', icon: Receipt },
  { to: '/income', label: 'Receitas', icon: DollarSign },
  { to: '/accounts', label: 'Contas', icon: Building2 },
  { to: '/credit-cards', label: 'Cartões', icon: CreditCard },
  { to: '/groups', label: 'Grupos', icon: FolderOpen },
  { to: '/tags', label: 'Tags', icon: Tag },
  { to: '/budget', label: 'Orçamento', icon: Target },
  { to: '/score', label: 'Score', icon: Gauge },
  { to: '/goals', label: 'Metas', icon: Goal },
  { to: '/forecast', label: 'Projeção', icon: TrendingUp },
  { to: '/family', label: 'Família', icon: Users },
  { to: '/reports', label: 'Relatórios', icon: BarChart3 },
];

const DindinLogo = () => (
  <svg viewBox="0 0 100 100" width="28" height="28" fill="none" className="shrink-0">
    <circle cx="50" cy="54" r="30" stroke="hsl(var(--accent))" strokeWidth="2" opacity="0.7"/>
    <line x1="50" y1="34" x2="50" y2="74" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M42 42 Q50 37 58 42" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <path d="M42 54 Q50 49 58 54" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <path d="M42 66 Q50 71 58 66" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <path d="M50 24 C50 24 38 14 30 8 C38 8 54 10 58 24 C60 30 58 38 50 42 C42 38 40 30 42 24 C44 18 50 16 50 24Z" fill="url(#lf)"/>
    <circle cx="50" cy="23" r="2.5" fill="hsl(var(--secondary))"/>
    <defs>
      <linearGradient id="lf" x1="30" y1="8" x2="58" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="hsl(var(--secondary))"/>
        <stop offset="100%" stopColor="hsl(var(--primary))"/>
      </linearGradient>
    </defs>
  </svg>
);

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Cmd+K / Ctrl+K shortcut + N for new expense
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'n' || e.key === 'N') {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          navigate('/expenses?new=1');
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);

  // Listen for help guide event from OnboardingWizard
  useEffect(() => {
    const handler = () => setHelpOpen(true);
    window.addEventListener('open-help-guide', handler);
    return () => window.removeEventListener('open-help-guide', handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const mobileMainLinks = links.slice(0, 4);
  const mobileMoreLinks = links.slice(4);

  return (
    <div className="flex flex-col h-dvh bg-background transition-colors duration-300">
      {/* Top nav for desktop */}
      <header className="hidden md:block border-b border-border bg-card flex-shrink-0 z-50">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 mr-4 shrink-0">
              <DindinLogo />
              <span className="text-lg font-semibold tracking-tight text-foreground font-brand">Din-din Zen</span>
            </div>
            <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide min-w-0">
              {links.map(l => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )
                  }
                >
                  <l.icon className="h-3.5 w-3.5" />
                  {l.label}
                </NavLink>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-border"
            >
              <Search className="h-3.5 w-3.5" />
              <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">⌘K</kbd>
            </button>
            <button
              onClick={() => setHelpOpen(true)}
              title="Ajuda"
              className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <ThemeToggle />
            <ViewSelector />
            <Link to="/profile" className="text-xs text-muted-foreground hidden xl:inline truncate max-w-[120px] hover:text-foreground transition-colors">
              {profile?.display_name || user?.email?.split('@')[0]}
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 pb-28 md:pb-6">
          {children}
        </div>
      </main>

      {/* Bottom nav for mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 flex-shrink-0">
        <div className="flex items-center justify-around h-16">
          {mobileMainLinks.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors duration-150',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              <l.icon className="h-5 w-5" />
              {l.label}
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium text-muted-foreground"
          >
            <MoreHorizontal className="h-5 w-5" />
            Mais
          </button>
        </div>
      </nav>

      {/* Mobile "Mais" drawer */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[70vh] overflow-y-auto">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base">Menu</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 pt-2">
            {mobileMoreLinks.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-colors',
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
                  )
                }
              >
                <l.icon className="h-5 w-5" />
                {l.label}
              </NavLink>
            ))}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium text-muted-foreground hover:bg-accent"
            >
              <Search className="h-5 w-5" />
              Buscar
            </button>
          </div>
          <div className="border-t border-border mt-4 pt-4 space-y-1">
            <NavLink
              to="/profile"
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm transition-colors',
                  isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )
              }
            >
              <User className="h-4 w-4" />
              Meu Perfil
            </NavLink>
            <button
              onClick={() => { setHelpOpen(true); setMoreOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              Ajuda
            </button>
            <button
              onClick={() => { handleSignOut(); setMoreOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <QuickAddFAB />
      <NotificationAlerts />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <HelpGuide open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
