import { EmptyState, ErrorState, LoadingState, Pagination } from '../../components/ui/Display.jsx';
import { cn } from '../../utils/format.js';

/**
 * Admin data table. Scrolls horizontally inside its card on small screens (never the page).
 * columns: [{ key, label, render?(row), className? }]
 */
export function AdminTable({ query, columns, rowKey = '_id', empty = 'Nothing here yet', emptyIcon, onPage, items: itemsProp }) {
  if (query?.isLoading) return <LoadingState />;
  if (query?.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;
  const items = itemsProp || query?.data?.items || [];
  if (!items.length) return <EmptyState icon={emptyIcon} title={empty} />;
  return (
    <>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs tracking-wider text-fog-500 uppercase">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('px-4 py-3 font-semibold', c.className)}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((row) => (
              <tr key={row[rowKey]} className="align-top hover:bg-white/[0.02]">
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3 text-fog-200', c.className)}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {onPage && <Pagination pagination={query?.data?.pagination} onPage={onPage} />}
    </>
  );
}

export function FilterBar({ children }) {
  return <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}
