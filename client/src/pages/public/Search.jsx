import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CalendarDays, Clapperboard, MapPin, Search as SearchIcon, User, UsersRound } from 'lucide-react';
import { communityApi } from '../../api/endpoints.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { Seo } from '../../components/common/Seo.jsx';
import { Avatar, EmptyState, ErrorState, LoadingState, Tabs, VerifiedBadge } from '../../components/ui/Display.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { formatDate } from '../../utils/format.js';

const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'cities', label: 'Cities' },
  { value: 'fanClubs', label: 'Fan clubs' },
  { value: 'events', label: 'Events' },
  { value: 'fdfs', label: 'FDFS' },
  { value: 'users', label: 'SRKians' },
];

function Group({ title, icon: Icon, items, render }) {
  if (!items?.length) return null;
  return (
    <section>
      <h2 className="eyebrow mb-3 flex items-center gap-2">
        <Icon className="size-3.5" aria-hidden /> {title}
      </h2>
      <ul className="card divide-y divide-white/5">{items.map(render)}</ul>
    </section>
  );
}

const Row = ({ to, children }) => (
  <li>
    <Link to={to} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03]">
      {children}
    </Link>
  </li>
);

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const type = params.get('type') || 'all';
  const [page, setPage] = useState(1);
  const dq = useDebounce(q.trim(), 300);

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (dq) next.set('q', dq);
    else next.delete('q');
    setParams(next, { replace: true });
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const suggestions = useQuery({ queryKey: ['suggest', dq], queryFn: () => communityApi.suggestions(dq), enabled: dq.length >= 1 && dq.length < 2 });
  const res = useQuery({
    queryKey: ['search', dq, type, page],
    queryFn: () => communityApi.search({ q: dq, type, page, limit: 10 }),
    enabled: dq.length >= 2,
    placeholderData: keepPreviousData,
  });
  const d = res.data;
  const perGroupFull = d && ['cities', 'fanClubs', 'events', 'fdfs', 'users'].some((k) => d[k]?.length === 10);

  return (
    <>
      <Seo title={dq ? `Search: ${dq}` : 'Search'} noindex />
      <div className="container-page py-10">
        <h1 className="display mb-5 text-5xl text-fog-100">Search</h1>
        <label className="relative block">
          <span className="sr-only">Search</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-fog-400" aria-hidden />
          <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cities, fan clubs, events, FDFS, SRKians…" className="field h-14 rounded-2xl pl-12 text-base" />
        </label>
        <Tabs
          className="my-5"
          value={type}
          onChange={(v) => {
            const next = new URLSearchParams(params);
            if (v === 'all') next.delete('type');
            else next.set('type', v);
            setParams(next, { replace: true });
            setPage(1);
          }}
          tabs={TYPES}
        />
        {suggestions.data?.items?.length > 0 && dq.length < 2 && (
          <ul className="card mb-6 divide-y divide-white/5">
            {suggestions.data.items.map((s) => (
              <Row key={s.href} to={s.href}>
                <span className="text-fog-100">{s.label}</span>
                <span className="text-xs text-fog-500">{s.sub}</span>
              </Row>
            ))}
          </ul>
        )}
        {dq.length < 2 ? (
          <EmptyState icon={SearchIcon} title="Start typing to search" message="Try “Nashik”, a fan club name or a movie for FDFS." />
        ) : res.isLoading ? (
          <LoadingState />
        ) : res.isError ? (
          <ErrorState error={res.error} onRetry={res.refetch} />
        ) : d.total === 0 ? (
          <EmptyState icon={SearchIcon} title={`No results for “${dq}”`} message="Check the spelling or try a broader term." />
        ) : (
          <div className="space-y-8">
            <Group
              title="Cities"
              icon={MapPin}
              items={d.cities}
              render={(c) => (
                <Row key={c._id} to={`/cities/${c.slug}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-fog-100">{c.name}</span>
                    <span className="block text-xs text-fog-400">{[c.state?.name, c.country?.name].filter(Boolean).join(', ')}</span>
                  </span>
                  <span className="text-xs text-fog-500">{c.memberCount} SRKians</span>
                </Row>
              )}
            />
            <Group
              title="Fan clubs"
              icon={UsersRound}
              items={d.fanClubs}
              render={(c) => (
                <Row key={c._id} to={`/fan-clubs/${c.slug}`}>
                  <Avatar src={c.logo?.url} name={c.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-semibold text-fog-100">
                      <span className="truncate">{c.name}</span> <VerifiedBadge compact />
                    </span>
                    <span className="block text-xs text-fog-400">{c.city?.name}</span>
                  </span>
                </Row>
              )}
            />
            <Group
              title="FDFS"
              icon={Clapperboard}
              items={d.fdfs}
              render={(f) => (
                <Row key={f._id} to={`/fdfs/${f.slug}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-fog-100">{f.movie} FDFS</span>
                    <span className="block text-xs text-fog-400">
                      {f.city?.name} · {f.fanClub?.name} · {formatDate(f.releaseDate)}
                    </span>
                  </span>
                </Row>
              )}
            />
            <Group
              title="Events"
              icon={CalendarDays}
              items={d.events}
              render={(e) => (
                <Row key={e._id} to={`/events/${e.slug}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-fog-100">{e.title}</span>
                    <span className="block text-xs text-fog-400">
                      {e.city?.name} · {formatDate(e.date)}
                    </span>
                  </span>
                </Row>
              )}
            />
            <Group
              title="SRKians"
              icon={User}
              items={d.users}
              render={(u) => (
                <Row key={u._id} to={`/profile/${u.username}`}>
                  <Avatar src={u.profilePhoto?.url} name={u.fullName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-fog-100">{u.fullName}</span>
                    <span className="block text-xs text-fog-400">@{u.username}</span>
                  </span>
                </Row>
              )}
            />
            {(page > 1 || perGroupFull) && (
              <div className="flex justify-between">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled={!perGroupFull} onClick={() => setPage((p) => p + 1)}>
                  More results
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
