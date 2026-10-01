import { Link } from 'react-router-dom';
import { Bell, CalendarDays, Clapperboard, Clock, Megaphone, MapPin, Pin, Trash2, Users } from 'lucide-react';
import { cn, compact, dayMonth, formatDate, formatTime, locationLine, timeAgo, instagramUrl } from '../../utils/format.js';
import { EVENT_TYPES, TBA } from '../../constants/index.js';
import { Avatar, Badge, DemoBadge, StatusBadge, VerifiedBadge } from '../ui/Display.jsx';
import { InstagramIcon } from '../ui/BrandIcons.jsx';
import { Button } from '../ui/Button.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { ContactAdminButton } from '../common/Actions.jsx';
import { JoinClubButton } from '../common/JoinClubButton.jsx';

/** Admin-configured default image (Site settings → Default images), else a cinematic gradient. */
function CoverFallback({ label, className, kind }) {
  const { defaultImages } = useSettings();
  const img = kind && defaultImages?.[kind]?.url;
  if (img) return <img src={img} alt="" loading="lazy" className={cn('size-full object-cover', className)} />;
  return (
    <div className={cn('grain relative flex size-full items-end overflow-hidden bg-gradient-to-br from-ink-700 via-ink-850 to-ink-950 p-4', className)} aria-hidden>
      <div className="absolute -top-10 -right-10 size-40 rounded-full bg-crimson-600/20 blur-3xl" />
      <div className="absolute -bottom-12 -left-8 size-36 rounded-full bg-gold-500/10 blur-3xl" />
      <span className="display relative line-clamp-2 text-3xl text-white/15">{label}</span>
    </div>
  );
}

