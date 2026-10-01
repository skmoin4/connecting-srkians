import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Crown, Trophy } from 'lucide-react';
import { communityApi, fanClubApi, locationApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { PageHeader } from '../../components/common/Reveal.jsx';
import { Select } from '../../components/ui/Form.jsx';
import { Avatar, EmptyState, ErrorState, LoadingState, Pagination, Tabs } from '../../components/ui/Display.jsx';
import { cn } from '../../utils/format.js';

const HOW = [
  ['Complete your profile', 10],
  ['Join your city', 5],
  ['Join a verified fan club', 15],
  ['Register for an event', 20],
  ['Attend an event (QR check-in)', 50],
  ['Say “I’m In” for an FDFS', 20],
  ['Attend an FDFS', 50],
  ['Successful referral', 20],
];

export default function Leaderboard() {
  const { user } = useAuth();
  const [scope, setScope] = useState('global');
  const [id, setId] = useState('');
  const [page, setPage] = useState(1);

  const countries = useQuery({ queryKey: ['countries'], queryFn: locationApi.countries, enabled: scope === 'country' });
  const states = useQuery({ queryKey: ['states', 'all'], queryFn: () => locationApi.states(), enabled: scope === 'state' });
  const cities = useQuery({ queryKey: ['cities', 'all-names'], queryFn: () => locationApi.cities({ limit: 100, sort: 'name' }), enabled: scope === 'city' });
  const clubs = useQuery({ queryKey: ['fan-clubs', 'names'], queryFn: () => fanClubApi.list({ limit: 50, sort: 'alphabetical' }), enabled: scope === 'fanClub' });

  const options = {
    country: (countries.data?.countries || []).map((c) => ({ value: c._id, label: c.name })),
    state: (states.data?.states || []).map((s) => ({ value: s._id, label: s.name })),
    city: (cities.data?.items || []).map((c) => ({ value: c._id, label: c.name })),
    fanClub: (clubs.data?.items || []).map((c) => ({ value: c._id, label: c.name })),
  }[scope];

  const board = useQuery({
    queryKey: ['leaderboard', scope, id, page],
    queryFn: () => communityApi.leaderboard({ scope, id, page, limit: 25 }),
    enabled: scope === 'global' || Boolean(id),
    placeholderData: keepPreviousData,
  });

  const changeScope = (s) => {
    setScope(s);
    setPage(1);
    const defaults = { country: user?.country?._id, state: user?.state?._id, city: user?.city?._id };
    setId(defaults[s] || '');
  };

  return (
    <>
      <Seo title="SRKian Leaderboard" description="Community points earned through real participation — fan clubs, events and FDFS." />
      <PageHeader eyebrow="Leaderboard" title="Top SRKians" subtitle="Points come from real participation — joining clubs, attending events and FDFS. Never from likes or posts." />
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={scope}
              onChange={changeScope}
              tabs={[
                { value: 'global', label: 'Global' },
                { value: 'country', label: 'Country' },
                { value: 'state', label: 'State' },
                { value: 'city', label: 'City' },
                { value: 'fanClub', label: 'Fan Club' },
              ]}
            />
            {scope !== 'global' && (
              <Select aria-label={`Choose ${scope}`} className="sm:w-60" value={id} onChange={(e) => (setId(e.target.value), setPage(1))} placeholder={`Choose ${scope === 'fanClub' ? 'fan club' : scope}`} options={options || []} />
            )}
          </div>
          {scope !== 'global' && !id ? (
            <EmptyState icon={Trophy} title={`Pick a ${scope === 'fanClub' ? 'fan club' : scope}`} />
          ) : board.isLoading ? (
            <LoadingState />
          ) : board.isError ? (
            <ErrorState error={board.error} onRetry={board.refetch} />
          ) : board.data.items.length === 0 ? (
            <EmptyState icon={Trophy} title="No points earned yet" message="Join a fan club or register for an event to get on the board." />
          ) : (
            <>
              <ol className="card divide-y divide-white/5 overflow-hidden">
                {board.data.items.map((r) => (
                  <li key={r.rank} className={cn('flex items-center gap-3 px-4 py-3 sm:gap-4', r.user?._id === user?._id && 'bg-gold-500/[0.06]')}>
                    <span className={cn('display w-9 shrink-0 text-center text-3xl', r.rank <= 3 ? 'text-gold-400' : 'text-fog-500')}>
                      {r.rank === 1 ? <Crown className="mx-auto size-6" aria-label="Rank 1" /> : r.rank}
                    </span>
                    <Avatar src={r.user.profilePhoto?.url} name={r.user.fullName} size="sm" />
                    <div className="min-w-0 flex-1">
                      {r.user.username ? (
                        <Link to={`/profile/${r.user.username}`} className="block truncate font-semibold text-fog-100 hover:text-gold-300">
                          {r.user.fullName}
                        </Link>
                      ) : (
                        <span className="block truncate font-semibold text-fog-300">{r.user.fullName}</span>
                      )}
                      <span className="block truncate text-xs text-fog-500">{r.user.city?.name || ''}</span>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="display block text-2xl text-fog-100">{r.points.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] tracking-widest text-fog-500 uppercase">pts</span>
                    </span>
                  </li>
                ))}
              </ol>
              <Pagination pagination={board.data.pagination} onPage={setPage} />
            </>
          )}
        </div>
        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="eyebrow mb-4">How to earn points</h2>
          <ul className="space-y-2.5 text-sm">
            {HOW.map(([label, pts]) => (
              <li key={label} className="flex justify-between gap-3">
                <span className="text-fog-300">{label}</span>
                <span className="font-semibold text-gold-300">+{pts}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-fog-500">Admins may also award points for verified community contributions.</p>
        </aside>
      </div>
    </>
  );
}
