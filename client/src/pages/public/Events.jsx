import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { eventApi, locationApi } from '../../api/endpoints.js';
import { Seo } from '../../components/common/Seo.jsx';
import { PageHeader } from '../../components/common/Reveal.jsx';
import { EventCard } from '../../components/cards/Cards.jsx';
import { Input, Select } from '../../components/ui/Form.jsx';
import { CardSkeletonGrid, EmptyState, ErrorState, Pagination, Tabs } from '../../components/ui/Display.jsx';
import { EVENT_TYPES } from '../../constants/index.js';

export default function Events() {
  const [params, setParams] = useSearchParams();
  const get = (k, d = '') => params.get(k) || d;
  const f = { when: get('when', 'upcoming'), country: get('country'), state: get('state'), city: get('city'), citySlug: get('citySlug'), eventType: get('eventType'), from: get('from'), to: get('to') };
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
  const list = useQuery({ queryKey: ['events', f, page], queryFn: () => eventApi.list({ ...f, page, limit: 12 }), placeholderData: keepPreviousData });

  return (
    <>
      <Seo title={f.citySlug ? `SRK Fan Events in ${f.citySlug}` : 'SRK Fan Events'} description="Fan meets, birthday celebrations, screenings and charity drives organised by verified SRK fan clubs." />
      <PageHeader eyebrow="Events" title="Fan events near you" subtitle="Meetups, birthday celebrations, screenings and charity drives by verified fan clubs." />
      <div className="container-page py-10">
        <Tabs
          className="mb-5"
          value={f.when}
          onChange={(v) => set('when', v === 'upcoming' ? '' : v)}
          tabs={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
            { value: 'all', label: 'All' },
          ]}
        />
        <div className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <Select aria-label="Country" value={f.country} onChange={(e) => set('country', e.target.value)} placeholder="All countries" options={(countries.data?.countries || []).map((c) => ({ value: c._id, label: c.name }))} />
          <Select aria-label="State" value={f.state} disabled={!f.country} onChange={(e) => set('state', e.target.value)} placeholder="All states" options={(states.data?.states || []).map((s) => ({ value: s._id, label: s.name }))} />
          <Select aria-label="City" value={f.city} disabled={!f.state} onChange={(e) => set('city', e.target.value)} placeholder="All cities" options={(cities.data?.items || []).map((c) => ({ value: c._id, label: c.name }))} />
          <Select aria-label="Event type" value={f.eventType} onChange={(e) => set('eventType', e.target.value)} placeholder="All types" options={Object.entries(EVENT_TYPES).map(([value, label]) => ({ value, label }))} />
          <Input aria-label="From date" type="date" value={f.from} onChange={(e) => set('from', e.target.value)} />
          <Input aria-label="To date" type="date" value={f.to} onChange={(e) => set('to', e.target.value)} />
          {f.citySlug && (
            <p className="text-sm text-fog-400 sm:col-span-2 lg:col-span-6">
              City: <span className="font-semibold text-fog-100 capitalize">{f.citySlug.replace(/-/g, ' ')}</span> ·{' '}
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
          <EmptyState icon={CalendarDays} title={f.when === 'past' ? 'No past events' : 'No upcoming events.'} message="Try another city or date range." />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.data.items.map((e) => (
                <EventCard key={e._id} event={e} />
              ))}
            </div>
            <Pagination pagination={list.data.pagination} onPage={(p) => set('page', String(p))} />
          </>
        )}
      </div>
    </>
  );
}
