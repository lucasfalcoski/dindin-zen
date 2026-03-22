import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ViewSelector } from '@/components/ViewSelector';
import { GlobalSearch } from '@/components/GlobalSearch';
import { QuickAddFAB } from '@/components/QuickAddFAB';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationAlerts } from '@/components/NotificationAlerts';
import {
  LayoutDashboard, Receipt, FolderOpen, BarChart3, LogOut,
  DollarSign, Building2, CreditCard, Target, Users, Search,
  Tag, Gauge, Goal, TrendingUp, X, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/expenses': 'Despesas',
  '/income': 'Receitas',
  '/accounts': 'Contas',
  '/credit-cards': 'Cartões',
  '/groups': 'Grupos',
  '/tags': 'Tags',
  '/budget': 'Orçamento',
  '/score': 'Score',
  '/goals': 'Metas',
  '/forecast': 'Projeção',
  '/family': 'Família',
  '/reports': 'Relatórios',
};

// Grupos de links para separadores visuais no rail
const railGroups = [
  links.slice(0, 5),   // Dashboard → Cartões
  links.slice(5, 11),  // Grupos → Projeção
  links.slice(11),     // Família → Relatórios
];

// Links do drawer mobile "Mais"
const moreLinks = [
  { to: '/income', label: 'Receitas', icon: DollarSign },
  { to: '/accounts', label: 'Contas', icon: Building2 },
  { to: '/credit-cards', label: 'Cartões', icon: CreditCard },
  { to: '/groups', label: 'Grupos', icon: FolderOpen },
  { to: '/tags', label: 'Tags', icon: Tag },
  { to: '/budget', label: 'Orçamento', icon: Target },
  { to: '/score', label: 'Score', icon: Gauge },
  { to: '/goals', label: 'Metas', icon: Goal },
  { to: '/forecast', label: 'Projeção', icon: TrendingUp },
  { to: '/reports', label: 'Relatórios', icon: BarChart3 },
];

// Ícone logo Din-Din Zen
function DinDinLogo({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none">
      <text
        x="16" y="21"
        textAnchor="middle"
        style={{ fontFamily: 'sans-serif', fontSize: '15px', fontWeight: 900, fill: '#1a7a45' }}
      >
        $
      </text>
      <rect x="7" y="25" width="18" height="2" rx="1" fill="#1a7a45" opacity="0.5" />
      <rect x="10" y="28" width="12" height="1.5" rx="0.75" fill="#1a7a45" opacity="0.25" />
    </svg>
  );
}

