import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Settings } from 'lucide-react';
import { notificationApi } from '../../api/endpoints.js';
import { Seo } from '../../components/common/Seo.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState, ErrorState, LoadingState, Pagination, Tabs } from '../../components/ui/Display.jsx';
import { NotificationItem } from '../../components/cards/Cards.jsx';

export default function Notifications() {
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['notifications', 'list', filter, page],
    queryFn: () => notificationApi.list({ page, limit: 20, unread: filter === 'unread' ? 'true' : undefined }),
    placeholderData: keepPreviousData,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const read = useMutation({ mutationFn: notificationApi.read, onSuccess: refresh });
  const readAll = useMutation({ mutationFn: notificationApi.readAll, onSuccess: refresh });
  const remove = useMutation({ mutationFn: notificationApi.remove, onSuccess: refresh });

  return (
    <div className="container-page max-w-3xl py-8 sm:py-12">
      <Seo title="Notifications" noindex />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Inbox</p>
          <h1 className="display text-5xl text-fog-100">Notifications</h1>
          {q.data && <p className="mt-1 text-sm text-fog-400">{q.data.unread} unread</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={CheckCheck} onClick={() => readAll.mutate()} loading={readAll.isPending} disabled={!q.data?.unread}>
            Mark all read
          </Button>
          <Button variant="ghost" size="sm" icon={Settings} to="/settings?tab=notifications">
            Preferences
          </Button>
        </div>
      </div>
      <Tabs
        className="mb-4"
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setPage(1);
        }}
        tabs={[
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread', count: q.data?.unread },
        ]}
      />
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : q.data.items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications." message="You're all caught up." />
      ) : (
        <>
          <div className="card divide-y divide-white/5 p-1.5">
            {q.data.items.map((n) => (
              <NotificationItem key={n._id} n={n} onRead={(id) => read.mutate(id)} onDelete={(id) => remove.mutate(id)} />
            ))}
          </div>
          <Pagination pagination={q.data.pagination} onPage={setPage} />
        </>
      )}
    </div>
  );
}
