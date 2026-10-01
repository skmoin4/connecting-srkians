import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, CalendarDays, Clapperboard, Copy, Crown, Gift, Plus, Share2, UsersRound } from 'lucide-react';
import { communityApi, fanClubApi, userApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { BadgeIcon } from '../../components/common/BadgeIcon.jsx';
import { JoinClubButton } from '../../components/common/JoinClubButton.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Avatar, EmptyState, ErrorState, LoadingState, StatCard, StatusBadge, Tabs, VerifiedBadge } from '../../components/ui/Display.jsx';
import { formatDate, timeAgo } from '../../utils/format.js';
import { SITE_URL } from '../../constants/index.js';

function Shell({ eyebrow, title, action, children }) {
  return (
    <div className="container-page max-w-5xl py-8 sm:py-12">
      <Seo title={title} noindex />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">{eyebrow}</p>
          <h1 className="display text-5xl text-fog-100">{title}</h1>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function MyEvents() {
  const [tab, setTab] = useState('upcoming');
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['me', 'registrations'], queryFn: userApi.myRegistrations });
  const rows = [
    ...(data?.fdfs || []).map((r) => ({ kind: 'fdfs', status: r.status, at: r.fdfs.releaseDate, title: `${r.fdfs.movie} FDFS`, slug: r.fdfs.slug, city: r.fdfs.city?.name, club: r.fdfs.fanClub?.name, itemStatus: r.fdfs.status })),
    ...(data?.events || []).map((r) => ({ kind: 'event', status: r.status, at: r.event.date, title: r.event.title, slug: r.event.slug, city: r.event.city?.name, club: r.event.fanClub?.name, itemStatus: r.event.status })),
  ]
    .filter((r) => (tab === 'upcoming' ? ['UPCOMING', 'ONGOING'].includes(r.itemStatus) : !['UPCOMING', 'ONGOING'].includes(r.itemStatus)))
    .sort((a, b) => (tab === 'upcoming' ? new Date(a.at) - new Date(b.at) : new Date(b.at) - new Date(a.at)));

  return (
    <Shell eyebrow="Your plans" title="My events & FDFS">
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]} />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title={tab === 'upcoming' ? 'No upcoming registrations' : 'Nothing here yet'} message="Find an event or FDFS in your city and tap “I'm Going”." action={<Button to="/events">Browse events</Button>} />
      ) : (
        <ul className="card divide-y divide-white/5">
          {rows.map((r) => (
            <li key={`${r.kind}-${r.slug}`}>
              <Link to={`/${r.kind === 'fdfs' ? 'fdfs' : 'events'}/${r.slug}`} className="flex items-center gap-4 p-4 hover:bg-white/[0.03]">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-gold-400">
                  {r.kind === 'fdfs' ? <Clapperboard className="size-5" aria-hidden /> : <CalendarDays className="size-5" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-fog-100">{r.title}</span>
                  <span className="block truncate text-xs text-fog-400">
                    {formatDate(r.at)} · {r.city}
                    {r.club ? ` · ${r.club}` : ''}
                  </span>
                </span>
                <StatusBadge status={r.itemStatus === 'CANCELLED' ? 'CANCELLED' : r.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

export function MyFanClub() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['me', 'fan-clubs'], queryFn: userApi.myFanClubs });
  const managed = useQuery({ queryKey: ['managed-clubs'], queryFn: fanClubApi.managed });
  const applications = (managed.data?.clubs || []).filter((c) => c.status !== 'APPROVED');

  return (
    <Shell eyebrow="Membership" title="My fan club" action={<Button to="/fan-clubs/register" icon={Plus} variant="outline">Register a club</Button>}>
      {applications.length > 0 && (
        <section className="mb-8">
          <h2 className="eyebrow mb-3">Your applications</h2>
          <div className="space-y-3">
            {applications.map((c) => (
              <div key={c._id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <Avatar src={c.logo?.url} name={c.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-fog-100">{c.name}</p>
                  <p className="text-xs text-fog-400">
                    {c.city?.name} · submitted {timeAgo(c.createdAt)}
                  </p>
                  {c.reviewNote && <p className="mt-1 text-sm text-amber-200">Reviewer note: {c.reviewNote}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={c.status} />
                  {c.status === 'CHANGES_REQUESTED' && (
                    <Button size="sm" to="/fan-club/settings">
                      Update & resubmit
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {(managed.data?.clubs || []).some((c) => c.status === 'APPROVED') && (
        <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-gold-500/25 bg-gold-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 font-semibold text-gold-300">
            <Crown className="size-5" aria-hidden /> You manage a verified fan club
          </p>
          <Button to="/fan-club/dashboard" variant="gold">
            Open fan club dashboard
          </Button>
        </div>
      )}
      <h2 className="eyebrow mb-3">Memberships</h2>
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data.memberships.length ? (
        <EmptyState icon={UsersRound} title="You haven't joined a fan club yet." message="Find a verified fan club in your city." action={<Button to="/fan-clubs">Find fan clubs</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.memberships.map((m) => (
            <div key={m.fanClub._id} className="card flex items-center gap-4 p-4">
              <Avatar src={m.fanClub.logo?.url} name={m.fanClub.name} size="lg" />
              <div className="min-w-0 flex-1">
                <Link to={`/fan-clubs/${m.fanClub.slug}`} className="flex items-center gap-1.5 font-semibold text-fog-100 hover:text-gold-300">
                  <span className="truncate">{m.fanClub.name}</span> {m.fanClub.status === 'APPROVED' && <VerifiedBadge compact />}
                </Link>
                <p className="text-xs text-fog-400">
                  {m.fanClub.city?.name} · {m.fanClub.memberCount} members · {m.role === 'ADMIN' ? 'Admin' : m.status === 'PENDING' ? 'Request pending' : `Joined ${formatDate(m.joinedAt)}`}
                </p>
              </div>
              {m.role !== 'ADMIN' && <JoinClubButton club={{ ...m.fanClub, myMembership: m.status }} size="sm" />}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

const REASON_LABELS = {
  PROFILE_COMPLETE: 'Completed profile',
  JOIN_CITY: 'Joined city community',
  JOIN_VERIFIED_FANCLUB: 'Joined a verified fan club',
  JOIN_EVENT: 'Registered for an event',
  ATTEND_EVENT: 'Attended an event',
  FDFS_JOIN: 'Joined an FDFS',
  FDFS_ATTEND: 'Attended an FDFS',
  REFERRAL: 'Successful referral',
  ADMIN_AWARD: 'Awarded by admin',
  COMMUNITY_CONTRIBUTION: 'Community contribution',
};

export function MyBadges() {
  const { user } = useAuth();
  const mine = useQuery({ queryKey: ['me', 'badges'], queryFn: userApi.myBadges });
  const all = useQuery({ queryKey: ['badges'], queryFn: communityApi.badges });
  const owned = new Set((mine.data?.badges || []).map((b) => b.badge?._id));

  return (
    <Shell eyebrow="Achievements" title="Badges & points">
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Community points" value={user.totalPoints} icon={Award} />
        <StatCard label="Badges earned" value={owned.size} icon={Crown} />
        <div className="col-span-2 sm:col-span-1">
          <Button to="/leaderboard" variant="secondary" className="h-full w-full">
            View leaderboard
          </Button>
        </div>
      </div>
      {mine.isLoading || all.isLoading ? (
        <LoadingState />
      ) : (
        <>
          <h2 className="eyebrow mb-3">All badges</h2>
          <ul className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(all.data?.items || []).map((b) => {
              const has = owned.has(b._id);
              return (
                <li key={b._id} className={`card flex items-center gap-3 p-4 ${has ? 'border-gold-500/30' : 'opacity-60'}`}>
                  <span className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl ${has ? 'bg-gold-500/15 text-gold-400' : 'bg-white/5 text-fog-500'}`}>
                    <BadgeIcon name={b.icon} className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-fog-100">{b.name}</span>
                    <span className="block text-xs text-fog-400">{b.description}</span>
                    <span className="mt-0.5 block text-[10px] font-semibold tracking-wider uppercase">{has ? <span className="text-emerald-300">Earned</span> : <span className="text-fog-500">Locked</span>}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <h2 className="eyebrow mb-3">Points history</h2>
          {mine.data?.history?.length ? (
            <ul className="card divide-y divide-white/5">
              {mine.data.history.map((t) => (
                <li key={t._id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block text-fog-100">{REASON_LABELS[t.reason] || t.reason}</span>
                    {t.note && <span className="block truncate text-xs text-fog-400">{t.note}</span>}
                    <span className="text-xs text-fog-500">{timeAgo(t.createdAt)}</span>
                  </span>
                  <span className={`font-semibold ${t.points >= 0 ? 'text-gold-300' : 'text-crimson-400'}`}>
                    {t.points > 0 ? '+' : ''}
                    {t.points}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Award} title="No points yet" message="Join a fan club or register for an event to start earning." />
          )}
        </>
      )}
    </Shell>
  );
}

export function Referrals() {
  const toast = useToast();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['me', 'referrals'], queryFn: userApi.myReferrals });
  if (isLoading) return <LoadingState className="min-h-[50vh]" />;
  if (isError) return <div className="container-page py-16"><ErrorState error={error} onRetry={refetch} /></div>;
  const link = `${SITE_URL}/join?ref=${data.code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Invite link copied');
    } catch {
      toast.error('Could not copy — select the link manually.');
    }
  };
  const share = () => navigator.share?.({ title: 'Join me on SRKians', text: 'Find your city’s SRK fan club and FDFS with me!', url: link }).catch(() => {});

  return (
    <Shell eyebrow="Invite" title="Invite SRKians">
      <div className="card mb-6 p-5 sm:p-7">
        <Gift className="size-7 text-gold-400" aria-hidden />
        <p className="mt-3 text-fog-300">Share your link. When a friend joins and takes part (joins a fan club, event or FDFS), you earn referral points.</p>
        <p className="mt-4 text-xs tracking-widest text-fog-500 uppercase">Your code</p>
        <p className="display text-4xl text-gold-gradient">{data.code}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input readOnly value={link} className="field flex-1 text-sm" aria-label="Your invite link" onFocus={(e) => e.target.select()} />
          <Button icon={Copy} onClick={copy}>
            Copy
          </Button>
          {typeof navigator !== 'undefined' && navigator.share && (
            <Button variant="secondary" icon={Share2} onClick={share}>
              Share
            </Button>
          )}
        </div>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Link visits" value={data.clicks} />
        <StatCard label="Registrations" value={data.registrations} />
        <StatCard label="Successful" value={data.successful} />
        <StatCard label="Points earned" value={data.points} />
      </div>
      <h2 className="eyebrow mb-3">Recent invites</h2>
      {data.recent.length ? (
        <ul className="card divide-y divide-white/5">
          {data.recent.map((r) => (
            <li key={r._id} className="flex items-center gap-3 px-4 py-3">
              <Avatar src={r.user?.profilePhoto?.url} name={r.user?.fullName} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm text-fog-100">{r.user?.fullName}</span>
              <span className="text-xs text-fog-500">{timeAgo(r.createdAt)}</span>
              <StatusBadge status={r.status === 'SUCCESSFUL' ? 'ACCEPTED' : r.status === 'REGISTERED' ? 'PENDING' : 'REJECTED'} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={UsersRound} title="No invites yet" message="Share your link with fellow SRKians." />
      )}
      <p className="mt-6 text-xs text-fog-500">To prevent abuse, self-referrals and multiple sign-ups from the same network don’t count, and daily referral rewards are capped.</p>
    </Shell>
  );
}