export function CityCard({ city }) {
  return (
    <Link to={`/cities/${city.slug}`} className="card card-hover group block overflow-hidden">
      <div className="relative aspect-[16/10] overflow-hidden">
        {city.coverImage?.url ? (
          <img src={city.coverImage.url} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <CoverFallback label={city.name} kind="cityCover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent" />
        {city.featured && <Badge tone="gold" className="absolute top-3 left-3">Featured</Badge>}
        <div className="absolute inset-x-4 bottom-3">
          <h3 className="display text-3xl text-white">{city.name}</h3>
          <p className="truncate text-xs text-fog-300">{locationLine(city.state, city.country)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <span className="flex items-center gap-1.5 text-fog-300">
          <Users className="size-4 text-gold-400" aria-hidden /> {compact(city.memberCount || 0)} SRKians
        </span>
        <span className="text-fog-400">{city.fanClubCount || 0} fan clubs</span>
      </div>
    </Link>
  );
}

export function FanClubCard({ club, showActions = true }) {
  const verified = club.isVerified ?? club.status === 'APPROVED';
  return (
    <article className="card card-hover flex flex-col overflow-hidden">
      <Link to={`/fan-clubs/${club.slug}`} className="relative block aspect-[16/7] overflow-hidden" tabIndex={-1} aria-hidden>
        {club.coverImage?.url ? <img src={club.coverImage.url} alt="" loading="lazy" className="size-full object-cover" /> : <CoverFallback label="" kind="fanClubCover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 to-transparent" />
      </Link>
      <div className="-mt-9 flex flex-1 flex-col px-4 pb-4">
        <div className="flex items-end gap-3">
          <Avatar src={club.logo?.url} name={club.name} size="lg" className="border-2 border-ink-900" />
          {verified && <VerifiedBadge className="mb-1" />}
        </div>
        <h3 className="mt-3 text-lg leading-snug font-semibold text-fog-100">
          <Link to={`/fan-clubs/${club.slug}`} className="hover:text-gold-300">
            {club.name}
          </Link>
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-fog-400">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{locationLine(club.city, club.state, club.country)}</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fog-300">
          <span className="flex items-center gap-1.5">
            <Users className="size-4 text-gold-400" aria-hidden /> {compact(club.memberCount || 0)} members
          </span>
          {club.instagram && (
            <a href={instagramUrl(club.instagram)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-gold-300">
              <InstagramIcon className="size-4" /> @{club.instagram}
            </a>
          )}
        </div>
        {showActions && (
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <Button to={`/fan-clubs/${club.slug}`} variant="secondary" size="sm" className="flex-1">
              View Club
            </Button>
            <ContactAdminButton fanClub={club} size="sm" variant="ghost" label="Contact" />
            <JoinClubButton club={club} size="sm" />
          </div>
        )}
      </div>
    </article>
  );
}

function DateBlock({ date }) {
  const { day, month } = dayMonth(date);
  return (
    <div className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-white/10 bg-ink-950/80 py-1.5 backdrop-blur">
      <span className="text-[10px] font-bold tracking-widest text-crimson-400">{month}</span>
      <span className="display text-3xl leading-none text-fog-100">{day}</span>
    </div>
  );
}

export function EventCard({ event }) {
  return (
    <Link to={`/events/${event.slug}`} className="card card-hover group flex flex-col overflow-hidden">
      <div className="relative aspect-[16/9] overflow-hidden">
        {event.coverImage?.url ? (
          <img src={event.coverImage.url} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <CoverFallback label={EVENT_TYPES[event.eventType]} kind="eventCover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 to-transparent" />
        <div className="absolute top-3 left-3">
          <DateBlock date={event.date} />
        </div>
        <div className="absolute top-3 right-3 flex gap-1.5">
          {event.isDemo && <DemoBadge />}
          {event.status !== 'UPCOMING' && <StatusBadge status={event.status} />}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <Badge tone="red" className="self-start">{EVENT_TYPES[event.eventType] || 'Event'}</Badge>
        <h3 className="mt-2 line-clamp-2 text-base font-semibold text-fog-100 group-hover:text-gold-300">{event.title}</h3>
        <div className="mt-2 space-y-1 text-sm text-fog-400">
          <p className="flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden /> {formatDate(event.date)}
            {event.startTime && ` · ${formatTime(event.startTime)}`}
          </p>
          <p className="flex items-center gap-1.5 truncate">
            <MapPin className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{event.city?.name}{event.venue ? ` · ${event.venue}` : ''}</span>
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-fog-400">
          <span className="truncate">{event.fanClub?.name || event.organizer?.fullName || ''}</span>
          <span className="shrink-0">
            <span className="font-semibold text-fog-200">{event.counts?.going || 0}</span> going · {event.counts?.interested || 0} interested
          </span>
        </div>
      </div>
    </Link>
  );
}

export function FDFSCard({ fdfs }) {
  return (
    <Link to={`/fdfs/${fdfs.slug}`} className="card card-hover group relative flex overflow-hidden">
      <div className="relative w-28 shrink-0 overflow-hidden sm:w-32">
        {fdfs.poster?.url ? (
          <img src={fdfs.poster.url} alt={`${fdfs.movie} poster`} loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="grain relative flex size-full min-h-44 items-center justify-center bg-gradient-to-b from-crimson-700/40 to-ink-950">
            <Clapperboard className="size-8 text-gold-400/70" aria-hidden />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="red">FDFS</Badge>
          {fdfs.isDemo && <DemoBadge />}
          {fdfs.status !== 'UPCOMING' && <StatusBadge status={fdfs.status} />}
        </div>
        <h3 className="display mt-2 truncate text-3xl text-fog-100 group-hover:text-gold-300">{fdfs.movie}</h3>
        <p className="flex items-center gap-1.5 text-sm text-fog-300">
          <MapPin className="size-3.5 shrink-0" aria-hidden /> {fdfs.city?.name}
        </p>
        <dl className="mt-2 grid grid-cols-1 gap-0.5 text-xs text-fog-400">
          <div className="flex gap-1.5">
            <dt className="text-fog-500">Release:</dt>
            <dd className="text-fog-200">{formatDate(fdfs.releaseDate)}</dd>
          </div>
          <div className="flex min-w-0 gap-1.5">
            <dt className="shrink-0 text-fog-500">Theatre:</dt>
            <dd className="truncate text-fog-200">{fdfs.theatre || TBA}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-fog-500">Show:</dt>
            <dd className="text-fog-200">{fdfs.showTime || TBA}</dd>
          </div>
        </dl>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs">
          <span className="truncate text-fog-400">{fdfs.fanClub?.name}</span>
          <span className="shrink-0 font-semibold text-gold-300">{fdfs.counts?.going || 0} in</span>
        </div>
      </div>
    </Link>
  );
}

export function UserCard({ user, meta, action }) {
  return (
    <div className="card flex items-center gap-3 p-3">
      <Avatar src={user?.profilePhoto?.url} name={user?.fullName} size="md" />
      <div className="min-w-0 flex-1">
        {user?.username ? (
          <Link to={`/profile/${user.username}`} className="block truncate font-semibold text-fog-100 hover:text-gold-300">
            {user.fullName}
          </Link>
        ) : (
          <span className="block truncate font-semibold text-fog-100">{user?.fullName || 'SRKian'}</span>
        )}
        <p className="truncate text-xs text-fog-400">{meta ?? (user?.username ? `@${user.username}` : '')}</p>
      </div>
      {action}
    </div>
  );
}

const NOTIF_ICONS = { FDFS: Clapperboard, EVENT: CalendarDays, ANNOUNCEMENT: Megaphone, FAN_CLUB: Users };

export function NotificationItem({ n, onRead, onDelete, compact: isCompact = false }) {
  const Icon = NOTIF_ICONS[n.type] || Bell;
  const body = (
    <>
      <span className={cn('mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl', n.read ? 'bg-white/5 text-fog-400' : 'bg-crimson-500/15 text-crimson-400')}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-sm', n.read ? 'text-fog-300' : 'font-semibold text-fog-100')}>{n.title}</span>
        {n.message && <span className={cn('mt-0.5 block text-xs text-fog-400', isCompact && 'line-clamp-2')}>{n.message}</span>}
        <span className="mt-1 block text-[11px] text-fog-500">{timeAgo(n.createdAt)}</span>
      </span>
      {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-crimson-500" aria-label="Unread" />}
    </>
  );
  return (
    <div className="group flex items-start gap-2 rounded-xl px-3 py-3 hover:bg-white/[0.03]">
      {n.link ? (
        <Link to={n.link} onClick={() => !n.read && onRead?.(n._id)} className="flex min-w-0 flex-1 items-start gap-3">
          {body}
        </Link>
      ) : (
        <button type="button" onClick={() => !n.read && onRead?.(n._id)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          {body}
        </button>
      )}
      {onDelete && (
        <button onClick={() => onDelete(n._id)} className="rounded-lg p-2 text-fog-500 opacity-100 hover:text-crimson-400 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100" aria-label="Delete notification">
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}

export function AnnouncementBanner({ announcement, className }) {
  const a = announcement;
  const content = (
    <>
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold-500/15 text-gold-400">
        {a.pinned ? <Pin className="size-4" aria-hidden /> : <Megaphone className="size-4" aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-fog-100">{a.title}</span>
        {a.body && <span className="mt-0.5 block text-sm whitespace-pre-line text-fog-300">{a.body}</span>}
        <span className="mt-1 block text-[11px] text-fog-500">
          {[a.fanClub?.name, a.city?.name].filter(Boolean).join(' · ')} {timeAgo(a.createdAt)}
        </span>
      </span>
    </>
  );
  const cls = cn('flex items-start gap-3 rounded-2xl border border-gold-500/15 bg-gradient-to-r from-gold-500/[0.07] to-transparent p-4', className);
  return a.link && a.link.startsWith('/') ? (
    <Link to={a.link} className={cn(cls, 'hover:border-gold-500/35')}>
      {content}
    </Link>
  ) : (
    <div className={cls}>{content}</div>
  );
}
