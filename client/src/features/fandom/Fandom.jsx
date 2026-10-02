import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Flame, PlayCircle, Sparkles, Trophy } from 'lucide-react';
import { communityApi, momentApi, movieApi } from '../../api/endpoints.js';
import { Reveal } from '../../components/common/Reveal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState, ErrorState, LoadingState, SectionHeading } from '../../components/ui/Display.jsx';
import { cn, compact, formatDateLong } from '../../utils/format.js';

const DAY = 24 * 60 * 60 * 1000;

/** Whole days from today until `date`, floored at zero so a passed date reads as "today". */
const daysUntil = (date) => {
  const t = new Date(date);
  const now = new Date();
  const diff = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round(diff / DAY));
};

function split(date) {
  const ms = new Date(date).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor(s / 3600) % 24, minutes: Math.floor(s / 60) % 60, seconds: s % 60 };
}

function Countdown({ date }) {
  const [parts, setParts] = useState(() => split(date));

  useEffect(() => {
    setParts(split(date));
    const id = setInterval(() => setParts(split(date)), 1000);
    return () => clearInterval(id);
  }, [date]);

  if (!parts) return null;
  return (
    <ul className="flex gap-2 sm:gap-3" aria-label={`${parts.days} days until release`}>
      {[
        ['Days', parts.days],
        ['Hrs', parts.hours],
        ['Min', parts.minutes],
        ['Sec', parts.seconds],
      ].map(([label, value]) => (
        <li key={label} className="min-w-[3.4rem] rounded-xl border border-gold-500/25 bg-ink-900/70 px-2 py-2 text-center sm:min-w-[4.5rem] sm:px-3 sm:py-3">
          <span className="display block text-2xl leading-none text-fog-100 tabular-nums sm:text-4xl">{String(value).padStart(2, '0')}</span>
          <span className="mt-1 block text-[10px] font-semibold tracking-[0.16em] text-fog-400 uppercase">{label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Homepage hero for the next SRK release. Renders nothing until an admin adds a dated film. */
export function MovieCountdown() {
  const { data } = useQuery({ queryKey: ['movie-countdown'], queryFn: movieApi.countdown, staleTime: 5 * 60 * 1000 });
  const movie = data?.movie;
  if (!movie) return null;

  return (
    <section className="container-page py-10 sm:py-14">
      <Reveal className="grain relative overflow-hidden rounded-3xl border border-gold-500/20 bg-gradient-to-br from-crimson-700/25 via-ink-900 to-ink-900">
        {movie.banner?.url && <img src={movie.banner.url} alt="" className="absolute inset-0 size-full object-cover opacity-25" />}
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-10">
          {movie.poster?.url && (
            <img
              src={movie.poster.url}
              alt={`${movie.title} poster`}
              className="h-44 w-32 shrink-0 self-start rounded-xl object-cover ring-1 ring-white/10 sm:h-56 sm:w-40"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="eyebrow mb-2">Next release</p>
            <h2 className="display text-4xl text-fog-100 sm:text-6xl">{movie.title}</h2>
            {movie.tagline && <p className="mt-2 text-fog-300">{movie.tagline}</p>}
            {movie.releaseDate && <p className="mt-1 text-sm text-fog-400">{formatDateLong(movie.releaseDate)}</p>}
            {movie.releaseDate && (
              <div className="mt-5">
                <Countdown date={movie.releaseDate} />
              </div>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button to={`/movies/${movie.slug}`} iconRight={ArrowRight}>
                Find your city&apos;s FDFS
              </Button>
              {movie.trailerUrl && (
                <Button href={movie.trailerUrl} variant="outline" icon={PlayCircle}>
                  Watch trailer
                </Button>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/**
 * Banner for a moment being celebrated right now (2 November, a film anniversary).
 * Hidden the rest of the year, so the homepage only mentions it when it means something.
 */
export function MomentBanner() {
  const { data } = useQuery({ queryKey: ['moments-live'], queryFn: momentApi.live, staleTime: 10 * 60 * 1000 });
  const moment = data?.items?.[0];
  if (!moment) return null;

  return (
    <section className="container-page pt-10 sm:pt-14">
      <Reveal className="grain relative overflow-hidden rounded-2xl border border-gold-500/30 bg-gradient-to-r from-gold-500/10 via-ink-900 to-ink-900 p-5 sm:p-7">
        <Sparkles className="absolute -top-4 -right-4 size-28 text-gold-500/10" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow mb-1.5">{moment.years ? `${moment.years} years` : 'Today'} · {moment.subtitle || 'Celebrating now'}</p>
            <h2 className="display text-3xl text-fog-100 sm:text-4xl">{moment.title}</h2>
            {moment.description && <p className="mt-2 max-w-2xl text-sm text-fog-300">{moment.description}</p>}
            {moment.badge && (
              <p className="mt-3 text-xs text-gold-400">
                Check in at any event or FDFS today to earn the {moment.badge.name} badge.
              </p>
            )}
          </div>
          <Button to="/events" variant="gold" iconRight={ArrowRight} className="shrink-0">
            Find something near you
          </Button>
        </div>
      </Reveal>
    </section>
  );
}

/**
 * Moments that haven't arrived yet — a quieter counterpart to the live banner.
 * Owns its heading so that once every moment for the year has passed, the whole block
 * disappears instead of leaving a titled empty space.
 */
export function MomentStrip({ limit = 3, heading }) {
  const { data } = useQuery({ queryKey: ['moments'], queryFn: momentApi.list, staleTime: 60 * 60 * 1000 });
  const upcoming = (data?.items || []).filter((m) => !m.live && m.daysAway >= 0).slice(0, limit);
  if (!upcoming.length) return null;

  return (
    <div className="mt-14">
      {heading && <SectionHeading eyebrow={heading.eyebrow} title={heading.title} subtitle={heading.subtitle} />}
      <ul className="grid gap-3 sm:grid-cols-3">
      {upcoming.map((m) => (
        <li key={m.code} className="card p-4">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-fog-500 uppercase">
            {m.daysAway === 0 ? 'Today' : `In ${m.daysAway} day${m.daysAway === 1 ? '' : 's'}`}
          </p>
          <p className="mt-1 font-semibold text-fog-100">{m.title}</p>
          {m.subtitle && <p className="mt-0.5 text-sm text-fog-400">{m.subtitle}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

const RANK_TONE = ['text-gold-400', 'text-fog-200', 'text-[#c88a52]'];

/**
 * City-vs-city standings for the current month. Points come from this month's transactions only,
 * so the table resets on the 1st and a city that started late can still win it back.
 */
const useCityRace = (limit) =>
  useQuery({ queryKey: ['city-race', limit], queryFn: () => communityApi.cityRace({ limit }), staleTime: 5 * 60 * 1000 });

const resetCopy = (monthEnd) => {
  if (!monthEnd) return undefined;
  const days = daysUntil(monthEnd);
  return `Points earned since the 1st. Standings reset in ${days} day${days === 1 ? '' : 's'}.`;
};

/** The standings table on its own, for pages that bring their own heading. */
export function CityRaceBoard({ limit = 10 }) {
  const { data, isLoading, isError, error, refetch } = useCityRace(limit);
  const items = data?.items || [];
  const leader = items[0]?.points || 1;

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!items.length) {
    return <EmptyState icon={Flame} title="No points earned yet this month" message="Attend an event or FDFS to put your city on the board." />;
  }

  return (
    <>
      <div className="card overflow-hidden p-0">
        <ol>
          {items.map((row) => (
            <li key={row.city.slug} className="relative border-b border-white/5 last:border-0">
              {/* Bar length is relative to the leader, so the gap is readable at a glance. */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-crimson-700/25 to-transparent"
                style={{ width: `${Math.max(6, Math.round((row.points / leader) * 100))}%` }}
                aria-hidden
              />
              <Link to={`/cities/${row.city.slug}`} className="relative flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.03] sm:px-5">
                <span className={cn('display w-7 shrink-0 text-xl tabular-nums sm:text-2xl', RANK_TONE[row.rank - 1] || 'text-fog-500')}>{row.rank}</span>
                {row.rank === 1 && <Trophy className="size-4 shrink-0 text-gold-400" aria-hidden />}
                <span className="min-w-0 flex-1 truncate font-semibold text-fog-100">{row.city.name}</span>
                <span className="hidden shrink-0 text-xs text-fog-500 sm:inline">
                  {compact(row.srkians)} SRKian{row.srkians === 1 ? '' : 's'}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-gold-400 tabular-nums">
                  <Flame className="size-3.5" aria-hidden />
                  {compact(row.points)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-3 text-xs text-fog-500">{resetCopy(data?.monthEnd)}</p>
    </>
  );
}

/** Homepage section. Stays hidden until at least one city has scored this month. */
export function CityRace({ limit = 6 }) {
  const { data, isLoading } = useCityRace(limit);
  const items = data?.items || [];
  const leader = items[0]?.points || 1;

  if (isLoading || !items.length) return null;

  return (
    <section className="container-page pb-16 sm:pb-20">
      <SectionHeading
        eyebrow="This month"
        title="City race"
        subtitle={resetCopy(data?.monthEnd)}
        action={
          <Button to="/leaderboard?board=cities" variant="ghost" iconRight={ArrowRight}>
            Full standings
          </Button>
        }
      />
      <Reveal className="card overflow-hidden p-0">
        <ol>
          {items.map((row) => (
            <li key={row.city.slug} className="relative border-b border-white/5 last:border-0">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-crimson-700/25 to-transparent"
                style={{ width: `${Math.max(6, Math.round((row.points / leader) * 100))}%` }}
                aria-hidden
              />
              <Link to={`/cities/${row.city.slug}`} className="relative flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.03] sm:px-5">
                <span className={cn('display w-7 shrink-0 text-xl tabular-nums sm:text-2xl', RANK_TONE[row.rank - 1] || 'text-fog-500')}>{row.rank}</span>
                {row.rank === 1 && <Trophy className="size-4 shrink-0 text-gold-400" aria-hidden />}
                <span className="min-w-0 flex-1 truncate font-semibold text-fog-100">{row.city.name}</span>
                <span className="hidden shrink-0 text-xs text-fog-500 sm:inline">
                  {compact(row.srkians)} SRKian{row.srkians === 1 ? '' : 's'}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-gold-400 tabular-nums">
                  <Flame className="size-3.5" aria-hidden />
                  {compact(row.points)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}
