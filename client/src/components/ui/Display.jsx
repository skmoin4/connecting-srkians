import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';
import { BadgeCheck, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react';
import { cn, initials } from '../../utils/format.js';
import { VERIFIED_TOOLTIP } from '../../constants/index.js';
import { errorMessage } from '../../api/client.js';
import { Button } from './Button.jsx';

export function Avatar({ src, name, size = 'md', className }) {
  const [broken, setBroken] = useState(false);
  const sizes = { xs: 'size-7 text-[10px]', sm: 'size-9 text-xs', md: 'size-11 text-sm', lg: 'size-16 text-lg', xl: 'size-24 text-2xl sm:size-28' };
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-ink-700 font-semibold text-gold-300', sizes[size], className)}>
      {src && !broken ? (
        <img src={src} alt={name ? `${name}'s photo` : ''} className="size-full object-cover" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}

const BADGE_TONES = {
  neutral: 'bg-white/5 text-fog-300 border-white/10',
  gold: 'bg-gold-500/10 text-gold-300 border-gold-500/25',
  red: 'bg-crimson-500/10 text-crimson-400 border-crimson-500/25',
  green: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
  blue: 'bg-sky-500/10 text-sky-300 border-sky-500/25',
};

export function Badge({ tone = 'neutral', children, className, icon: Icon }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase', BADGE_TONES[tone], className)}>
      {Icon && <Icon className="size-3" aria-hidden />}
      {children}
    </span>
  );
}

const STATUS_TONES = {
  APPROVED: 'green', ACTIVE: 'green', UPCOMING: 'gold', ONGOING: 'red', GOING: 'green', ATTENDED: 'green', RESOLVED: 'green', ACCEPTED: 'green', RESPONDED: 'green',
  PENDING: 'amber', CHANGES_REQUESTED: 'amber', UNDER_REVIEW: 'amber', NEW: 'amber', INTERESTED: 'blue', DRAFT: 'neutral', READ: 'neutral',
  REJECTED: 'red', SUSPENDED: 'red', CANCELLED: 'red', DISMISSED: 'neutral', COMPLETED: 'neutral', CLOSED: 'neutral', DISABLED: 'red', LEFT: 'neutral', REMOVED: 'red',
};
export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONES[status] || 'neutral'}>{String(status || '').replace(/_/g, ' ')}</Badge>;

/** Platform verification only — tooltip makes clear it isn't official/celebrity verification. */
export function VerifiedBadge({ compact = false, className }) {
  return (
    <span className={cn('group relative inline-flex items-center', className)} tabIndex={0} aria-label={`Verified fan club. ${VERIFIED_TOOLTIP}`}>
      {compact ? (
        <BadgeCheck className="size-4.5 text-gold-400" aria-hidden />
      ) : (
        <Badge tone="gold" icon={BadgeCheck}>
          Verified Fan Club
        </Badge>
      )}
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-center text-xs font-normal normal-case tracking-normal text-fog-200 opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus:opacity-100">
        {VERIFIED_TOOLTIP}
      </span>
    </span>
  );
}

export const DemoBadge = () => <Badge tone="blue">Demo</Badge>;

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-white/[0.06]', className)} aria-hidden />;
}

export function CardSkeletonGrid({ count = 6, className = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' }) {
  return (
    <div className={className} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <Skeleton className="h-36 rounded-none" />
          <div className="space-y-2.5 p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingState({ label = 'Loading…', className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-fog-400', className)} role="status">
      <LoaderCircle className="size-7 animate-spin text-gold-400" aria-hidden />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action, className }) {
  return (
    <div className={cn('card flex flex-col items-center px-6 py-12 text-center', className)}>
      {Icon && (
        <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl border border-gold-500/20 bg-gold-500/5 text-gold-400">
          <Icon className="size-6" aria-hidden />
        </span>
      )}
      <h3 className="text-lg font-semibold text-fog-100">{title}</h3>
      {message && <p className="mt-1.5 max-w-md text-sm text-fog-400">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Something went wrong', className }) {
  const status = error?.response?.status;
  return (
    <div className={cn('card flex flex-col items-center px-6 py-12 text-center', className)} role="alert">
      <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl border border-crimson-500/25 bg-crimson-500/5 text-crimson-400">
        <TriangleAlert className="size-6" aria-hidden />
      </span>
      <h3 className="text-lg font-semibold text-fog-100">{status === 404 ? 'Not found' : title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-fog-400">{errorMessage(error)}</p>
      {onRetry && status !== 404 && (
        <Button variant="secondary" className="mt-5" icon={RefreshCw} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Animated count-up that respects reduced motion. */
export function Counter({ value = 0, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  useEffect(() => {
    if (!inView) return undefined;
    if (reduce) {
      setDisplay(value);
      return undefined;
    }
    const controls = animate(0, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => controls.stop();
  }, [inView, value, reduce]);
  return (
    <span ref={ref} className={className}>
      {display.toLocaleString('en-IN')}
    </span>
  );
}

export function StatCard({ label, value, icon: Icon, hint, tone = 'gold', animated = false }) {
  const tones = { gold: 'text-gold-400 bg-gold-500/10', red: 'text-crimson-400 bg-crimson-500/10', neutral: 'text-fog-300 bg-white/5' };
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.14em] text-fog-400 uppercase">{label}</p>
        {Icon && (
          <span className={cn('inline-flex size-9 items-center justify-center rounded-xl', tones[tone])}>
            <Icon className="size-4.5" aria-hidden />
          </span>
        )}
      </div>
      <p className="display mt-3 text-4xl text-fog-100 sm:text-5xl">{animated ? <Counter value={value || 0} /> : (value ?? 0).toLocaleString('en-IN')}</p>
      {hint && <p className="mt-1 text-xs text-fog-500">{hint}</p>}
    </div>
  );
}

export function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total } = pagination;
  return (
    <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-sm text-fog-400">
        Page <span className="font-semibold text-fog-200">{page}</span> of {pages} · {total.toLocaleString('en-IN')} results
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <span className="hidden sm:inline">Prev</span>
        </Button>
        <Button variant="secondary" size="sm" iconRight={ChevronRight} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <span className="hidden sm:inline">Next</span>
        </Button>
      </div>
    </nav>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div role="tablist" className={cn('scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'h-10 shrink-0 rounded-xl px-4 text-sm font-semibold transition-colors',
            value === t.value ? 'bg-fog-100 text-ink-950' : 'text-fog-300 hover:bg-white/5 hover:text-fog-100'
          )}
        >
          {t.label}
          {t.count != null && <span className="ml-1.5 opacity-60">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, action, className, as: Tag = 'h2' }) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <Tag className="display text-4xl text-fog-100 sm:text-5xl">{title}</Tag>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-fog-400 sm:text-base">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
