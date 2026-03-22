import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ViewSelector } from '@/components/ViewSelector';
import { GlobalSearch } from '@/components/GlobalSearch';
import { QuickAddFAB } from '@/components/QuickAddFAB';
import { NotificationAlerts } from '@/components/NotificationAlerts';
import {
  LayoutDashboard, Receipt, DollarSign, Building2, CreditCard,
  FolderOpen, Tag, Target, Gauge, Goal, TrendingUp, Users, BarChart3,
  LogOut, Settings, Plus, Search,
} from 'lucide-react';

// ── GRUPOS DE LINKS ──
const NAV_GROUPS = [
  {
    links: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Transações',
    links: [
      { to: '/expenses', label: 'Despesas', icon: Receipt },
      { to: '/income', label: 'Receitas', icon: DollarSign },
    ],
  },
  {
    label: 'Contas',
    links: [
      { to: '/accounts', label: 'Contas', icon: Building2 },
      { to: '/credit-cards', label: 'Cartões', icon: CreditCard },
    ],
  },
  {
    label: 'Organização',
    links: [
      { to: '/groups', label: 'Grupos', icon: FolderOpen },
      { to: '/tags', label: 'Tags', icon: Tag },
      { to: '/budget', label: 'Orçamento', icon: Target },
    ],
  },
  {
    label: 'Análise',
    links: [
      { to: '/score', label: 'Score', icon: Gauge },
      { to: '/goals', label: 'Metas', icon: Goal },
      { to: '/forecast', label: 'Projeção', icon: TrendingUp },
      { to: '/reports', label: 'Relatórios', icon: BarChart3 },
    ],
  },
  {
    label: 'Social',
    links: [
      { to: '/family', label: 'Família', icon: Users },
    ],
  },
];

// Flat list para mobile
const ALL_LINKS = NAV_GROUPS.flatMap(g => g.links);

// Breadcrumb lookup
const LABEL_MAP: Record<string, string> = Object.fromEntries(ALL_LINKS.map(l => [l.to, l.label]));

const C = {
  sidebarBg: '#16150f',
  sidebarActive: 'rgba(255,255,255,0.12)',
  sidebarIcon: 'rgba(255,255,255,0.45)',
  sidebarIconActive: '#ffffff',
  sidebarIndicator: '#1a7a45',
  topbarBg: '#faf9f7',
  topbarBorder: '#e4e1da',
  ink: '#16150f',
  ink2: '#6b6a63',
  ink3: '#b0aea6',
  pageBg: '#f2f0eb',
  amber: '#92580a',
  amberBg: '#fdefd4',
};

