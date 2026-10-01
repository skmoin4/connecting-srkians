import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Clapperboard } from 'lucide-react';
import { fdfsApi, locationApi } from '../../api/endpoints.js';
import { Seo } from '../../components/common/Seo.jsx';
import { PageHeader } from '../../components/common/Reveal.jsx';
import { FDFSCard } from '../../components/cards/Cards.jsx';
import { Select } from '../../components/ui/Form.jsx';
import { CardSkeletonGrid, EmptyState, ErrorState, Pagination, Tabs } from '../../components/ui/Display.jsx';

export default function Fdfs() {
  const [params, setParams] = useSearchParams();
  const get = (k, d = '') => params.get(k) || d;
  const f = { when: get('when', 'upcoming'), movie: get('movie'), country: get('country'), state: get('state'), city: get('city'), citySlug: get('citySlug') };
  const page = Number(get('page', 1));
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
  const list = useQuery({ queryKey: ['fdfs', f, page], queryFn: () => fdfsApi.list({ ...f, page, limit: 12 }), placeholderData: keepPreviousData });

  const cityName = f.citySlug?.replace(/-/g, ' ');
  return (
    <>
      <Seo title={cityName ? `SRK FDFS Events in ${cityName}` : 'SRK FDFS — First Day First Show'} description="City-by-city First Day First Show plans by verified SRK fan clubs. Theatre, show time and meeting points — straight from the organisers." />
      <PageHeader eyebrow="First day · First show" title="FDFS" subtitle="Nothing beats the first show with your SRKian family. Find your city's FDFS and say “I'm in”." />
      <div className="container-page py-10">
        <Tabs
          className="mb-5"
          value={f.when}
          onChange={(v) => set('when', v === 'upcoming' ? '' : v)}
          tabs={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
          ]}
        />
        <div className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select aria-label="Movie" value={f.movie} onChange={(e) => set('movie', e.target.value)} placeholder="All movies" options={(list.data?.movies || []).map((m) => ({ value: m, label: m }))} />
          <Select aria-label="Country" value={f.country} onChange={(e) => set('country', e.target.value)} placeholder="All countries" options={(countries.data?.countries || []).map((c) => ({ value: c._id, label: c.name }))} />
          <Select aria-label="State" value={f.state} disabled={!f.country} onChange={(e) => set('state', e.target.value)} placeholder="All states" options={(states.data?.states || []).map((s) => ({ value: s._id, label: s.name }))} />
          <Select aria-label="City" value={f.city} disabled={!f.state} onChange={(e) => set('city', e.target.value)} placeholder="All cities" options={(cities.data?.items || []).map((c) => ({ value: c._id, label: c.name }))} />
        </div>
        {list.isLoading ? (
          <CardSkeletonGrid />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : list.data.items.length === 0 ? (
          <EmptyState icon={Clapperboard} title="No FDFS announced yet." message={cityName ? `Nothing in ${cityName} yet — fan clubs post FDFS as soon as plans are confirmed.` : 'Fan clubs post FDFS as soon as plans are confirmed.'} />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {list.data.items.map((x) => (
                <FDFSCard key={x._id} fdfs={x} />
              ))}
            </div>
            <Pagination pagination={list.data.pagination} onPage={(p) => set('page', String(p))} />
          </>
        )}
      </div>
    </>
  );
}
