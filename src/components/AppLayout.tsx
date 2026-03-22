import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfiles';
import { ViewSelector } from '@/components/ViewSelector';
import { GlobalSearch } from '@/components/GlobalSearch';
import { QuickAddFAB } from '@/components/QuickAddFAB';
import { NotificationAlerts } from '@/components/NotificationAlerts';
import {
  LayoutDashboard, Receipt, DollarSign, Building2, CreditCard,
  FolderOpen, Tag, Target, Gauge, TrendingUp, Users, BarChart3,
  LogOut, Plus, Search, User, Settings, ChevronDown, Goal,
} from 'lucide-react';

// ── paleta ──
const C = {
  sidebarBg: '#16150f',
  sidebarActive: 'rgba(255,255,255,0.1)',
  sidebarIcon: 'rgba(255,255,255,0.4)',
  sidebarIconActive: '#ffffff',
  sidebarIndicator: '#1a7a45',
  sidebarSep: 'rgba(255,255,255,0.07)',
  topbarBg: '#faf9f7',
  topbarBorder: '#e4e1da',
  ink: '#16150f', ink2: '#6b6a63', ink3: '#b0aea6',
  pageBg: '#f2f0eb',
  green: '#1a7a45',
};

// ── grupos de navegação ──
const NAV_GROUPS = [
  {
    links: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    links: [
      { to: '/expenses', label: 'Despesas', icon: Receipt },
      { to: '/income', label: 'Receitas', icon: DollarSign },
    ],
  },
  {
    links: [
      { to: '/accounts', label: 'Contas', icon: Building2 },
      { to: '/credit-cards', label: 'Cartões', icon: CreditCard },
    ],
  },
  {
    links: [
      { to: '/groups', label: 'Grupos', icon: FolderOpen },
      { to: '/tags', label: 'Tags', icon: Tag },
      { to: '/budget', label: 'Orçamento', icon: Target },
    ],
  },
  {
    links: [
      { to: '/score', label: 'Score', icon: Gauge },
      { to: '/goals', label: 'Metas', icon: Goal },
      { to: '/forecast', label: 'Projeção', icon: TrendingUp },
      { to: '/reports', label: 'Relatórios', icon: BarChart3 },
    ],
  },
  {
    links: [
      { to: '/family', label: 'Família', icon: Users },
    ],
  },
];

const ALL_LINKS = NAV_GROUPS.flatMap(g => g.links);
const LABEL_MAP: Record<string, string> = Object.fromEntries(ALL_LINKS.map(l => [l.to, l.label]));

// Mobile bottom 5 (posição 2 = FAB)
const MOBILE_LINKS_RAW = [
  { to: '/', label: 'Início', icon: LayoutDashboard },
  { to: '/expenses', label: 'Despesas', icon: Receipt },
  null, // FAB placeholder
  { to: '/income', label: 'Receitas', icon: DollarSign },
  { to: '/family', label: 'Família', icon: Users },
];

// ── Logo ──
function LogoBadge() {
  return (
    <div style={{
      width: '36px', height: '36px', borderRadius: '10px',
      background: C.green, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{
        fontSize: '17px', fontWeight: 800, color: '#fff',
        fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1,
      }}>$</span>
    </div>
  );
}

// ── Tooltip ──
function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute', left: '60px', top: '50%', transform: 'translateY(-50%)',
          background: '#1a1a14', color: '#fff', fontSize: '11px', fontWeight: 600,
          padding: '4px 10px', borderRadius: '6px', whiteSpace: 'nowrap',
          zIndex: 200, pointerEvents: 'none',
          fontFamily: "'Cabinet Grotesk', sans-serif",
          boxShadow: '0 4px 12px rgba(0,0,0,.4)',
        }}>
          {label}
          <div style={{ position: 'absolute', left: '-4px', top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderRight: '4px solid #1a1a14' }} />
        </div>
      )}
    </div>
  );
}

