import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfiles';
import { ViewSelector } from '@/components/ViewSelector';
import { GlobalSearch } from '@/components/GlobalSearch';
import { QuickAddFAB } from '@/components/QuickAddFAB';
import { NotificationAlerts } from '@/components/NotificationAlerts';
import { TopbarInsights } from '@/components/TopbarInsights';
import {
  LayoutDashboard, Receipt, DollarSign, Building2, CreditCard,
  FolderOpen, Tag, Target, Gauge, TrendingUp, Users, BarChart3,
  LogOut, Plus, Search, User, Settings, ChevronDown, Goal, LayoutGrid,
} from 'lucide-react';

const C = {
  sidebarBg: '#16150f',
  sidebarActive: 'rgba(255,255,255,0.10)',
  sidebarHover: 'rgba(255,255,255,0.05)',
  sidebarIcon: 'rgba(255,255,255,0.40)',
  sidebarIconActive: '#ffffff',
  sidebarIndicator: '#1a7a45',
  sidebarSep: 'rgba(255,255,255,0.07)',
  topbarBg: '#faf9f7',
  topbarBorder: '#e4e1da',
  ink: '#16150f', ink2: '#6b6a63', ink3: '#b0aea6',
  pageBg: '#f2f0eb',
  green: '#1a7a45',
  red: '#b83232',
};

const NAV_GROUPS = [
  { links: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }] },
  { links: [
    { to: '/expenses',     label: 'Despesas',   icon: Receipt },
    { to: '/income',       label: 'Receitas',   icon: DollarSign },
  ]},
  { links: [
    { to: '/accounts',     label: 'Contas',     icon: Building2 },
    { to: '/credit-cards', label: 'Cartões',    icon: CreditCard },
  ]},
  { links: [
    { to: '/groups',  label: 'Grupos',    icon: FolderOpen },
    { to: '/tags',    label: 'Tags',      icon: Tag },
    { to: '/budget',  label: 'Orçamento', icon: Target },
  ]},
  { links: [
    { to: '/score',    label: 'Score',      icon: Gauge },
    { to: '/goals',    label: 'Metas',      icon: Goal },
    { to: '/forecast', label: 'Projeção',   icon: TrendingUp },
    { to: '/reports',  label: 'Relatórios', icon: BarChart3 },
  ]},
  { links: [{ to: '/family', label: 'Família', icon: Users }]},
];

const ALL_LINKS = NAV_GROUPS.flatMap(g => g.links);
const LABEL_MAP: Record<string, string> = Object.fromEntries(ALL_LINKS.map(l => [l.to, l.label]));

function Logo() {
  return (
    <div style={{ width: 36, height: 36, borderRadius: 10, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 17, fontWeight: 800, color: '#fff', fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1 }}>$</span>
    </div>
  );
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{ position: 'absolute', left: 58, top: '50%', transform: 'translateY(-50%)', background: '#1a1a14', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap', zIndex: 200, pointerEvents: 'none', fontFamily: "'Cabinet Grotesk', sans-serif", boxShadow: '0 4px 12px rgba(0,0,0,.5)' }}>
          {label}
        </div>
      )}
    </div>
  );
}

