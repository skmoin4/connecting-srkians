import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../utils/format.js';

/**
 * Two-column shell for the fan club and admin panels. On mobile the sidebar becomes a
 * horizontally scrollable pill bar so every section stays reachable.
 */
export default function DashboardLayout({ title, subtitle, nav, header }) {
  return (
    <div className="container-page py-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-2">{subtitle}</p>
          <h1 className="display text-4xl text-fog-100 sm:text-5xl">{title}</h1>
        </div>
        {header}
      </div>
      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <nav aria-label={`${title} sections`} className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {nav.map(({ to, label, icon: Icon, end, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex h-10 shrink-0 items-center gap-2.5 rounded-xl px-3.5 text-sm font-medium whitespace-nowrap transition-colors lg:h-11',
                    isActive ? 'bg-fog-100 text-ink-950' : 'text-fog-300 hover:bg-white/5 hover:text-fog-100'
                  )
                }
              >
                {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
                <span className="flex-1">{label}</span>
                {badge > 0 && <span className="rounded-full bg-crimson-500 px-1.5 text-[10px] font-bold text-white">{badge}</span>}
              </NavLink>
            ))}
          </nav>
        </aside>
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
