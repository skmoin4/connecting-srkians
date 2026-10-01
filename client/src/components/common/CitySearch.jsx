import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircle, MapPin, Search } from 'lucide-react';
import { locationApi } from '../../api/endpoints.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { cn } from '../../utils/format.js';

/** Type-ahead city search ("Nashik") with keyboard-accessible suggestions (ARIA combobox). */
export function CitySearch({ className, placeholder = 'Type your city — e.g. Nashik', onSelect, size = 'lg' }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const debounced = useDebounce(q.trim(), 250);
  const navigate = useNavigate();
  const listId = useId();

  const { data, isFetching } = useQuery({
    queryKey: ['city-search', debounced],
    queryFn: () => locationApi.search(debounced),
    enabled: debounced.length >= 1,
    staleTime: 60 * 1000,
  });
  const results = data?.cities || [];

  const choose = (city) => {
    setOpen(false);
    setQ(city.name);
    if (onSelect) onSelect(city);
    else navigate(`/cities/${city.slug}`);
  };

  const onKeyDown = (e) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      <Search className={cn('pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fog-400', size === 'lg' ? 'size-5' : 'size-4')} aria-hidden />
      <input
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        aria-label="Search your city"
        value={q}
        placeholder={placeholder}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        className={cn('field pl-12', size === 'lg' ? 'h-14 rounded-2xl text-base' : 'h-11')}
      />
      {isFetching && <LoaderCircle className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-fog-400" aria-hidden />}
      {open && debounced && (
        <ul id={listId} role="listbox" className="absolute z-40 mt-2 max-h-80 w-full overflow-auto rounded-2xl border border-white/10 bg-ink-850 p-1.5 shadow-2xl">
          {results.length === 0 && !isFetching && (
            <li className="px-4 py-3 text-sm text-fog-400">
              No cities match “{debounced}”. Your city isn’t listed yet — ask the platform team to add it.
            </li>
          )}
          {results.map((c, i) => (
            <li
              key={c._id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(c);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5', i === active ? 'bg-white/[0.06]' : '')}
            >
              <MapPin className="size-4 shrink-0 text-gold-400" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-fog-100">{c.name}</span>
                <span className="block truncate text-xs text-fog-400">
                  {[c.state?.name, c.country?.name].filter(Boolean).join(', ')}
                </span>
              </span>
              <span className="shrink-0 text-xs text-fog-500">{c.memberCount} SRKians</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
