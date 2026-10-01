import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  CalendarDays,
  Clapperboard,
  Compass,
  Crown,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  Trophy,
  User,
  Users,
  Gift,
  Ticket,
  Award,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { notificationApi } from '../api/endpoints.js';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications.js';
import { Avatar } from '../components/ui/Display.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Drawer } from '../components/ui/Modal.jsx';
import { InstagramIcon, WhatsAppIcon } from '../components/ui/BrandIcons.jsx';
import { cn, instagramUrl, whatsappUrl } from '../utils/format.js';
import { ROLE_LABELS } from '../constants/index.js';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/discover', label: 'Discover' },
  { to: '/cities', label: 'Cities' },
  { to: '/fan-clubs', label: 'Fan Clubs' },
  { to: '/events', label: 'Events' },
  { to: '/fdfs', label: 'FDFS' },
  { to: '/leaderboard', label: 'Leaderboard' },
];

export function Logo({ className }) {
  const s = useSettings();
  return (
    <Link to="/" className={cn('flex shrink-0 items-center gap-2.5', className)} aria-label={`${s.platformName} home`}>
      {s.logo?.url ? (
        <img src={s.logo.url} alt="" className="h-9 w-auto" />
      ) : (
        <span className="inline-flex size-9 items-center justify-center rounded-xl border border-gold-500/30 bg-gradient-to-br from-ink-700 to-ink-900">
          <Crown className="size-5 text-gold-400" aria-hidden />
        </span>
      )}
      <span className="display text-[1.7rem] leading-none text-fog-100">{s.platformName}</span>
    </Link>
  );
}

function useUnread(enabled) {
  const { data } = useQuery({ queryKey: ['notifications', 'unread'], queryFn: notificationApi.unread, enabled, refetchInterval: 90 * 1000 });
  return data?.unread || 0;
}

function ProfileMenu() {
  const { user, logout, isModerator } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  const hasClub = user?.managedClubs?.length > 0;
  const items = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: `/profile/${user.username}`, label: 'My Profile', icon: User },
    { to: '/my-fan-club', label: 'My Fan Club', icon: Users },
    { to: '/my-events', label: 'My Events & FDFS', icon: Ticket },
    { to: '/my-badges', label: 'Badges & Points', icon: Award },
    { to: '/referrals', label: 'Invite SRKians', icon: Gift },
    { to: '/settings', label: 'Settings', icon: Settings },
    hasClub && { to: '/fan-club/dashboard', label: 'Fan Club Dashboard', icon: Crown, accent: true },
    isModerator && { to: '/admin', label: user.role === 'SUPER_ADMIN' ? 'Admin Panel' : 'Moderator Panel', icon: Shield, accent: true },
  ].filter(Boolean);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-white/10" aria-haspopup="menu" aria-expanded={open} aria-label="Account menu">
        <Avatar src={user.profilePhoto?.url} name={user.fullName} size="sm" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-2xl"
          >
            <div className="border-b border-white/5 px-4 py-3">
              <p className="truncate font-semibold text-fog-100">{user.fullName}</p>
              <p className="truncate text-xs text-fog-400">
                @{user.username} · {ROLE_LABELS[user.role]}
              </p>
            </div>
            <div className="p-1.5">
              {items.map(({ to, label, icon: Icon, accent }) => (
                <Link key={to} to={to} role="menuitem" className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/5', accent ? 'text-gold-300' : 'text-fog-200')}>
                  <Icon className="size-4" aria-hidden /> {label}
                </Link>
              ))}
              <button
                role="menuitem"
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-crimson-400 hover:bg-white/5"
              >
                <LogOut className="size-4" aria-hidden /> Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Header() {
  const { isAuthenticated, user, status } = useAuth();
  const unread = useUnread(isAuthenticated);
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/85 backdrop-blur-xl">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-gold-500 focus:px-3 focus:py-2 focus:text-ink-950">
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center gap-4">
        <Logo />
        <nav className="ml-4 hidden items-center gap-0.5 xl:flex" aria-label="Main">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'text-gold-300' : 'text-fog-300 hover:text-fog-100')}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <form
          role="search"
          className="ml-auto hidden max-w-xs flex-1 md:block"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <label className="relative block">
            <span className="sr-only">Search cities, fan clubs, events</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fog-500" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search cities, clubs, FDFS…" className="field h-10 pl-9 text-sm" />
          </label>
        </form>
        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <Link to="/search" className="rounded-lg p-2.5 text-fog-300 hover:bg-white/5 md:hidden" aria-label="Search">
            <Search className="size-5" />
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/notifications" className="relative rounded-lg p-2.5 text-fog-300 hover:bg-white/5 hover:text-fog-100" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
                <Bell className="size-5" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 inline-flex min-w-4.5 items-center justify-center rounded-full bg-crimson-500 px-1 text-[10px] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Link>
              <ProfileMenu />
            </>
          ) : status !== 'loading' ? (
            <>
              <Button to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign in
              </Button>
              <Button to="/register" size="sm">
                Join
              </Button>
            </>
          ) : null}
          <button onClick={() => setDrawer(true)} className="rounded-lg p-2.5 text-fog-300 hover:bg-white/5 xl:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
        </div>
      </div>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Menu">
        <nav className="p-3" aria-label="Mobile">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('block rounded-xl px-4 py-3 text-base font-medium', isActive ? 'bg-white/5 text-gold-300' : 'text-fog-200')}>
              {n.label}
            </NavLink>
          ))}
          <div className="my-3 border-t border-white/5" />
          <Link to="/fan-clubs/register" className="block rounded-xl px-4 py-3 text-base font-medium text-gold-300">
            Register your fan club
          </Link>
          {isAuthenticated ? (
            <Link to="/dashboard" className="block rounded-xl px-4 py-3 text-base text-fog-200">
              Dashboard ({user.fullName.split(' ')[0]})
            </Link>
          ) : (
            <Link to="/login" className="block rounded-xl px-4 py-3 text-base text-fog-200">
              Sign in
            </Link>
          )}
        </nav>
      </Drawer>
    </header>
  );
}