// ── User menu dropdown ──
function UserMenu({ displayName, email, avatarColor, onSignOut, onProfile }: {
  displayName: string; email: string; avatarColor: string;
  onSignOut: () => void; onProfile: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = displayName.substring(0, 2).toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '4px 10px 4px 4px', borderRadius: '100px',
          border: `1px solid ${C.topbarBorder}`, background: 'none',
          cursor: 'pointer', transition: 'background .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = C.pageBg)}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        {/* Avatar */}
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          background: avatarColor, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '11px', fontWeight: 700,
          color: '#fff', flexShrink: 0,
        }}>
          {initials}
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: C.ink, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          {displayName}
        </span>
        <ChevronDown size={12} style={{ color: C.ink3, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: '6px',
          background: '#fff', border: `1px solid ${C.topbarBorder}`, borderRadius: '12px',
          minWidth: '200px', boxShadow: '0 8px 24px rgba(0,0,0,.1)', zIndex: 100,
          overflow: 'hidden',
        }}>
          {/* User info */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.topbarBorder}` }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink }}>{displayName}</div>
            <div style={{ fontSize: '11px', color: C.ink3, marginTop: '1px' }}>{email}</div>
          </div>
          {/* Menu items */}
          {[
            { icon: User, label: 'Meu perfil', action: () => { onProfile(); setOpen(false); } },
            { icon: Settings, label: 'Configurações', action: () => { onProfile(); setOpen(false); } },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 16px', border: 'none', background: 'none',
                cursor: 'pointer', fontSize: '13px', color: C.ink,
                fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 500,
                transition: 'background .1s', textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = C.pageBg)}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <item.icon size={14} style={{ color: C.ink2, flexShrink: 0 }} />
              {item.label}
            </button>
          ))}
          <div style={{ borderTop: `1px solid ${C.topbarBorder}` }}>
            <button
              onClick={() => { onSignOut(); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 16px', border: 'none', background: 'none',
                cursor: 'pointer', fontSize: '13px', color: '#b83232',
                fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 500,
                transition: 'background .1s', textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <LogOut size={14} style={{ color: '#b83232', flexShrink: 0 }} />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN LAYOUT ──
export function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile(); // ← nome real da tabela profiles
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  // Nome: prioridade profile.display_name > email prefix
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Usuário';
  const avatarColor = profile?.avatar_color || '#1a7a45';
  const email = user?.email || '';

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

  // Breadcrumb
  const currentLabel = LABEL_MAP[location.pathname]
    ?? Object.entries(LABEL_MAP).find(([k]) => location.pathname.startsWith(k) && k !== '/')?.[1]
    ?? 'Página';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.pageBg }}>
      <NotificationAlerts />

      {/* ── SIDEBAR RAIL ── */}
      <aside
        id="app-sidebar"
        style={{
          width: '64px', flexShrink: 0,
          background: C.sidebarBg,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: '12px', paddingBottom: '12px',
          position: 'fixed', top: 0, left: 0, bottom: 0,
          zIndex: 50, overflowY: 'auto', overflowX: 'visible',
        }}
      >
        {/* Logo */}
        <NavLink to="/" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
          <LogoBadge />
        </NavLink>

        {/* Links */}
        <div style={{ flex: 1, width: '100%' }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && (
                <div style={{ height: '1px', background: C.sidebarSep, margin: '4px 12px' }} />
              )}
              {group.links.map(link => (
                <Tip key={link.to} label={link.label}>
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
                        {isActive && (
                          <div style={{
                            position: 'absolute', left: 0, top: '8px', bottom: '8px',
                            width: '2px', borderRadius: '0 2px 2px 0',
                            background: C.sidebarIndicator,
                          }} />
                        )}
                        <link.icon
                          size={18}
                          style={{
                            color: isActive ? C.sidebarIconActive : C.sidebarIcon,
                            transition: 'color .15s',
                          }}
                        />
                      </>
                    )}
                  </NavLink>
                </Tip>
              ))}
            </div>
          ))}
        </div>

        {/* Sair */}
        <div style={{ width: '100%', borderTop: `1px solid ${C.sidebarSep}`, paddingTop: '4px' }}>
          <Tip label="Sair">
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
              <LogOut size={17} style={{ color: C.sidebarIcon }} />
            </button>
          </Tip>
        </div>
      </aside>

      {/* ── MAIN (offset da sidebar) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: '64px' }}>

        {/* ── TOPBAR ── */}
        <header style={{
          background: C.topbarBg,
          borderBottom: `1px solid ${C.topbarBorder}`,
          height: '52px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky', top: 0, zIndex: 40,
          flexShrink: 0,
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: C.ink3, fontFamily: "'Cabinet Grotesk', sans-serif" }}>Din-Din Zen</span>
            <span style={{ color: C.topbarBorder, fontSize: '14px', lineHeight: 1 }}>/</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: C.ink, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {currentLabel}
            </span>
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Busca */}
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', borderRadius: '8px',
                color: C.ink2, background: 'none',
                border: `1px solid ${C.topbarBorder}`,
                cursor: 'pointer',
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontSize: '12px', fontWeight: 500,
              }}
            >
              <Search size={13} />
              <span>Buscar</span>
              <kbd style={{
                fontSize: '10px', color: C.ink3,
                background: C.pageBg, padding: '1px 5px',
                borderRadius: '4px', border: `1px solid ${C.topbarBorder}`,
              }}>⌘K</kbd>
            </button>

            <ViewSelector />

            {/* User menu */}
            <UserMenu
              displayName={displayName}
              email={email}
              avatarColor={avatarColor}
              onSignOut={handleSignOut}
              onProfile={() => navigate('/profile')}
            />
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main style={{
          flex: 1, padding: '28px 32px',
          paddingBottom: '32px',
          maxWidth: '1200px', width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}>
          {children}
        </main>
      </div>

      {/* ── MOBILE: sem sidebar, com bottom nav ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: C.topbarBg, borderTop: `1px solid ${C.topbarBorder}`,
        height: '64px', zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }} id="mobile-bottom-nav">
        {MOBILE_LINKS_RAW.map((link, i) => {
          if (!link) {
            return (
              <button
                key="fab"
                onClick={() => navigate('/expenses?new=1')}
                style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: C.green, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 4px 16px rgba(26,122,69,.4)`,
                  marginTop: '-16px', flexShrink: 0,
                }}
              >
                <Plus size={22} style={{ color: '#fff' }} />
              </button>
            );
          }
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              style={({ isActive }) => ({
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '2px', padding: '4px 8px', textDecoration: 'none',
                color: isActive ? C.green : C.ink3,
                fontSize: '9px', fontWeight: 600,
                fontFamily: "'Cabinet Grotesk', sans-serif",
                letterSpacing: '0.3px', flex: 1,
              })}
            >
              {({ isActive }) => (
                <>
                  <link.icon size={20} style={{ color: isActive ? C.green : C.ink3 }} />
                  {link.label}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <QuickAddFAB />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* ── RESPONSIVE CSS ── */}
      <style>{`
        @media (max-width: 767px) {
          #app-sidebar { display: none !important; }
          div[style*="margin-left: 64px"] { margin-left: 0 !important; }
          main[style*="padding: 28px 32px"] {
            padding: 16px !important;
            padding-bottom: 80px !important;
            max-width: 100% !important;
          }
        }
        @media (min-width: 768px) {
          #mobile-bottom-nav { display: none !important; }
        }
        #app-sidebar::-webkit-scrollbar { width: 0; }
      `}</style>
    </div>
  );
}
