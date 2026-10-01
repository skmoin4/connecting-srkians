import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { locationApi } from '../../api/endpoints.js';
import { Select } from '../ui/Form.jsx';
import { cn } from '../../utils/format.js';

/**
 * Country → State → City cascading selector.
 * value = { country, state, city } (ids). onChange receives the next value object.
 */
export function LocationSelector({ value = {}, onChange, errors = {}, required = false, className, layout = 'grid', disabled = false, labels = true }) {
  const { country = '', state = '', city = '' } = value;

  const countriesQ = useQuery({ queryKey: ['countries'], queryFn: locationApi.countries, staleTime: 10 * 60 * 1000 });
  const statesQ = useQuery({ queryKey: ['states', country], queryFn: () => locationApi.states(country), enabled: Boolean(country), staleTime: 10 * 60 * 1000 });
  const citiesQ = useQuery({
    queryKey: ['cities', 'by-state', state],
    queryFn: () => locationApi.cities({ state, limit: 100, sort: 'name' }),
    enabled: Boolean(state),
    staleTime: 5 * 60 * 1000,
  });

  const countries = countriesQ.data?.countries || [];
  const states = statesQ.data?.states || [];
  const cities = citiesQ.data?.items || [];

  // Auto-select when there is only one option (e.g. India at launch).
  useEffect(() => {
    if (!country && countries.length === 1) onChange({ country: countries[0]._id, state: '', city: '' });
  }, [countries, country, onChange]);
  useEffect(() => {
    if (country && !state && states.length === 1) onChange({ country, state: states[0]._id, city: '' });
  }, [states, state, country, onChange]);

  return (
    <div className={cn(layout === 'grid' ? 'grid gap-4 sm:grid-cols-3' : 'space-y-4', className)}>
      <Select
        label={labels ? 'Country' : undefined}
        aria-label="Country"
        required={required}
        value={country}
        disabled={disabled || countriesQ.isLoading}
        error={errors.country}
        placeholder={countriesQ.isLoading ? 'Loading…' : 'Select country'}
        options={countries.map((c) => ({ value: c._id, label: c.name }))}
        onChange={(e) => onChange({ country: e.target.value, state: '', city: '' })}
      />
      <Select
        label={labels ? 'State' : undefined}
        aria-label="State"
        required={required}
        value={state}
        disabled={disabled || !country || statesQ.isLoading}
        error={errors.state}
        placeholder={!country ? 'Select country first' : statesQ.isLoading ? 'Loading…' : 'Select state'}
        options={states.map((s) => ({ value: s._id, label: s.name }))}
        onChange={(e) => onChange({ country, state: e.target.value, city: '' })}
      />
      <Select
        label={labels ? 'City' : undefined}
        aria-label="City"
        required={required}
        value={city}
        disabled={disabled || !state || citiesQ.isLoading}
        error={errors.city}
        placeholder={!state ? 'Select state first' : citiesQ.isLoading ? 'Loading…' : 'Select city'}
        options={cities.map((c) => ({ value: c._id, label: c.name, slug: c.slug }))}
        onChange={(e) => {
          const slug = cities.find((c) => c._id === e.target.value)?.slug;
          onChange({ country, state, city: e.target.value, citySlug: slug });
        }}
      />
    </div>
  );
}