function MobileNav() {
  const { isAuthenticated, user } = useAuth();
  const items = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/discover', label: 'Discover', icon: Compass },
    { to: '/fdfs', label: 'FDFS', icon: Clapperboard },
    { to: '/events', label: 'Events', icon: CalendarDays },
    { to: isAuthenticated ? `/profile/${user.username}` : '/login', label: 'Profile', icon: User },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-ink-950/95 backdrop-blur-xl safe-bottom xl:hidden" aria-label="Primary mobile">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={label}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) => cn('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium', isActive ? 'text-gold-300' : 'text-fog-400')}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Footer() {
  const s = useSettings();
  const cols = [
    { title: 'Explore', links: [['/cities', 'Find your city'], ['/fan-clubs', 'Fan clubs'], ['/events', 'Events'], ['/fdfs', 'FDFS'], ['/leaderboard', 'Leaderboard']] },
    { title: 'Community', links: [['/fan-clubs/register', 'Register your fan club'], ['/about', 'About'], ['/community-guidelines', 'Community guidelines'], ['/contact', 'Contact']] },
    { title: 'Legal', links: [['/privacy', 'Privacy policy'], ['/terms', 'Terms'], ['/copyright', 'Copyright policy']] },
  ];
  return (
    <footer className="mt-20 border-t border-white/5 bg-ink-900/50 pb-24 xl:pb-0">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-fog-400">{s.tagline}</p>
          <div className="mt-4 flex gap-2">
            {s.social?.instagram && (
              <a href={s.social.instagram.startsWith('http') ? s.social.instagram : instagramUrl(s.social.instagram)} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/10 p-2.5 text-fog-300 hover:text-gold-300" aria-label="Instagram">
                <InstagramIcon className="size-4" />
              </a>
            )}
            {s.social?.whatsapp && (
              <a href={s.social.whatsapp.startsWith('http') ? s.social.whatsapp : whatsappUrl(s.social.whatsapp)} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/10 p-2.5 text-fog-300 hover:text-gold-300" aria-label="WhatsApp">
                <WhatsAppIcon className="size-4" />
              </a>
            )}
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h2 className="eyebrow mb-3">{c.title}</h2>
            <ul className="space-y-2">
              {c.links.map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-fog-300 hover:text-fog-100">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-fog-500 md:flex-row md:items-start md:justify-between">
          <p className="max-w-3xl leading-relaxed">
            <Trophy className="mr-1.5 mb-0.5 inline size-3.5 text-gold-500" aria-hidden />
            {s.disclaimer}
          </p>
          <p className="shrink-0">
            © {new Date().getFullYear()} {s.platformName}. {s.footerText}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function MainLayout() {
  useRealtimeNotifications();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
