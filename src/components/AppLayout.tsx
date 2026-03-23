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
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard, Receipt, DollarSign, Building2, CreditCard,
  FolderOpen, Tag, Target, Gauge, TrendingUp, Users, BarChart3,
  LogOut, Plus, Search, User, Settings, ChevronDown, Goal, LayoutGrid,
} from 'lucide-react';

const C = {
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
    <div className="w-9 h-9 rounded-[10px] bg-[hsl(148,66%,29%)] flex items-center justify-center shrink-0">
      <span className="text-[17px] font-extrabold text-white leading-none" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>$</span>
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
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-border bg-transparent cursor-pointer hover:bg-muted transition-colors">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: color }}>
          {name.substring(0, 2).toUpperCase()}
        </div>
        <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>{name}</span>
        <ChevronDown size={12} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-popover border border-border rounded-xl min-w-[200px] shadow-lg z-[100] overflow-hidden">
          <div className="p-3.5 border-b border-border">
            <div className="text-[13px] font-bold text-foreground">{name}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{email}</div>
          </div>
          {[{ icon: Settings, label: 'Configurações', to: '/settings' }].map(item => (
            <button key={item.label} onClick={() => { navigate(item.to); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 border-none bg-transparent cursor-pointer text-[13px] text-foreground hover:bg-muted transition-colors text-left"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 500 }}>
              <item.icon size={14} className="text-muted-foreground" />{item.label}
            </button>
          ))}
          <div className="border-t border-border">
            <button onClick={() => { onSignOut(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 border-none bg-transparent cursor-pointer text-[13px] text-destructive hover:bg-destructive/10 transition-colors text-left"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 500 }}>
              <LogOut size={14} className="text-destructive" />Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  const isLinkActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3 flex items-center justify-center">
        <Link to="/" className="no-underline flex justify-center">
          <Logo />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <SidebarSeparator />}
            <SidebarGroup className="py-0.5">
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.links.map(link => (
                    <SidebarMenuItem key={link.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={isLinkActive(link.to)}
                        tooltip={link.label}
                      >
                        <NavLink to={link.to} end={link.to === '/'}>
                          <link.icon />
                          <span>{link.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sair" onClick={handleSignOut}>
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

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

  const mobileSlots: (typeof ALL_LINKS[0] | null | 'more')[] = [
    { to: '/',         label: 'Início',   icon: LayoutDashboard },
    { to: '/family',   label: 'Família',  icon: Users },
    null,
    { to: '/income',   label: 'Receitas', icon: DollarSign },
    'more',
  ];

  return (
    <div className="flex flex-1 flex-col min-h-svh overflow-x-hidden" style={{ background: C.pageBg }}>
      <NotificationAlerts />

      {/* TOPBAR */}
      <header className="sticky top-0 z-40 shrink-0 h-[52px] flex items-center justify-between px-6 border-b" style={{ background: C.topbarBg, borderColor: C.topbarBorder }}>
        <div className="flex items-center gap-1.5">
          <SidebarTrigger className="mr-2 hidden md:flex" />
          <span className="text-[13px] text-muted-foreground font-medium" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Din-Din Zen</span>
          <span className="text-sm" style={{ color: C.topbarBorder }}>/</span>
          <span className="text-[13px] font-bold text-foreground" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>{currentLabel}</span>
        </div>

        <div className="flex-1 hidden md:flex justify-center px-4">
          <TopbarInsights />
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg text-muted-foreground bg-transparent border border-border cursor-pointer text-xs font-medium"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            <Search size={13} />Buscar
            <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
          </button>
          <ViewSelector />
          <UserMenu name={displayName} email={user?.email || ''} color={avatarColor} onSignOut={handleSignOut} />
        </div>
      </header>

      {/* PAGE */}
      <main className="din-page flex-1 p-4 md:p-7 md:pb-7 pb-20 max-w-[1200px] w-full mx-auto box-border">
        {children}
      </main>

      {/* BOTTOM NAV MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 z-50 flex items-center justify-around border-t" style={{ background: C.topbarBg, borderColor: C.topbarBorder }}>
        {mobileSlots.map((slot, i) => {
          if (slot === null) return (
            <button key="fab" onClick={() => navigate('/expenses?new=1')} className="w-12 h-12 rounded-full border-none cursor-pointer flex items-center justify-center shrink-0 -mt-4" style={{ background: C.green, boxShadow: '0 4px 16px rgba(26,122,69,.4)' }}>
              <Plus size={22} className="text-white" />
            </button>
          );
          if (slot === 'more') return (
            <button key="more" onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center gap-0.5 px-2 py-1 bg-transparent border-none cursor-pointer flex-1"
              style={{ color: moreOpen ? C.green : C.ink3, fontSize: 9, fontWeight: 600, fontFamily: "'Cabinet Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              <LayoutGrid size={20} style={{ color: moreOpen ? C.green : C.ink3 }} />
              Mais
            </button>
          );
          return (
            <NavLink key={slot.to} to={slot.to} end={slot.to === '/'}
              style={({ isActive }) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 8px', textDecoration: 'none', flex: 1, color: isActive ? C.green : C.ink3, fontSize: 9, fontWeight: 600, fontFamily: "'Cabinet Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.3px' })}>
              {({ isActive }) => <><slot.icon size={20} style={{ color: isActive ? C.green : C.ink3 }} />{slot.label}</>}
            </NavLink>
          );
        })}
      </nav>

      {/* DRAWER MAIS — mobile */}
      {moreOpen && (
        <>
          <div onClick={() => setMoreOpen(false)}
            className="fixed inset-0 z-[60]" style={{ background: 'rgba(22,21,15,0.5)', backdropFilter: 'blur(2px)' }} />
          <div className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl p-4 pb-6" style={{ background: C.topbarBg, animation: 'slideUpMore .25s ease-out' }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: C.ink3, opacity: 0.4 }} />
            <div className="text-sm font-bold mb-3" style={{ color: C.ink, fontFamily: "'Cabinet Grotesk', sans-serif" }}>Menu</div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { to: '/accounts',     label: 'Contas',     icon: Building2 },
                { to: '/credit-cards', label: 'Cartões',    icon: CreditCard },
                { to: '/groups',       label: 'Grupos',     icon: FolderOpen },
                { to: '/tags',         label: 'Tags',       icon: Tag },
                { to: '/budget',       label: 'Orçamento',  icon: Target },
                { to: '/score',        label: 'Score',      icon: Gauge },
                { to: '/goals',        label: 'Metas',      icon: Goal },
                { to: '/forecast',     label: 'Projeção',   icon: TrendingUp },
                { to: '/reports',      label: 'Relatórios', icon: BarChart3 },
                { to: '/family',       label: 'Família',    icon: Users },
                { to: '/settings',     label: 'Config.',    icon: Settings },
              ].map(item => {
                const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
                return (
                  <Link key={item.to} to={item.to} onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-1 py-3.5 px-2 no-underline text-[10px] font-semibold transition-colors"
                    style={{ color: isActive ? C.green : C.ink2, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <style>{`@keyframes slideUpMore { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        </>
      )}

      <QuickAddFAB />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-svh flex w-full">
        <AppSidebar />
        <AppContent>{children}</AppContent>
      </div>
    </SidebarProvider>
  );
}
