import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, CalendarDays, Clapperboard, Film, Lock, MapPin, Quote, Settings, Sparkles, UsersRound } from 'lucide-react';
import { BadgeIcon } from '../../components/common/BadgeIcon.jsx';
import { userApi } from '../../api/endpoints.js';
import { Seo } from '../../components/common/Seo.jsx';
import { ReportButton } from '../../components/common/Actions.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { InstagramIcon } from '../../components/ui/BrandIcons.jsx';
import { Avatar, Badge, EmptyState, ErrorState, LoadingState, VerifiedBadge } from '../../components/ui/Display.jsx';
import { formatDate, instagramUrl, locationLine } from '../../utils/format.js';
import { ROLE_LABELS } from '../../constants/index.js';

export default function Profile() {
  const { username } = useParams();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['profile', username], queryFn: () => userApi.profile(username) });

  if (isLoading) return <LoadingState className="min-h-[60vh]" />;
  if (isError) return <div className="container-page py-16"><ErrorState error={error} onRetry={refetch} /></div>;
  const p = data.profile;

  if (p.isPrivate) {
    return (
      <div className="container-page py-16">
        <Seo title={p.fullName} noindex />
        <EmptyState icon={Lock} title={`${p.fullName} keeps their profile private`} message={`@${p.username}`} />
      </div>
    );
  }

  return (
    <>
      <Seo title={`${p.fullName} (@${p.username})`} description={p.bio || `${p.fullName} is an SRKian${p.city ? ` from ${p.city.name}` : ''}.`} image={p.profilePhoto?.url} type="profile" />
      <header className="relative isolate overflow-hidden border-b border-white/5">
        <div className="vignette absolute inset-0 -z-10" aria-hidden />
        <div className="container-page flex flex-col items-center gap-5 py-12 text-center sm:flex-row sm:items-end sm:text-left">
          <Avatar src={p.profilePhoto?.url} name={p.fullName} size="xl" className="border-4 border-ink-900" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {p.role !== 'USER' && <Badge tone="gold">{ROLE_LABELS[p.role]}</Badge>}
            </div>
            <h1 className="display mt-2 text-5xl text-fog-100 sm:text-6xl">{p.fullName}</h1>
            <p className="text-fog-400">@{p.username}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-fog-300 sm:justify-start">
              {p.city && (
                <Link to={`/cities/${p.city.slug}`} className="flex items-center gap-1.5 hover:text-gold-300">
                  <MapPin className="size-4" aria-hidden /> {locationLine(p.city, p.state, p.country)}
                </Link>
              )}
              {p.instagram && (
                <a href={instagramUrl(p.instagram)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-gold-300">
                  <InstagramIcon /> @{p.instagram}
                </a>
              )}
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden /> Joined {formatDate(p.joinedAt, { day: undefined })}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 sm:items-end">
            <p className="display text-5xl text-gold-gradient">{(p.totalPoints || 0).toLocaleString('en-IN')}</p>
            <p className="text-[11px] tracking-[0.2em] text-fog-500 uppercase">Community points</p>
            {p.isOwner && (
              <Button to="/settings" variant="secondary" size="sm" icon={Settings}>
                Edit profile
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container-page grid gap-6 py-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {(p.bio || p.favouriteMovie || p.favouriteDialogue) && (
            <section className="card space-y-4 p-6">
              {p.bio && <p className="leading-relaxed text-fog-200">{p.bio}</p>}
              {p.favouriteMovie && (
                <p className="flex items-center gap-2 text-sm text-fog-300">
                  <Film className="size-4 text-gold-400" aria-hidden /> Favourite movie: <strong className="text-fog-100">{p.favouriteMovie}</strong>
                </p>
              )}
              {p.favouriteDialogue && (
                <blockquote className="flex gap-3 border-l-2 border-crimson-500 pl-4 text-lg text-fog-100 italic">
                  <Quote className="size-5 shrink-0 text-crimson-400" aria-hidden /> {p.favouriteDialogue}
                </blockquote>
              )}
            </section>
          )}

          <section className="card p-6">
            <h2 className="eyebrow mb-4 flex items-center gap-2">
              <Award className="size-3.5" aria-hidden /> Badges
            </h2>
            {p.badges.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {p.badges.map((b) => (
                  <li key={b._id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-ink-850 p-3">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 text-gold-400">
                      <BadgeIcon name={b.icon} className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-fog-100">{b.name}</span>
                      <span className="block truncate text-xs text-fog-400">{b.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fog-400">No badges yet.</p>
            )}
          </section>

          {(p.eventsAttended?.length > 0 || p.fdfsAttended?.length > 0) && (
            <section className="card p-6">
              <h2 className="eyebrow mb-4 flex items-center gap-2">
                <Sparkles className="size-3.5" aria-hidden /> Events attended
              </h2>
              <ul className="space-y-2 text-sm">
                {p.fdfsAttended.map((f) => (
                  <li key={f._id}>
                    <Link to={`/fdfs/${f.slug}`} className="flex items-center gap-2 text-fog-200 hover:text-gold-300">
                      <Clapperboard className="size-4 text-crimson-400" aria-hidden /> {f.movie} FDFS · {formatDate(f.releaseDate)}
                    </Link>
                  </li>
                ))}
                {p.eventsAttended.map((e) => (
                  <li key={e._id}>
                    <Link to={`/events/${e.slug}`} className="flex items-center gap-2 text-fog-200 hover:text-gold-300">
                      <CalendarDays className="size-4 text-gold-400" aria-hidden /> {e.title} · {formatDate(e.date)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className="space-y-6">
          <section className="card p-6">
            <h2 className="eyebrow mb-4 flex items-center gap-2">
              <UsersRound className="size-3.5" aria-hidden /> Fan clubs
            </h2>
            {p.fanClubs.length ? (
              <ul className="space-y-2">
                {p.fanClubs.map((c) => (
                  <li key={c._id}>
                    <Link to={`/fan-clubs/${c.slug}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/[0.03]">
                      <Avatar src={c.logo?.url} name={c.name} size="sm" />
                      <span className="min-w-0 flex-1 truncate font-medium text-fog-100">{c.name}</span>
                      <VerifiedBadge compact />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fog-400">No fan club memberships shown.</p>
            )}
          </section>
          {!p.isOwner && (
            <div className="text-center">
              <ReportButton targetType="USER" targetId={p._id} label="Report profile" />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
