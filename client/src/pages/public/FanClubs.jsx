import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, UsersRound } from 'lucide-react';
import { fanClubApi, locationApi } from '../../api/endpoints.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { Seo } from '../../components/common/Seo.jsx';
import { PageHeader } from '../../components/common/Reveal.jsx';
import { FanClubCard } from '../../components/cards/Cards.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select } from '../../components/ui/Form.jsx';
import { CardSkeletonGrid, EmptyState, ErrorState, Pagination } from '../../components/ui/Display.jsx';

export default function FanClubs() {
  const [params, setParams] = useSearchParams();
  const get = (k, d = '') => params.get(k) || d;
  const page = Number(get('page', 1));
  const f = { country: get('country'), state: get('state'), city: get('city'), citySlug: get('citySlug'), q: get('q'), sort: get('sort', 'popular'), active: get('active') };
  const dq = useDebounce(f.q, 300);
  const set = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    if (k === 'country') ['state', 'city', 'citySlug'].forEach((x) => next.delete(x));
    if (k === 'state') ['city', 'citySlug'].forEach((x) => next.delete(x));
    if (k === 'city') next.delete('citySlug');
    setParams(next, { replace: true });
  };

  const countries = useQuery({ queryKey: ['countries'], queryFn: locationApi.countries });
  const states = useQuery({ queryKey: ['states', f.country], queryFn: () => locationApi.states(f.country), enabled: Boolean(f.country) });
  const cities = useQuery({ queryKey: ['cities', 'by-state', f.state], queryFn: () => locationApi.cities({ state: f.state, limit: 100, sort: 'name' }), enabled: Boolean(f.state) });
  const list = useQuery({
    queryKey: ['fan-clubs', { ...f, q: dq, page }],
    queryFn: () => fanClubApi.list({ ...f, q: dq, page, limit: 12 }),
    placeholderData: keepPreviousData,
  });

  const cityLabel = f.citySlug ? f.citySlug.replace(/-/g, ' ') : '';

  return (
    <>
      <Seo title={cityLabel ? `SRK Fan Clubs in ${cityLabel}` : 'SRK Fan Club Directory'} description="Discover verified Shah Rukh Khan fan clubs by city, state and country. Connect with admins and join your local club." />
      <PageHeader eyebrow="Fan club directory" title="Find your fan club" subtitle="Every club listed here has been verified by the platform team.">
        <Button to="/fan-clubs/register" icon={Plus} variant="gold">
          Register your fan club
        </Button>
      </PageHeader>

      <div className="container-page py-10">
        <div className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <Input className="lg:col-span-2" aria-label="Search fan clubs" placeholder="Search by club name…" value={f.q} onChange={(e) => set('q', e.target.value)} />
          <Select aria-label="Country" value={f.country} onChange={(e) => set('country', e.target.value)} placeholder="All countries" options={(countries.data?.countries || []).map((c) => ({ value: c._id, label: c.name }))} />
          <Select aria-label="State" value={f.state} disabled={!f.country} onChange={(e) => set('state', e.target.value)} placeholder="All states" options={(states.data?.states || []).map((s) => ({ value: s._id, label: s.name }))} />
          <Select aria-label="City" value={f.city} disabled={!f.state} onChange={(e) => set('city', e.target.value)} placeholder="All cities" options={(cities.data?.items || []).map((c) => ({ value: c._id, label: c.name }))} />
          <Select
            aria-label="Sort"
            value={f.sort}
            onChange={(e) => set('sort', e.target.value)}
            options={[
              { value: 'popular', label: 'Popular' },
              { value: 'newest', label: 'Newest' },
              { value: 'largest', label: 'Largest' },
              { value: 'alphabetical', label: 'A → Z' },
            ]}
          />
          <label className="flex items-center gap-2.5 text-sm text-fog-300 sm:col-span-2 lg:col-span-6">
            <input type="checkbox" className="size-4 accent-[var(--color-gold-500)]" checked={f.active === 'true'} onChange={(e) => set('active', e.target.checked ? 'true' : '')} />
            Active only — clubs with upcoming events or FDFS
          </label>
          {f.citySlug && (
            <p className="text-sm text-fog-400 sm:col-span-2 lg:col-span-6">
              Showing clubs in <span className="font-semibold text-fog-100 capitalize">{cityLabel}</span> ·{' '}
              <button className="text-gold-300 underline" onClick={() => set('citySlug', '')}>
                clear
              </button>
            </p>
          )}
        </div>

        {list.isLoading ? (
          <CardSkeletonGrid />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : list.data.items.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={cityLabel ? `No fan clubs found in ${cityLabel}.` : 'No fan clubs match these filters.'}
            message="Start one! Register your club and get it verified."
            action={<Button to="/fan-clubs/register">Register a fan club</Button>}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.data.items.map((c) => (
                <FanClubCard key={c._id} club={c} />
              ))}
            </div>
            <Pagination pagination={list.data.pagination} onPage={(p) => set('page', String(p))} />
          </>
        )}
      </div>
    </>
  );
}
