import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Clapperboard,
  Flag,
  Globe,
  Inbox,
  Map,
  MapPin,
  ScrollText,
  ShieldAlert,
  UserCheck,
  Users,
  UsersRound,
  Activity,
} from 'lucide-react';
import { adminApi, locationApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select } from '../../components/ui/Form.jsx';
import { Modal, ConfirmDialog } from '../../components/ui/Modal.jsx';
import { Avatar, Badge, ErrorState, LoadingState, StatCard, StatusBadge, Tabs } from '../../components/ui/Display.jsx';
import { AdminTable, FilterBar } from '../../features/admin/AdminTable.jsx';
import { RankBars, TrendChart } from '../../features/admin/Charts.jsx';
import { ROLE_LABELS } from '../../constants/index.js';
import { timeAgo } from '../../utils/format.js';

// ------------------------------------------------------------------ Dashboard
export function AdminDashboard() {
  const { isSuperAdmin } = useAuth();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: adminApi.dashboard });
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  const c = data.cards;
  const cards = [
    ['Total users', c.totalUsers, Users],
    ['Active users (30d)', c.activeUsers, Activity],
    isSuperAdmin && ['Countries', c.countries, Globe],
    isSuperAdmin && ['States', c.states, Map],
    ['Cities', c.cities, MapPin],
    ['Verified fan clubs', c.fanClubs, UsersRound],
    ['Pending fan clubs', c.pendingFanClubs, UserCheck, 'red'],
    ['Events', c.events, CalendarDays],
    ['Upcoming events', c.upcomingEvents, CalendarDays],
    ['Upcoming FDFS', c.upcomingFdfs, Clapperboard, 'red'],
    ['Open reports', c.openReports, Flag, 'red'],
    isSuperAdmin && ['New contact requests', c.contactRequests, Inbox],
  ].filter(Boolean);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map(([label, value, icon, tone]) => (
          <StatCard key={label} label={label} value={value} icon={icon} tone={tone} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-fog-100">Pending applications</h2>
            <Button to="/admin/fan-clubs?status=PENDING" variant="ghost" size="sm">Review</Button>
          </div>
          {data.recentApplications.length ? (
            <ul className="space-y-2 text-sm">
              {data.recentApplications.map((a) => (
                <li key={a._id} className="flex justify-between gap-3">
                  <span className="truncate text-fog-200">
                    {a.name} · {a.city?.name}
                  </span>
                  <span className="shrink-0 text-xs text-fog-500">{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fog-400">No pending applications. 🎬</p>
          )}
        </section>
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-fog-100">New reports</h2>
            <Button to="/admin/reports" variant="ghost" size="sm">Open</Button>
          </div>
          {data.recentReports.length ? (
            <ul className="space-y-2 text-sm">
              {data.recentReports.map((r) => (
                <li key={r._id} className="flex justify-between gap-3">
                  <span className="truncate text-fog-200">
                    {r.reason.replace(/_/g, ' ')} · {r.targetLabel}
                  </span>
                  <span className="shrink-0 text-xs text-fog-500">{timeAgo(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fog-400">No pending reports.</p>
          )}
        </section>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Analytics
export function AdminAnalytics() {
  const [days, setDays] = useState('30');
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin', 'analytics', days], queryFn: () => adminApi.analytics({ days }), placeholderData: keepPreviousData });
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  const s = data.summary;
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Tabs value={days} onChange={setDays} tabs={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Users today" value={s.usersToday} icon={Users} />
        <StatCard label="Users this week" value={s.usersWeek} icon={Users} />
        <StatCard label="Users this month" value={s.usersMonth} icon={Users} />
        <StatCard label="Total cities" value={s.totalCities} icon={MapPin} />
        <StatCard label="Verified fan clubs" value={s.totalFanClubs} icon={UsersRound} />
        <StatCard label="Pending fan clubs" value={s.pendingFanClubs} icon={UserCheck} tone="red" />
        <StatCard label="Upcoming events" value={s.upcomingEvents} icon={CalendarDays} />
        <StatCard label="FDFS going" value={s.fdfsParticipation.going} icon={Clapperboard} hint={`${s.fdfsParticipation.interested} interested · ${s.fdfsParticipation.attended} attended`} tone="red" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart title="New users" data={data.series.userGrowth} unit="users" />
        <TrendChart title="City joins" data={data.series.cityGrowth} unit="joins" />
        <TrendChart title="Fan clubs approved" data={data.series.clubGrowth} unit="clubs" />
        <TrendChart title="Event registrations" data={data.series.eventRegistrations} unit="registrations" />
        <TrendChart title="FDFS participation" data={data.series.fdfsParticipation} unit="participants" />
        <TrendChart title="Referral sign-ups" data={data.series.referralGrowth} unit="referrals" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <RankBars title="Most active cities (30d activity)" data={data.mostActiveCities} valueKey="activity" unit="actions" />
        <RankBars title="Top cities by members" data={data.topCities} valueKey="memberCount" unit="members" />
        <RankBars title="Top fan clubs by members" data={data.topFanClubs} valueKey="memberCount" unit="members" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Users
function UserEditor({ user, onClose }) {
  const toast = useToast();
  const qc = useQueryClient();
  const cities = useQuery({ queryKey: ['cities', 'admin-all'], queryFn: () => locationApi.cities({ limit: 100, sort: 'name' }), enabled: Boolean(user) });
  const [role, setRole] = useState(user?.role);
  const [mod, setMod] = useState((user?.moderatedCities || []).map((c) => c._id));
  const [points, setPoints] = useState({ points: '', note: '' });
  const save = useMutation({
    mutationFn: () => adminApi.updateUser(user._id, { role, ...(role === 'CITY_MODERATOR' ? { moderatedCities: mod } : {}) }),
    onSuccess: () => (toast.success('User updated'), qc.invalidateQueries({ queryKey: ['admin', 'users'] }), onClose()),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const award = useMutation({
    mutationFn: () => adminApi.awardPoints(user._id, { points: Number(points.points), note: points.note }),
    onSuccess: () => (toast.success('Points awarded'), setPoints({ points: '', note: '' }), qc.invalidateQueries({ queryKey: ['admin', 'users'] })),
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!user) return null;
  return (
    <Modal open onClose={onClose} title={user.fullName} description={`@${user.username} · ${user.email}`} footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save role</Button></>}>
      <div className="space-y-5">
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)} options={['USER', 'FAN_CLUB_ADMIN', 'CITY_MODERATOR', 'SUPER_ADMIN'].map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
        {role === 'CITY_MODERATOR' && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-fog-200">Assigned cities</legend>
            <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-white/5 p-3">
              {(cities.data?.items || []).map((c) => (
                <label key={c._id} className="flex items-center gap-2 text-sm text-fog-300">
                  <input type="checkbox" className="size-4 accent-[var(--color-gold-500)]" checked={mod.includes(c._id)} onChange={(e) => setMod((m) => (e.target.checked ? [...m, c._id] : m.filter((x) => x !== c._id)))} />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="rounded-xl border border-white/5 bg-ink-850 p-4">
          <p className="mb-3 text-sm font-semibold text-fog-100">Award community points · current {user.totalPoints}</p>
          <div className="grid gap-3 sm:grid-cols-[100px_1fr_auto]">
            <Input aria-label="Points" type="number" placeholder="+25" value={points.points} onChange={(e) => setPoints((p) => ({ ...p, points: e.target.value }))} />
            <Input aria-label="Reason" placeholder="Reason (required)" value={points.note} onChange={(e) => setPoints((p) => ({ ...p, note: e.target.value }))} />
            <Button variant="secondary" loading={award.isPending} disabled={!Number(points.points) || points.note.length < 3} onClick={() => award.mutate()}>
              Award
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function AdminUsers() {
  const [params] = useSearchParams();
  const [f, setF] = useState({ q: '', role: params.get('role') || '', status: '' });
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const dq = useDebounce(f.q);
  const toast = useToast();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'users', { ...f, q: dq, page }], queryFn: () => adminApi.users({ ...f, q: dq, page }), placeholderData: keepPreviousData });
  const act = useMutation({
    mutationFn: ({ kind, id }) => (kind === 'delete' ? adminApi.deleteUser(id) : adminApi.updateUser(id, { status: kind })),
    onSuccess: () => (toast.success('Done'), setConfirm(null), qc.invalidateQueries({ queryKey: ['admin', 'users'] })),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const set = (k) => (e) => (setF((s) => ({ ...s, [k]: e.target.value })), setPage(1));
  return (
    <div>
      <FilterBar>
        <Input aria-label="Search users" placeholder="Name, username or email…" value={f.q} onChange={set('q')} className="lg:col-span-2" />
        <Select aria-label="Role" value={f.role} onChange={set('role')} placeholder="All roles" options={Object.entries(ROLE_LABELS).slice(0, 6).map(([value, label]) => ({ value, label }))} />
        <Select aria-label="Status" value={f.status} onChange={set('status')} placeholder="All statuses" options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'SUSPENDED', label: 'Suspended' }]} />
      </FilterBar>
      <AdminTable
        query={query}
        onPage={setPage}
        emptyIcon={Users}
        empty="No users found"
        columns={[
          {
            key: 'user',
            label: 'User',
            render: (u) => (
              <div className="flex items-center gap-3">
                <Avatar src={u.profilePhoto?.url} name={u.fullName} size="sm" />
                <div className="min-w-0">
                  <Link to={`/profile/${u.username}`} className="block truncate font-semibold text-fog-100 hover:text-gold-300">
                    {u.fullName} {u.isDemo && <Badge tone="blue">Demo</Badge>}
                  </Link>
                  <span className="block truncate text-xs text-fog-500">
                    @{u.username} · {u.email}
                  </span>
                </div>
              </div>
            ),
          },
          { key: 'role', label: 'Role', render: (u) => <span className="text-xs">{ROLE_LABELS[u.role]}{u.moderatedCities?.length ? ` · ${u.moderatedCities.map((c) => c.name).join(', ')}` : ''}</span> },
          { key: 'city', label: 'City', render: (u) => u.city?.name || '—' },
          { key: 'points', label: 'Points', render: (u) => u.totalPoints },
          { key: 'status', label: 'Status', render: (u) => <StatusBadge status={u.status} /> },
          { key: 'joined', label: 'Joined', render: (u) => <span className="text-xs text-fog-400">{timeAgo(u.createdAt)}</span> },
          {
            key: 'actions',
            label: '',
            className: 'text-right',
            render: (u) => (
              <div className="flex justify-end gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => setEdit(u)}>Manage</Button>
                {u.status === 'ACTIVE' ? (
                  <Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: 'SUSPENDED', user: u })}>Suspend</Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => act.mutate({ kind: 'ACTIVE', id: u._id })}>Activate</Button>
                )}
                <Button size="sm" variant="ghost" className="text-crimson-400" onClick={() => setConfirm({ kind: 'delete', user: u })}>Delete</Button>
              </div>
            ),
          },
        ]}
      />
      {edit && <UserEditor user={edit} onClose={() => setEdit(null)} />}
      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        danger
        loading={act.isPending}
        title={confirm?.kind === 'delete' ? `Delete @${confirm?.user.username}?` : `Suspend @${confirm?.user.username}?`}
        message={confirm?.kind === 'delete' ? 'Their account is anonymised and they are signed out everywhere. This cannot be undone.' : 'They will be signed out and unable to log in until reactivated.'}
        confirmLabel={confirm?.kind === 'delete' ? 'Delete user' : 'Suspend'}
        onConfirm={() => act.mutate({ kind: confirm.kind, id: confirm.user._id })}
      />
    </div>
  );
}

export function AdminModerators() {
  const query = useQuery({ queryKey: ['admin', 'moderators'], queryFn: adminApi.moderators });
  return (
    <div>
      <p className="mb-4 text-sm text-fog-400">City moderators review fan clubs, reports and announcements in their assigned cities only. Assign moderators from Users → Manage.</p>
      <AdminTable
        query={query}
        emptyIcon={ShieldAlert}
        empty="No city moderators yet"
        columns={[
          { key: 'name', label: 'Moderator', render: (u) => <><span className="block font-semibold text-fog-100">{u.fullName}</span><span className="text-xs text-fog-500">@{u.username} · {u.email}</span></> },
          { key: 'cities', label: 'Cities', render: (u) => (u.moderatedCities || []).map((c) => c.name).join(', ') || <span className="text-amber-300">None assigned</span> },
          { key: 'status', label: 'Status', render: (u) => <StatusBadge status={u.status} /> },
          { key: 'a', label: '', render: () => <Button size="sm" variant="ghost" to="/admin/users?role=CITY_MODERATOR">Manage</Button> },
        ]}
      />
    </div>
  );
}

export function AdminAuditLogs() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounce(q);
  const query = useQuery({ queryKey: ['admin', 'audit', dq, page], queryFn: () => adminApi.auditLogs({ q: dq, page }), placeholderData: keepPreviousData });
  return (
    <div>
      <Input aria-label="Search audit logs" placeholder="Search description or actor…" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} className="mb-4 max-w-md" />
      <AdminTable
        query={query}
        onPage={setPage}
        emptyIcon={ScrollText}
        empty="No audit entries"
        columns={[
          { key: 'when', label: 'When', render: (l) => <span className="text-xs whitespace-nowrap text-fog-400">{new Date(l.createdAt).toLocaleString('en-IN')}</span> },
          { key: 'actor', label: 'Actor', render: (l) => (l.actorName ? `@${l.actorName}` : 'system') },
          { key: 'action', label: 'Action', render: (l) => <Badge>{l.action}</Badge> },
          { key: 'description', label: 'Description', render: (l) => l.description || `${l.targetType || ''} ${l.targetId || ''}` },
          { key: 'ip', label: 'IP', render: (l) => <span className="text-xs text-fog-500">{l.ip}</span> },
        ]}
      />
    </div>
  );
}