function DinDinLogoWhite({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none">
      <text
        x="16" y="21"
        textAnchor="middle"
        style={{ fontFamily: 'sans-serif', fontSize: '15px', fontWeight: 900, fill: 'white' }}
      >
        $
      </text>
      <rect x="7" y="25" width="18" height="2" rx="1" fill="white" opacity="0.4" />
      <rect x="10" y="28" width="12" height="1.5" rx="0.75" fill="white" opacity="0.2" />
    </svg>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const pageTitle = routeTitles[location.pathname] ?? 'Din-Din Zen';

  // Fechar drawer ao navegar
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Atalhos de teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        navigate('/expenses?new=1');
      }
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ══════════════════════════════════════════
          SIDEBAR RAIL — desktop only
          Fundo escuro (#16150f), 64px largura fixa
      ══════════════════════════════════════════ */}
      <aside
        className="hidden md:flex w-16 min-w-[64px] flex-col items-center py-4 gap-0.5 flex-shrink-0 z-50"
        style={{ background: '#16150f' }}
      >
        {/* Logo */}
        <div
          className="w-9 h-9 rounded-[11px] flex items-center justify-center mb-5 cursor-pointer flex-shrink-0 transition-opacity hover:opacity-80"
          style={{ background: '#1a7a45' }}
          onClick={() => navigate('/')}
          title="Din-Din Zen"
        >
          <DinDinLogoWhite size={20} />
        </div>

        {/* Nav por grupos com separadores */}
        {railGroups.map((group, gi) => (
          <div key={gi} className="flex flex-col items-center gap-0.5 w-full">
            {gi > 0 && (
              <div
                className="w-6 h-px my-1.5 flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.10)' }}
              />
            )}
            {group.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                title={l.label}
                className={({ isActive }) =>
                  cn(
                    'relative w-10 h-10 rounded-[10px] flex items-center justify-center transition-all duration-150 flex-shrink-0',
                    isActive
                      ? 'text-white'
                      : 'text-white/35 hover:text-white/70'
                  )
                }
                style={({ isActive }) => ({
                  background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                })}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        className="absolute left-0 rounded-r-sm"
                        style={{
                          top: '20%', bottom: '20%',
                          width: '2px',
                          background: '#1a7a45',
                        }}
                      />
                    )}
                    <l.icon className="h-4 w-4" />
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Bottom: theme + sair */}
        <div className="mt-auto flex flex-col items-center gap-2">
          <button
            onClick={handleSignOut}
            title="Sair"
            className="w-10 h-10 rounded-[10px] flex items-center justify-center transition-all duration-150 text-white/35 hover:text-white/70"
            style={{ background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          SHELL — topbar + conteúdo + mobile nav
      ══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* ── TOP BAR DESKTOP ── */}
        <header
          className="hidden md:flex h-[52px] items-center px-7 gap-4 flex-shrink-0 border-b"
          style={{ background: '#faf9f7', borderColor: '#e4e1da' }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#6b6a63' }}>
            <span>Din-Din Zen</span>
            <span style={{ color: '#ccc9c0' }}>/</span>
            <strong style={{ color: '#16150f', fontWeight: 700 }}>{pageTitle}</strong>
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors border"
              style={{
                color: '#6b6a63',
                borderColor: '#ccc9c0',
                background: 'none',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = '#16150f';
                (e.currentTarget as HTMLElement).style.borderColor = '#6b6a63';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = '#6b6a63';
                (e.currentTarget as HTMLElement).style.borderColor = '#ccc9c0';
              }}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Buscar</span>
              <kbd
                className="hidden lg:inline-flex h-4 items-center px-1.5 rounded text-[10px]"
                style={{ border: '1px solid #ccc9c0', background: '#f2f0eb', color: '#b0aea6' }}
              >
                ⌘K
              </kbd>
            </button>
            <ThemeToggle />
            <ViewSelector />
            <span className="text-xs truncate max-w-[160px]" style={{ color: '#b0aea6' }}>
              {user?.email}
            </span>
          </div>
        </header>

        {/* ── TOP BAR MOBILE ── */}
        <div
          className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 flex-shrink-0"
          style={{ height: '48px', background: '#f2f0eb', borderBottom: '1px solid #e4e1da' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0"
              style={{ background: '#16150f' }}
            >
              <DinDinLogo size={16} />
            </div>
            <span className="text-sm font-extrabold tracking-tight" style={{ color: '#16150f' }}>
              Din-Din <span style={{ color: '#1a7a45' }}>Zen</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: '#6b6a63' }}
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-9 md:py-8 pb-24 md:pb-8">
          {children}
        </main>

        {/* ── BOTTOM NAV MOBILE ── */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t"
          style={{ background: '#ffffff', borderColor: '#e4e1da', height: '64px' }}
        >
          <div className="flex items-center justify-around h-full px-2">

            {/* Dashboard */}
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground')
              }
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Início</span>
            </NavLink>

            {/* Despesas */}
            <NavLink
              to="/expenses"
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground')
              }
            >
              <Receipt className="h-5 w-5" />
              <span>Despesas</span>
            </NavLink>

            {/* FAB central */}
            <button
              onClick={() => navigate('/expenses?new=1')}
              className="flex flex-col items-center gap-1 flex-shrink-0"
              style={{ marginTop: '-20px' }}
            >
              <div
                className="w-14 h-14 rounded-[18px] flex items-center justify-center shadow-lg transition-transform active:scale-95"
                style={{ background: '#16150f' }}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="#1a7a45" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-[10px] font-semibold" style={{ color: '#6b6a63' }}>Lançar</span>
            </button>

            {/* Família */}
            <NavLink
              to="/family"
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground')
              }
            >
              <Users className="h-5 w-5" />
              <span>Família</span>
            </NavLink>

            {/* Mais */}
            <button
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold text-muted-foreground"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <circle cx="5" cy="12" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="19" cy="12" r="1.5" fill="currentColor" />
              </svg>
              <span>Mais</span>
            </button>

          </div>
        </nav>

        {/* ── DRAWER MAIS (mobile) ── */}
        {moreOpen && (
          <>
            {/* Backdrop */}
            <div
              className="md:hidden fixed inset-0 z-[60]"
              style={{ background: 'rgba(22,21,15,0.45)' }}
              onClick={() => setMoreOpen(false)}
            />
            {/* Sheet */}
            <div
              className="md:hidden fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl overflow-hidden"
              style={{ background: '#faf9f7', maxHeight: '80vh' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: '#ccc9c0' }} />
              </div>

              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: '#e4e1da' }}
              >
                <span className="text-sm font-bold" style={{ color: '#16150f' }}>Menu</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-1.5 rounded-lg"
                  style={{ color: '#6b6a63' }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Links */}
              <div className="overflow-y-auto pb-8" style={{ maxHeight: 'calc(80vh - 80px)' }}>
                <div className="px-4 py-2">
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest px-2 py-2"
                    style={{ color: '#b0aea6' }}
                  >
                    Navegação
                  </p>
                  {moreLinks.map((l) => (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-accent'
                        )
                      }
                    >
                      <l.icon className="h-4 w-4 flex-shrink-0" />
                      {l.label}
                      <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-30" />
                    </NavLink>
                  ))}
                </div>

                {/* Minha conta */}
                <div className="px-4 py-2 border-t" style={{ borderColor: '#e4e1da' }}>
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest px-2 py-2"
                    style={{ color: '#b0aea6' }}
                  >
                    Minha conta
                  </p>
                  <button
                    onClick={() => { navigate('/profile'); setMoreOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-foreground hover:bg-accent transition-colors"
                  >
                    <span className="text-base">👤</span>
                    Perfil
                    <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-30" />
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors"
                    style={{ color: '#b83232' }}
                  >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

      </div>

      {/* ── GLOBAIS ── */}
      <QuickAddFAB />
      <NotificationAlerts />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