function UserMenu({ name, email, color, onSignOut }: { name: string; email: string; color: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px', borderRadius: 100, border: `1px solid ${C.topbarBorder}`, background: 'none', cursor: 'pointer', transition: 'background .15s' }}
        onMouseEnter={e => (e.currentTarget.style.background = C.pageBg)}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {name.substring(0, 2).toUpperCase()}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.ink, fontFamily: "'Cabinet Grotesk', sans-serif" }}>{name}</span>
        <ChevronDown size={12} style={{ color: C.ink3, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, background: '#fff', border: `1px solid ${C.topbarBorder}`, borderRadius: 12, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,.1)', zIndex: 100, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.topbarBorder}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{name}</div>
            <div style={{ fontSize: 11, color: C.ink3, marginTop: 1 }}>{email}</div>
          </div>
          {[{ icon: User, label: 'Meu perfil', to: '/settings' }, { icon: Settings, label: 'Configurações', to: '/settings' }].map(item => (
            <button key={item.label} onClick={() => { navigate(item.to); setOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: C.ink, fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 500, textAlign: 'left', transition: 'background .1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = C.pageBg)}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <item.icon size={14} style={{ color: C.ink2 }} />{item.label}
            </button>
          ))}
          <div style={{ borderTop: `1px solid ${C.topbarBorder}` }}>
            <button onClick={() => { onSignOut(); setOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: C.red, fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 500, textAlign: 'left', transition: 'background .1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <LogOut size={14} style={{ color: C.red }} />Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Usuário';
  const avatarColor = profile?.avatar_color || C.green;

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey && !e.altKey) navigate('/expenses?new=1');
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [navigate]);

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  const currentLabel = LABEL_MAP[location.pathname]
    ?? ALL_LINKS.find(l => l.to !== '/' && location.pathname.startsWith(l.to))?.label
    ?? 'Página';

  const mobileSlots: (typeof ALL_LINKS[0] | null)[] = [
    { to: '/',         label: 'Início',   icon: LayoutDashboard },
    { to: '/expenses', label: 'Despesas', icon: Receipt },
    null,
    { to: '/income',   label: 'Receitas', icon: DollarSign },
    { to: '/family',   label: 'Família',  icon: Users },
  ];

  return (
    <>
      <NotificationAlerts />

      {/* SIDEBAR */}
      <aside className="din-sidebar" style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 64, zIndex: 50, background: C.sidebarBg, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, paddingBottom: 10, overflowY: 'auto', overflowX: 'visible' }}>
        <Link to="/" style={{ marginBottom: 14, display: 'flex', justifyContent: 'center', textDecoration: 'none' }}><Logo /></Link>
        <div style={{ flex: 1, width: '100%' }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && <div style={{ height: 1, background: C.sidebarSep, margin: '3px 14px' }} />}
              {group.links.map(link => (
                <Tip key={link.to} label={link.label}>
                  <NavLink to={link.to} end={link.to === '/'}
                    style={({ isActive }) => ({ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 44, background: isActive ? C.sidebarActive : 'none', textDecoration: 'none', transition: 'background .15s' })}>
                    {({ isActive }) => (
                      <>
                        {isActive && <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 2, borderRadius: '0 2px 2px 0', background: C.sidebarIndicator }} />}
                        <link.icon size={18} style={{ color: isActive ? C.sidebarIconActive : C.sidebarIcon, transition: 'color .15s' }} />
                      </>
                    )}
                  </NavLink>
                </Tip>
              ))}
            </div>
          ))}
        </div>
        <div style={{ width: '100%', borderTop: `1px solid ${C.sidebarSep}`, paddingTop: 3 }}>
          <Tip label="Sair">
            <button onClick={handleSignOut}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 44, background: 'none', border: 'none', cursor: 'pointer', transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = C.sidebarActive)}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <LogOut size={17} style={{ color: C.sidebarIcon }} />
            </button>
          </Tip>
        </div>
      </aside>

      {/* MAIN */}
      <div className="din-main" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.pageBg, overflowX: 'hidden', overflowY: 'auto' }}>

        {/* TOPBAR */}
        <header style={{ position: 'sticky', top: 0, zIndex: 40, background: C.topbarBg, borderBottom: `1px solid ${C.topbarBorder}`, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: C.ink3, fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 500 }}>Din-Din Zen</span>
            <span style={{ color: C.topbarBorder, fontSize: 14 }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.ink, fontFamily: "'Cabinet Grotesk', sans-serif" }}>{currentLabel}</span>
          </div>

          {/* Insights pill — centro */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            <TopbarInsights />
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setSearchOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, color: C.ink2, background: 'none', border: `1px solid ${C.topbarBorder}`, cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 12, fontWeight: 500 }}>
              <Search size={13} />Buscar<kbd style={{ fontSize: 10, color: C.ink3, background: C.pageBg, padding: '1px 5px', borderRadius: 4, border: `1px solid ${C.topbarBorder}` }}>⌘K</kbd>
            </button>
            <ViewSelector />
            <UserMenu name={displayName} email={user?.email || ''} color={avatarColor} onSignOut={handleSignOut} />
          </div>
        </header>

        {/* PAGE */}
        <main className="din-page" style={{ flex: 1, padding: '28px 32px', maxWidth: 1200, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          {children}
        </main>
      </div>

      {/* BOTTOM NAV MOBILE */}
      <nav className="din-bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.topbarBg, borderTop: `1px solid ${C.topbarBorder}`, height: 64, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
        {mobileSlots.map((slot, i) => !slot
          ? <button key="fab" onClick={() => navigate('/expenses?new=1')} style={{ width: 48, height: 48, borderRadius: '50%', background: C.green, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(26,122,69,.4)', marginTop: -16, flexShrink: 0 }}>
              <Plus size={22} style={{ color: '#fff' }} />
            </button>
          : <NavLink key={slot.to} to={slot.to} end={slot.to === '/'}
              style={({ isActive }) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 8px', textDecoration: 'none', flex: 1, color: isActive ? C.green : C.ink3, fontSize: 9, fontWeight: 600, fontFamily: "'Cabinet Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.3px' })}>
              {({ isActive }) => <><slot.icon size={20} style={{ color: isActive ? C.green : C.ink3 }} />{slot.label}</>}
            </NavLink>
        )}
      </nav>

      <QuickAddFAB />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      <style>{`
        @media (min-width: 768px) {
          .din-sidebar { display: flex !important; }
          .din-main { margin-left: 64px !important; }
          .din-bottom-nav { display: none !important; }
          .din-page { padding: 28px 32px !important; padding-bottom: 28px !important; }
        }
        @media (max-width: 767px) {
          .din-sidebar { display: none !important; }
          .din-main { margin-left: 0 !important; }
          .din-bottom-nav { display: flex !important; }
          .din-page { padding: 16px !important; padding-bottom: 80px !important; max-width: 100% !important; }
        }
        .din-sidebar::-webkit-scrollbar { width: 0; }
      `}</style>
    </>
  );
}
