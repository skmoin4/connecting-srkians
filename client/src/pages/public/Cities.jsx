import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { locationApi } from '../../api/endpoints.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { Seo } from '../../components/common/Seo.jsx';
import { PageHeader } from '../../components/common/Reveal.jsx';
import { CitySearch } from '../../components/common/CitySearch.jsx';
import { CityCard } from '../../components/cards/Cards.jsx';
import { Input, Select } from '../../components/ui/Form.jsx';
import { CardSkeletonGrid, EmptyState, ErrorState, Pagination, SectionHeading } from '../../components/ui/Display.jsx';

export default function Cities() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') || 1);
  const country = params.get('country') || '';
  const state = params.get('state') || '';
  const sort = params.get('sort') || 'popular';
  const q = params.get('q') || '';
  const dq = useDebounce(q, 300);
  const set = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    if (k === 'country') next.delete('state');
    setParams(next, { replace: true });
  };

  const countries = useQuery({ queryKey: ['countries'], queryFn: locationApi.countries });
  const states = useQuery({ queryKey: ['states', country], queryFn: () => locationApi.states(country), enabled: Boolean(country) });
  const featured = useQuery({ queryKey: ['cities', 'featured'], queryFn: () => locationApi.cities({ featured: 'true', limit: 4 }) });
  const list = useQuery({
    queryKey: ['cities', { page, country, state, sort, dq }],
    queryFn: () => locationApi.cities({ page, country, state, sort, q: dq, limit: 24 }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <Seo title="SRK Fan Communities by City" description="Browse SRKian communities city by city. Find SRK fan clubs, events and FDFS near you." />
      <PageHeader eyebrow="City directory" title="Find your city" subtitle="Every city has its SRKians. Find yours and discover local fan clubs, admins and FDFS.">
        <CitySearch className="max-w-2xl" />
      </PageHeader>

      <div className="container-page py-10">
        {!!featured.data?.items?.length && !country && !dq && page === 1 && (
          <section className="mb-12">
            <SectionHeading eyebrow="Spotlight" title="Featured cities" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.data.items.map((c) => (
                <CityCard key={c._id} city={c} />
              ))}
            </div>
          </section>
        )}

        <SectionHeading eyebrow="Directory" title="All cities" />
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input aria-label="Filter cities by name" placeholder="Filter by name…" value={q} onChange={(e) => set('q', e.target.value)} />
          <Select aria-label="Country" value={country} onChange={(e) => set('country', e.target.value)} placeholder="All countries" options={(countries.data?.countries || []).map((c) => ({ value: c._id, label: c.name }))} />
          <Select aria-label="State" value={state} disabled={!country} onChange={(e) => set('state', e.target.value)} placeholder={country ? 'All states' : 'Select a country'} options={(states.data?.states || []).map((s) => ({ value: s._id, label: s.name }))} />
          <Select
            aria-label="Sort cities"
            value={sort}
            onChange={(e) => set('sort', e.target.value)}
            options={[
              { value: 'popular', label: 'Most SRKians' },
              { value: 'name', label: 'Alphabetical' },
              { value: 'newest', label: 'Newest' },
            ]}
          />
        </div>

        {list.isLoading ? (
          <CardSkeletonGrid count={8} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : list.data.items.length === 0 ? (
          <EmptyState icon={MapPin} title="No cities found" message="Try a different name or filter. New cities are added by the platform team as communities grow." />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {list.data.items.map((c) => (
                <CityCard key={c._id} city={c} />
              ))}
            </div>
            <Pagination pagination={list.data.pagination} onPage={(p) => set('page', String(p))} />
          </>
        )}
      </div>
    </>
  );
}