// Logo badge
function LogoBadge() {
  return (
    <div style={{
      width: '36px', height: '36px', borderRadius: '10px',
      background: '#1a7a45', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff', fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1 }}>$</span>
    </div>
  );
}

// Tooltip wrapper para sidebar
function SidebarTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div style={{
          position: 'absolute', left: '56px', top: '50%', transform: 'translateY(-50%)',
          background: C.ink, color: '#fff', fontSize: '12px', fontWeight: 600,
          padding: '4px 10px', borderRadius: '6px', whiteSpace: 'nowrap',
          zIndex: 100, pointerEvents: 'none',
          fontFamily: "'Cabinet Grotesk', sans-serif",
          boxShadow: '0 4px 12px rgba(0,0,0,.3)',
        }}>
          {label}
        </div>
      )}
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey && !e.altKey) navigate('/expenses?new=1');
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  // Breadcrumb label
  const currentLabel = LABEL_MAP[location.pathname] ?? Object.entries(LABEL_MAP).find(([k]) => location.pathname.startsWith(k) && k !== '/')?.[1] ?? 'Página';

  // Mobile bottom 5 links
  const mobileLinks = [
    ALL_LINKS[0], // Dashboard
    ALL_LINKS[1], // Despesas
    ALL_LINKS[2], // Receitas
    ALL_LINKS[11], // Família
    ALL_LINKS[10], // Relatórios
  ].filter(Boolean);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.pageBg }}>
      <NotificationAlerts />

      {/* ── SIDEBAR RAIL (desktop only) ── */}
      <aside style={{
        display: 'none',
        width: '64px',
        flexShrink: 0,
        background: C.sidebarBg,
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '14px',
        paddingBottom: '14px',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 50,
        overflowY: 'auto',
        overflowX: 'visible',
      }}
        className="md-sidebar"
        id="app-sidebar"
      >
        {/* Logo */}
        <NavLink to="/" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          <LogoBadge />
        </NavLink>

        {/* Nav groups */}
        <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {/* Separador entre grupos */}
              {gi > 0 && (
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '6px 12px' }} />
              )}
              {group.links.map(link => (
                <SidebarTooltip key={link.to} label={link.label}>
                  <NavLink
                    to={link.to}
                    end={link.to === '/'}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '100%', height: '44px', position: 'relative',
                      background: isActive ? C.sidebarActive : 'none',
                      textDecoration: 'none', transition: 'background .15s',
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        {/* Indicador ativo */}
                        {isActive && (
                          <div style={{
                            position: 'absolute', left: 0, top: '8px', bottom: '8px',
                            width: '2px', borderRadius: '0 2px 2px 0',
                            background: C.sidebarIndicator,
                          }} />
                        )}
                        <link.icon
                          size={18}
                          style={{ color: isActive ? C.sidebarIconActive : C.sidebarIcon, transition: 'color .15s' }}
                        />
                      </>
                    )}
                  </NavLink>
                </SidebarTooltip>
              ))}
            </div>
          ))}
        </div>

        {/* Sair */}
        <div style={{ width: '100%', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '6px' }}>
          <SidebarTooltip label="Sair">
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', height: '44px', background: 'none', border: 'none',
                cursor: 'pointer', transition: 'background .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = C.sidebarActive)}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <LogOut size={18} style={{ color: C.sidebarIcon }} />
            </button>
          </SidebarTooltip>
        </div>
      </aside>

      {/* ── CONTEÚDO PRINCIPAL (com margem p/ sidebar) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }} className="md-main-content">

        {/* ── TOPBAR ── */}
        <header style={{
          background: C.topbarBg,
          borderBottom: `1px solid ${C.topbarBorder}`,
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Logo mobile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="mobile-logo">
              <LogoBadge />
              <span style={{ fontSize: '14px', fontWeight: 700, color: C.ink, fontFamily: "'Cabinet Grotesk', sans-serif" }}>Din-Din Zen</span>
              <span style={{ color: C.topbarBorder, fontSize: '16px' }}>/</span>
            </div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: C.ink, fontFamily: "'Cabinet Grotesk', sans-serif" }}>{currentLabel}</span>
          </div>

          {/* Ações topbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Busca */}
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', borderRadius: '8px', fontSize: '12px',
                color: C.ink2, background: 'none',
                border: `1px solid ${C.topbarBorder}`,
                cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 500,
              }}
            >
              <Search size={13} />
              <span>Buscar</span>
              <kbd style={{ fontSize: '10px', color: C.ink3, background: C.pageBg, padding: '1px 5px', borderRadius: '4px', border: `1px solid ${C.topbarBorder}` }}>⌘K</kbd>
            </button>

            <ViewSelector />

            <span style={{ fontSize: '12px', color: C.ink3, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {user?.email}
            </span>
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main style={{ flex: 1, padding: '24px', paddingBottom: '88px', maxWidth: '100%', overflowX: 'hidden' }} className="md-page-padding">
          {children}
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: C.topbarBg, borderTop: `1px solid ${C.topbarBorder}`,
        height: '64px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-around', zIndex: 50, paddingBottom: '4px',
      }} className="mobile-bottom-nav">
        {mobileLinks.map((link, i) => {
          const isFAB = i === 2;
          if (isFAB) return (
            <button
              key="fab"
              onClick={() => navigate('/expenses?new=1')}
              style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: '#1a7a45', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(26,122,69,.4)',
                marginTop: '-16px',
              }}
            >
              <Plus size={22} style={{ color: '#fff' }} />
            </button>
          );
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              style={({ isActive }) => ({
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '2px', padding: '4px 8px', textDecoration: 'none',
                color: isActive ? '#1a7a45' : C.ink3,
                fontSize: '9px', fontWeight: 600,
                fontFamily: "'Cabinet Grotesk', sans-serif",
                letterSpacing: '0.3px', textTransform: 'uppercase',
                flex: 1,
              })}
            >
              {({ isActive }) => (
                <>
                  <link.icon size={20} style={{ color: isActive ? '#1a7a45' : C.ink3 }} />
                  {link.label}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* FAB desktop (quick add) */}
      <QuickAddFAB />

      {/* Global search */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* CSS para mostrar sidebar só no desktop */}
      <style>{`
        @media (min-width: 768px) {
          #app-sidebar { display: flex !important; }
          .md-main-content { margin-left: 64px; }
          .md-page-padding { padding: 28px 32px !important; padding-bottom: 28px !important; max-width: 1200px !important; margin: 0 auto !important; width: 100% !important; }
          .mobile-bottom-nav { display: none !important; }
          .mobile-logo { display: none !important; }
        }
        @media (max-width: 767px) {
          #app-sidebar { display: none !important; }
          .md-main-content { margin-left: 0 !important; }
          .md-page-padding { padding: 16px !important; padding-bottom: 80px !important; }
        }
        #app-sidebar::-webkit-scrollbar { width: 0; }
      `}</style>
    </div>
  );
}
