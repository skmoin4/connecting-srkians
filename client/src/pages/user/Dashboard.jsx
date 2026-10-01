import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Bell, CalendarDays, Clapperboard, Mail, MapPin, Megaphone, Sparkles, Ticket, UsersRound } from 'lucide-react';
import { announcementApi, authApi, eventApi, fdfsApi, notificationApi, userApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Avatar, EmptyState, LoadingState, StatCard, StatusBadge } from '../../components/ui/Display.jsx';
import { AnnouncementBanner, EventCard, FDFSCard, NotificationItem } from '../../components/cards/Cards.jsx';
import { formatDate, timeAgo } from '../../utils/format.js';

function Panel({ title, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-fog-100">
          <Icon className="size-4 text-gold-400" aria-hidden /> {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const city = user.city;

  const clubs = useQuery({ queryKey: ['me', 'fan-clubs'], queryFn: userApi.myFanClubs });
  const regs = useQuery({ queryKey: ['me', 'registrations'], queryFn: userApi.myRegistrations });
  const badges = useQuery({ queryKey: ['me', 'badges'], queryFn: userApi.myBadges });
  const announcements = useQuery({ queryKey: ['announcements', 'mine'], queryFn: () => announcementApi.list({ limit: 5 }) });
  const notifications = useQuery({ queryKey: ['notifications', 'list', 'preview'], queryFn: () => notificationApi.list({ limit: 5 }) });
  const contacts = useQuery({ queryKey: ['me', 'contacts'], queryFn: userApi.myContactRequests });
  const events = useQuery({ queryKey: ['events', 'city', city?._id], queryFn: () => eventApi.list({ city: city._id, limit: 3 }), enabled: Boolean(city) });
  const fdfs = useQuery({ queryKey: ['fdfs', 'city', city?._id], queryFn: () => fdfsApi.list({ city: city._id, limit: 2 }), enabled: Boolean(city) });

  const resend = useMutation({ mutationFn: authApi.resendVerification, onSuccess: () => toast.success('Verification email sent'), onError: (e) => toast.error(errorMessage(e)) });
  const markRead = useMutation({ mutationFn: notificationApi.read, onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });

  const upcomingRegs = [...(regs.data?.events || []).map((r) => ({ ...r, kind: 'event', item: r.event })), ...(regs.data?.fdfs || []).map((r) => ({ ...r, kind: 'fdfs', item: r.fdfs }))]
    .filter((r) => ['UPCOMING', 'ONGOING'].includes(r.item.status))
    .slice(0, 5);

  return (
    <div className="container-page py-8 sm:py-12">
      <Seo title="Dashboard" noindex />
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar src={user.profilePhoto?.url} name={user.fullName} size="lg" />
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1 className="display text-4xl text-fog-100 sm:text-5xl">Welcome, {user.fullName.split(' ')[0]}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button to={`/profile/${user.username}`} variant="secondary" size="sm">
            View profile
          </Button>
          <Button to="/settings" variant="ghost" size="sm">
            Settings
          </Button>
        </div>
      </header>

      {!user.emailVerified && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <p>Please verify your email ({user.email}) to secure your account.</p>
          <Button size="sm" variant="secondary" loading={resend.isPending} onClick={() => resend.mutate()}>
            Resend link
          </Button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Community points" value={user.totalPoints} icon={Sparkles} />
        <StatCard label="Badges" value={badges.data?.badges?.length || 0} icon={Award} />
        <StatCard label="Fan clubs" value={(clubs.data?.memberships || []).filter((m) => m.status === 'ACTIVE').length} icon={UsersRound} />
        <StatCard label="Registrations" value={upcomingRegs.length} icon={Ticket} tone="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Your city" icon={MapPin} action={<Button to="/settings?tab=location" variant="ghost" size="sm">Change</Button>}>
            {city ? (
              <Link to={`/cities/${city.slug}`} className="group flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-ink-850 p-4 hover:border-gold-500/30">
                <div>
                  <p className="display text-3xl text-fog-100">{city.name} SRKians</p>
                  <p className="text-sm text-fog-400">
                    {user.state?.name}, {user.country?.name}
                  </p>
                </div>
                <span className="text-sm text-gold-300 group-hover:underline">Open city →</span>
              </Link>
            ) : (
              <EmptyState icon={MapPin} title="No city selected" action={<Button to="/cities">Find your city</Button>} />
            )}
          </Panel>

          <Panel title="Your fan club" icon={UsersRound} action={<Button to="/my-fan-club" variant="ghost" size="sm">Manage</Button>}>
            {clubs.isLoading ? (
              <LoadingState className="py-6" />
            ) : clubs.data?.memberships?.length ? (
              <ul className="space-y-2">
                {clubs.data.memberships.map((m) => (
                  <li key={m.fanClub._id}>
                    <Link to={`/fan-clubs/${m.fanClub.slug}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/[0.03]">
                      <Avatar src={m.fanClub.logo?.url} name={m.fanClub.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-fog-100">{m.fanClub.name}</span>
                        <span className="block text-xs text-fog-400">{m.fanClub.city?.name} · {m.role === 'ADMIN' ? 'Admin' : 'Member'}</span>
                      </span>
                      {m.status !== 'ACTIVE' && <StatusBadge status={m.status} />}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={UsersRound} title="You haven't joined a fan club yet." message="Find a verified club in your city." action={<Button to={city ? `/fan-clubs?citySlug=${city.slug}` : '/fan-clubs'}>Find fan clubs</Button>} className="border-0 bg-transparent py-6 shadow-none" />
            )}
          </Panel>

          <Panel title={`FDFS in ${city?.name || 'your city'}`} icon={Clapperboard} action={<Button to={city ? `/fdfs?citySlug=${city.slug}` : '/fdfs'} variant="ghost" size="sm">All FDFS</Button>}>
            {fdfs.data?.items?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {fdfs.data.items.map((f) => (
                  <FDFSCard key={f._id} fdfs={f} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-fog-400">No FDFS announced yet.</p>
            )}
          </Panel>

          <Panel title="Upcoming city events" icon={CalendarDays} action={<Button to={city ? `/events?citySlug=${city.slug}` : '/events'} variant="ghost" size="sm">All events</Button>}>
            {events.data?.items?.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {events.data.items.map((e) => (
                  <EventCard key={e._id} event={e} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-fog-400">No upcoming events.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Your registrations" icon={Ticket} action={<Button to="/my-events" variant="ghost" size="sm">All</Button>}>
            {upcomingRegs.length ? (
              <ul className="space-y-2.5">
                {upcomingRegs.map((r) => (
                  <li key={r.item._id}>
                    <Link to={`/${r.kind === 'fdfs' ? 'fdfs' : 'events'}/${r.item.slug}`} className="flex items-center justify-between gap-2 text-sm hover:text-gold-300">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-fog-100">{r.kind === 'fdfs' ? `${r.item.movie} FDFS` : r.item.title}</span>
                        <span className="text-xs text-fog-400">{formatDate(r.item.date || r.item.releaseDate)}</span>
                      </span>
                      <StatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fog-400">No upcoming registrations.</p>
            )}
          </Panel>

          <Panel title="Announcements" icon={Megaphone}>
            {announcements.data?.items?.length ? (
              <div className="space-y-2.5">
                {announcements.data.items.map((a) => (
                  <AnnouncementBanner key={a._id} announcement={a} className="p-3" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-fog-400">No announcements right now.</p>
            )}
          </Panel>

          <Panel title="Notifications" icon={Bell} action={<Button to="/notifications" variant="ghost" size="sm">All</Button>}>
            {notifications.data?.items?.length ? (
              <div className="-mx-3">
                {notifications.data.items.map((n) => (
                  <NotificationItem key={n._id} n={n} compact onRead={(id) => markRead.mutate(id)} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-fog-400">No notifications.</p>
            )}
          </Panel>

          <Panel title="Your messages" icon={Mail}>
            {contacts.data?.requests?.length ? (
              <ul className="space-y-3" id="messages">
                {contacts.data.requests.slice(0, 5).map((r) => (
                  <li key={r._id} className="rounded-xl border border-white/5 bg-ink-850 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-fog-100">{r.subject}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-fog-500">
                      To {r.fanClub?.name} · {timeAgo(r.createdAt)}
                    </p>
                    {r.response && <p className="mt-2 border-l-2 border-gold-500/50 pl-3 text-fog-300">{r.response}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fog-400">Messages you send to fan club admins appear here.</p>
            )}
          </Panel>

          <Panel title="Your badges" icon={Award} action={<Button to="/my-badges" variant="ghost" size="sm">All</Button>}>
            {badges.data?.badges?.length ? (
              <div className="flex flex-wrap gap-2">
                {badges.data.badges.map((b) => (
                  <span key={b._id} className="rounded-full border border-gold-500/25 bg-gold-500/5 px-3 py-1 text-xs font-semibold text-gold-300">
                    {b.badge?.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-fog-400">Earn badges by joining clubs and attending events.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
