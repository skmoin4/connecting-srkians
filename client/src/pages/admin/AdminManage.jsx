import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, CalendarDays, Clapperboard, Flag, MapPin, Megaphone, Plus, Star, UsersRound } from 'lucide-react';
import { adminApi, announcementApi, fanClubApi, locationApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select, Switch, Textarea } from '../../components/ui/Form.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Avatar, Badge, EmptyState, ErrorState, LoadingState, StatusBadge, Tabs, VerifiedBadge } from '../../components/ui/Display.jsx';
import { ImageUpload } from '../../components/common/ImageUpload.jsx';
import { BADGE_ICONS, BadgeIcon } from '../../components/common/BadgeIcon.jsx';
import { AdminTable, FilterBar } from '../../features/admin/AdminTable.jsx';
import { AnnouncementFormModal } from '../../features/fanclub/AnnouncementForm.jsx';
import { formatDate, timeAgo, instagramUrl, whatsappUrl } from '../../utils/format.js';
import { EVENT_STATUS, REPORT_REASONS } from '../../constants/index.js';

// ------------------------------------------------------------------ Fan club review
const ACTIONS_FOR = {
  PENDING: ['APPROVE', 'REQUEST_CHANGES', 'REJECT'],
  CHANGES_REQUESTED: ['APPROVE', 'REJECT'],
  REJECTED: ['APPROVE'],
  APPROVED: ['SUSPEND'],
  SUSPENDED: ['RESTORE'],
};
const ACTION_LABEL = { APPROVE: 'Approve', REJECT: 'Reject', REQUEST_CHANGES: 'Request changes', SUSPEND: 'Suspend', RESTORE: 'Restore' };

function ClubReview({ club, onClose }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const act = useMutation({
    mutationFn: (action) => adminApi.fanClubStatus(club._id, { action, note: note || undefined }),
    onSuccess: (d) => (toast.success(`Fan club ${d.fanClub.status.toLowerCase().replace('_', ' ')}`), qc.invalidateQueries({ queryKey: ['admin', 'fan-clubs'] }), qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] }), onClose()),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const feature = useMutation({
    mutationFn: () => adminApi.patchFanClub(club._id, { featured: !club.featured }),
    onSuccess: () => (toast.success(club.featured ? 'Unfeatured' : 'Featured'), qc.invalidateQueries({ queryKey: ['admin', 'fan-clubs'] }), onClose()),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const Row = ({ label, children }) => (children ? <div className="flex gap-3 text-sm"><dt className="w-36 shrink-0 text-fog-500">{label}</dt><dd className="min-w-0 break-words text-fog-200">{children}</dd></div> : null);
  return (
    <Modal open onClose={onClose} size="lg" title={club.name} description={`${club.city?.name}, ${club.state?.name} · submitted ${timeAgo(club.createdAt)}`}
      footer={
        <>
          {club.status === 'APPROVED' && <Button variant="ghost" icon={Star} loading={feature.isPending} onClick={() => feature.mutate()}>{club.featured ? 'Unfeature' : 'Feature'}</Button>}
          <Button variant="secondary" to={`/fan-clubs/${club.slug}`}>Open page</Button>
          {(ACTIONS_FOR[club.status] || []).map((a) => (
            <Button key={a} variant={a === 'APPROVE' || a === 'RESTORE' ? 'primary' : a === 'REQUEST_CHANGES' ? 'secondary' : 'danger'} loading={act.isPending && act.variables === a} onClick={() => act.mutate(a)}>
              {ACTION_LABEL[a]}
            </Button>
          ))}
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Avatar src={club.logo?.url} name={club.name} size="lg" />
          <StatusBadge status={club.status} />
          {club.featured && <Badge tone="gold">Featured</Badge>}
        </div>
        <p className="text-sm whitespace-pre-line text-fog-300">{club.description}</p>
        <dl className="space-y-2">
          <Row label="Admin account">{club.admin && <>{club.admin.fullName} (@{club.admin.username}) · {club.admin.email}</>}</Row>
          <Row label="Admin name">{club.adminName}</Row>
          <Row label="Instagram">{club.instagram && <a className="text-gold-300" href={instagramUrl(club.instagram)} target="_blank" rel="noopener noreferrer">@{club.instagram}</a>}</Row>
          <Row label="WhatsApp">{club.whatsappNumber && <a className="text-gold-300" href={whatsappUrl(club.whatsappNumber)} target="_blank" rel="noopener noreferrer">{club.whatsappNumber}</a>}</Row>
          <Row label="Phone">{club.phone}</Row>
          <Row label="WhatsApp group">{club.whatsappGroupLink}</Row>
          <Row label="Website">{club.website}</Row>
          <Row label="Founded">{club.foundedDate && formatDate(club.foundedDate)}</Row>
          <Row label="Approx. members">{club.approxMemberCount}</Row>
          <Row label="Members on platform">{String(club.memberCount)}</Row>
          <Row label="Additional info">{club.additionalInfo}</Row>
          <Row label="Visibility">{Object.entries(club.contactVisibility || {}).filter(([, v]) => v).map(([k]) => k.replace('show', '')).join(', ') || 'All hidden'}</Row>
        </dl>
        {club.verificationProof?.url && (
          <div>
            <p className="mb-2 text-sm font-semibold text-fog-100">Verification proof</p>
            <a href={club.verificationProof.url} target="_blank" rel="noopener noreferrer">
              <img src={club.verificationProof.url} alt="Verification proof" className="max-h-64 rounded-xl border border-white/10" />
            </a>
          </div>
        )}
        {club.history?.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-fog-100">Review history</p>
            <ol className="space-y-1.5 text-xs text-fog-400">
              {club.history.map((h, i) => (
                <li key={i}>
                  {new Date(h.at).toLocaleString('en-IN')} — <strong className="text-fog-200">{h.action}</strong> {h.by?.username ? `by @${h.by.username}` : ''} {h.note ? `· “${h.note}”` : ''}
                </li>
              ))}
            </ol>
          </div>
        )}
        {ACTIONS_FOR[club.status] && <Textarea label="Note to the club admin (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} hint="Sent with the decision notification" />}
      </div>
    </Modal>
  );
}

export function AdminFanClubs() {
  const [params] = useSearchParams();
  const [f, setF] = useState({ status: params.get('status') || 'PENDING', q: '' });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const dq = useDebounce(f.q);
  const query = useQuery({ queryKey: ['admin', 'fan-clubs', f.status, dq, page], queryFn: () => adminApi.fanClubs({ status: f.status, q: dq, page }), placeholderData: keepPreviousData });
  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={f.status} onChange={(v) => (setF((s) => ({ ...s, status: v })), setPage(1))} tabs={[{ value: 'PENDING', label: 'Pending' }, { value: 'CHANGES_REQUESTED', label: 'Changes requested' }, { value: 'APPROVED', label: 'Approved' }, { value: 'SUSPENDED', label: 'Suspended' }, { value: 'REJECTED', label: 'Rejected' }, { value: '', label: 'All' }]} />
        <Input aria-label="Search fan clubs" placeholder="Search by name…" value={f.q} onChange={(e) => (setF((s) => ({ ...s, q: e.target.value })), setPage(1))} className="lg:w-64" />
      </div>
      <AdminTable
        query={query}
        onPage={setPage}
        emptyIcon={UsersRound}
        empty="No fan clubs in this state"
        columns={[
          { key: 'name', label: 'Fan club', render: (c) => <div className="flex items-center gap-3"><Avatar src={c.logo?.url} name={c.name} size="sm" /><div className="min-w-0"><span className="flex items-center gap-1.5 font-semibold text-fog-100">{c.name} {c.status === 'APPROVED' && <VerifiedBadge compact />} {c.featured && <Star className="size-3.5 text-gold-400" aria-label="Featured" />}</span><span className="text-xs text-fog-500">{c.city?.name}, {c.state?.name}</span></div></div> },
          { key: 'admin', label: 'Admin', render: (c) => <span className="text-xs">{c.admin?.fullName}<br /><span className="text-fog-500">@{c.admin?.username}</span></span> },
          { key: 'members', label: 'Members', render: (c) => c.memberCount },
          { key: 'status', label: 'Status', render: (c) => <StatusBadge status={c.status} /> },
          { key: 'created', label: 'Submitted', render: (c) => <span className="text-xs text-fog-400">{timeAgo(c.createdAt)}</span> },
          { key: 'a', label: '', className: 'text-right', render: (c) => <Button size="sm" variant="secondary" onClick={() => setOpen(c)}>Review</Button> },
        ]}
      />
      {open && <ClubReview club={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

// ------------------------------------------------------------------ Locations
const KINDS = {
  countries: { label: 'Country', fields: ['name', 'code'] },
  states: { label: 'State', fields: ['name', 'country'] },
  cities: { label: 'City', fields: ['name', 'state', 'description', 'announcement', 'coverImage', 'featured'] },
};

function LocationForm({ kind, item, onClose }) {
  const toast = useToast();
  const qc = useQueryClient();
  const editing = Boolean(item);
  const [f, setF] = useState({ name: item?.name || '', code: item?.code || '', country: item?.country?._id || '', state: item?.state?._id || '', description: item?.description || '', announcement: item?.announcement || '', coverImage: item?.coverImage || null, featured: item?.featured || false });
  const countries = useQuery({ queryKey: ['countries'], queryFn: locationApi.countries, enabled: kind !== 'countries' });
  const states = useQuery({ queryKey: ['states', 'all'], queryFn: () => locationApi.states(), enabled: kind === 'cities' });
  const save = useMutation({
    mutationFn: () => {
      const body = Object.fromEntries(KINDS[kind].fields.map((k) => [k, f[k]]));
      if (editing) {
        delete body.country;
        delete body.state;
      }
      return editing ? adminApi.updateLocation(kind, item._id, body) : adminApi.createLocation(kind, body);
    },
    onSuccess: () => (toast.success(editing ? 'Saved' : 'Created'), qc.invalidateQueries({ queryKey: ['admin', 'locations'] }), qc.invalidateQueries({ queryKey: ['cities'] }), qc.invalidateQueries({ queryKey: ['states'] }), qc.invalidateQueries({ queryKey: ['countries'] }), onClose()),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Modal open onClose={onClose} title={`${editing ? 'Edit' : 'Add'} ${KINDS[kind].label.toLowerCase()}`} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={() => save.mutate()} disabled={f.name.length < 2}>Save</Button></>}>
      <div className="space-y-4">
        <Input label="Name" required value={f.name} onChange={set('name')} />
        {kind === 'countries' && <Input label="ISO code" required maxLength={3} value={f.code} onChange={set('code')} placeholder="IN" />}
        {kind === 'states' && !editing && <Select label="Country" required value={f.country} onChange={set('country')} placeholder="Select" options={(countries.data?.countries || []).map((c) => ({ value: c._id, label: c.name }))} />}
        {kind === 'cities' && (
          <>
            {!editing && <Select label="State" required value={f.state} onChange={set('state')} placeholder="Select" options={(states.data?.states || []).map((s) => ({ value: s._id, label: s.name }))} />}
            <Textarea label="Description" rows={3} value={f.description} onChange={set('description')} />
            <Textarea label="City announcement (pinned on city page)" rows={2} value={f.announcement} onChange={set('announcement')} />
            <ImageUpload label="Cover image" value={f.coverImage} onChange={(v) => setF((s) => ({ ...s, coverImage: v }))} folder="cities" />
            <Switch label="Featured city" checked={f.featured} onChange={(v) => setF((s) => ({ ...s, featured: v }))} />
          </>
        )}
      </div>
    </Modal>
  );
}

export function AdminLocations({ kind }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const dq = useDebounce(q);
  const toast = useToast();
  const qc = useQueryClient();
  useEffect(() => {
    setPage(1);
  }, [kind]);
  const query = useQuery({ queryKey: ['admin', 'locations', kind, dq, page], queryFn: () => adminApi.locations(kind, { q: dq, page, limit: 50 }), placeholderData: keepPreviousData });
  const patch = useMutation({
    mutationFn: ({ id, body }) => adminApi.updateLocation(kind, id, body),
    onSuccess: () => (qc.invalidateQueries({ queryKey: ['admin', 'locations'] }), qc.invalidateQueries({ queryKey: ['cities'] })),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const del = useMutation({
    mutationFn: (id) => adminApi.deleteLocation(kind, id),
    onSuccess: (d) => (toast.info(d.archived ? 'Has linked data — disabled instead of deleted' : 'Deleted'), qc.invalidateQueries({ queryKey: ['admin', 'locations'] })),
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold text-fog-100">{KINDS[kind].label} list</h2>
        <div className="flex gap-2">
          <Input aria-label="Search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button icon={Plus} onClick={() => setForm({})}>Add</Button>
        </div>
      </div>
      <p className="mb-3 text-xs text-fog-500">Locations with linked users, clubs or events are never hard-deleted — they are disabled (hidden from discovery) to preserve history.</p>
      <AdminTable
        query={query}
        onPage={setPage}
        emptyIcon={MapPin}
        columns={[
          { key: 'name', label: 'Name', render: (l) => <span className="font-semibold text-fog-100">{l.name} {l.code && <span className="text-xs text-fog-500">({l.code})</span>} {l.featured && <Badge tone="gold">Featured</Badge>}</span> },
          ...(kind !== 'countries' ? [{ key: 'parent', label: 'Parent', render: (l) => [l.state?.name, l.country?.name].filter(Boolean).join(', ') }] : []),
          ...(kind === 'cities' ? [{ key: 'stats', label: 'Members / clubs', render: (l) => `${l.memberCount} / ${l.fanClubCount}` }] : []),
          { key: 'status', label: 'Status', render: (l) => <StatusBadge status={l.status} /> },
          {
            key: 'a',
            label: '',
            className: 'text-right',
            render: (l) => (
              <div className="flex justify-end gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => setForm({ item: l })}>Edit</Button>
                {kind === 'cities' && <Button size="sm" variant="ghost" onClick={() => patch.mutate({ id: l._id, body: { featured: !l.featured } })}>{l.featured ? 'Unfeature' : 'Feature'}</Button>}
                <Button size="sm" variant="ghost" onClick={() => patch.mutate({ id: l._id, body: { status: l.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' } })}>{l.status === 'ACTIVE' ? 'Disable' : 'Activate'}</Button>
                <Button size="sm" variant="ghost" className="text-crimson-400" onClick={() => del.mutate(l._id)}>Delete</Button>
              </div>
            ),
          },
        ]}
      />
      {form && <LocationForm kind={kind} item={form.item} onClose={() => setForm(null)} />}
    </div>
  );
}

// ------------------------------------------------------------------ Events / FDFS
export function AdminEvents({ kind }) {
  const isFdfs = kind === 'fdfs';
  const [f, setF] = useState({ status: '', q: '' });
  const [page, setPage] = useState(1);
  const dq = useDebounce(f.q);
  const toast = useToast();
  const qc = useQueryClient();
  useEffect(() => {
    setPage(1);
  }, [kind]);
  const query = useQuery({ queryKey: ['admin', kind, f.status, dq, page], queryFn: () => (isFdfs ? adminApi.fdfs : adminApi.events)({ status: f.status, q: dq, page }), placeholderData: keepPreviousData });
  const patch = useMutation({
    mutationFn: ({ id, body }) => (isFdfs ? adminApi.patchFdfs : adminApi.patchEvent)(id, body),
    onSuccess: () => (toast.success('Updated'), qc.invalidateQueries({ queryKey: ['admin', kind] })),
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div>
      <FilterBar>
        <Input aria-label="Search" placeholder={isFdfs ? 'Search movie…' : 'Search title…'} value={f.q} onChange={(e) => (setF((s) => ({ ...s, q: e.target.value })), setPage(1))} className="lg:col-span-2" />
        <Select aria-label="Status" value={f.status} onChange={(e) => (setF((s) => ({ ...s, status: e.target.value })), setPage(1))} placeholder="All statuses" options={EVENT_STATUS.map((s) => ({ value: s, label: s }))} />
      </FilterBar>
      <AdminTable
        query={query}
        onPage={setPage}
        emptyIcon={isFdfs ? Clapperboard : CalendarDays}
        columns={[
          { key: 't', label: isFdfs ? 'FDFS' : 'Event', render: (e) => <Link to={`/${isFdfs ? 'fdfs' : 'events'}/${e.slug}`} className="font-semibold text-fog-100 hover:text-gold-300">{isFdfs ? `${e.movie} FDFS` : e.title} {e.featured && <Star className="inline size-3.5 text-gold-400" aria-label="Featured" />} {e.isDemo && <Badge tone="blue">Demo</Badge>}</Link> },
          { key: 'd', label: 'Date', render: (e) => formatDate(isFdfs ? e.releaseDate : e.date) },
          { key: 'c', label: 'City / club', render: (e) => <span className="text-xs">{e.city?.name}<br /><span className="text-fog-500">{e.fanClub?.name}</span></span> },
          { key: 'n', label: 'Going', render: (e) => e.counts?.going || 0 },
          { key: 's', label: 'Status', render: (e) => <StatusBadge status={e.status} /> },
          {
            key: 'a',
            label: '',
            className: 'text-right',
            render: (e) => (
              <div className="flex justify-end gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => patch.mutate({ id: e._id, body: { featured: !e.featured } })}>{e.featured ? 'Unfeature' : 'Feature'}</Button>
                {e.status !== 'CANCELLED' && e.status !== 'COMPLETED' && <Button size="sm" variant="ghost" className="text-crimson-400" onClick={() => patch.mutate({ id: e._id, body: { status: 'CANCELLED' } })}>Cancel</Button>}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

// ------------------------------------------------------------------ Reports
export function AdminReports() {
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState('');
  const toast = useToast();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'reports', status, page], queryFn: () => adminApi.reports({ status, page }), placeholderData: keepPreviousData });
  const upd = useMutation({
    mutationFn: (body) => adminApi.updateReport(open._id, body),
    onSuccess: () => (toast.success('Report updated'), setOpen(null), setNote(''), qc.invalidateQueries({ queryKey: ['admin', 'reports'] })),
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div>
      <Tabs className="mb-4" value={status} onChange={(v) => (setStatus(v), setPage(1))} tabs={[{ value: 'PENDING', label: 'Pending' }, { value: 'UNDER_REVIEW', label: 'Under review' }, { value: 'RESOLVED', label: 'Resolved' }, { value: 'DISMISSED', label: 'Dismissed' }, { value: '', label: 'All' }]} />
      <AdminTable
        query={query}
        onPage={setPage}
        emptyIcon={Flag}
        empty="No reports here"
        columns={[
          { key: 't', label: 'Target', render: (r) => <><span className="block font-semibold text-fog-100">{r.targetLabel}</span><span className="text-xs text-fog-500">{r.targetType.replace('_', ' ')} · {r.city?.name || '—'}</span></> },
          { key: 'r', label: 'Reason', render: (r) => REPORT_REASONS[r.reason] },
          { key: 'by', label: 'Reporter', render: (r) => `@${r.reporter?.username}` },
          { key: 's', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'w', label: 'When', render: (r) => <span className="text-xs text-fog-400">{timeAgo(r.createdAt)}</span> },
          { key: 'a', label: '', className: 'text-right', render: (r) => <Button size="sm" variant="secondary" onClick={() => setOpen(r)}>Review</Button> },
        ]}
      />
      {open && (
        <Modal open onClose={() => setOpen(null)} title={`Report: ${open.targetLabel}`} description={`${REPORT_REASONS[open.reason]} · reported by @${open.reporter?.username}`}
          footer={
            <>
              <Button variant="ghost" onClick={() => upd.mutate({ status: 'UNDER_REVIEW', note: note || undefined })}>Under review</Button>
              <Button variant="secondary" onClick={() => upd.mutate({ status: 'DISMISSED', note: note || undefined })}>Dismiss</Button>
              <Button onClick={() => upd.mutate({ status: 'RESOLVED', note: note || undefined })} loading={upd.isPending}>Resolve</Button>
            </>
          }
        >
          <div className="space-y-4">
            {open.details && <p className="rounded-xl bg-ink-850 p-3 text-sm whitespace-pre-line text-fog-300">{open.details}</p>}
            {open.notes?.length > 0 && (
              <ul className="space-y-1 text-xs text-fog-400">
                {open.notes.map((n, i) => (
                  <li key={i}>
                    <strong className="text-fog-200">@{n.by?.username}</strong> · {timeAgo(n.at)} — {n.note}
                  </li>
                ))}
              </ul>
            )}
            <Textarea label="Moderator note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} hint="Internal — not shown to the reporter" />
            <p className="text-xs text-fog-500">To act on the target (suspend a club, cancel an event, suspend a user) use the matching admin section.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Announcements
export function AdminAnnouncements() {
  const { user, isSuperAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['managed-announcements', 'admin'], queryFn: () => fanClubApi.announcements({}) });
  const countries = useQuery({ queryKey: ['countries'], queryFn: locationApi.countries, enabled: isSuperAdmin });
  const states = useQuery({ queryKey: ['states', 'all'], queryFn: () => locationApi.states(), enabled: isSuperAdmin });
  const cities = useQuery({ queryKey: ['cities', 'admin-all'], queryFn: () => locationApi.cities({ limit: 100, sort: 'name' }) });
  const remove = useMutation({ mutationFn: announcementApi.remove, onSuccess: () => (toast.success('Deleted'), qc.invalidateQueries({ queryKey: ['managed-announcements'] })), onError: (e) => toast.error(errorMessage(e)) });
  const cityOptions = (cities.data?.items || [])
    .filter((c) => isSuperAdmin || (user.moderatedCities || []).some((m) => m._id === c._id))
    .map((c) => ({ value: c._id, label: c.name }));
  const targets = useMemo(
    () =>
      [
        isSuperAdmin && { value: 'GLOBAL', label: 'Everyone (global)' },
        isSuperAdmin && { value: 'COUNTRY', label: 'A country', field: 'country', options: (countries.data?.countries || []).map((c) => ({ value: c._id, label: c.name })) },
        isSuperAdmin && { value: 'STATE', label: 'A state', field: 'state', options: (states.data?.states || []).map((s) => ({ value: s._id, label: s.name })) },
        { value: 'CITY', label: 'A city community', field: 'city', options: cityOptions },
      ].filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSuperAdmin, countries.data, states.data, cities.data]
  );
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button icon={Plus} onClick={() => setOpen(true)}>New announcement</Button>
      </div>
      {list.isLoading ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : !list.data.items.length ? (
        <EmptyState icon={Megaphone} title="No announcements yet" />
      ) : (
        <ul className="space-y-3">
          {list.data.items.map((a) => (
            <li key={a._id} className="card flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-fog-100">{a.title} {a.pinned && <Badge tone="gold">Pinned</Badge>}</p>
                {a.body && <p className="mt-1 text-sm text-fog-300">{a.body}</p>}
                <p className="mt-1 text-xs text-fog-500">
                  {a.target} {a.city?.name ? `· ${a.city.name}` : ''} {a.fanClub?.name ? `· ${a.fanClub.name}` : ''} · {timeAgo(a.createdAt)} · @{a.author?.username}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(a._id)}>Delete</Button>
            </li>
          ))}
        </ul>
      )}
      <AnnouncementFormModal open={open} onClose={() => setOpen(false)} targets={targets} />
    </div>
  );
}

// ------------------------------------------------------------------ Badges
function BadgeForm({ badge, onClose }) {
  const toast = useToast();
  const qc = useQueryClient();
  const cities = useQuery({ queryKey: ['cities', 'admin-all'], queryFn: () => locationApi.cities({ limit: 100, sort: 'name' }) });
  const [f, setF] = useState({ code: badge?.code || '', name: badge?.name || '', description: badge?.description || '', icon: badge?.icon || 'award', tier: badge?.tier || 'BRONZE', active: badge?.active ?? true, rule: { type: badge?.rule?.type || 'POINTS', threshold: badge?.rule?.threshold ?? 1, city: badge?.rule?.city?._id || '' } });
  const save = useMutation({
    mutationFn: () => (badge ? adminApi.updateBadge(badge._id, f) : adminApi.createBadge(f)),
    onSuccess: () => (toast.success('Badge saved'), qc.invalidateQueries({ queryKey: ['admin', 'badges'] }), onClose()),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const rule = (k) => (e) => setF((s) => ({ ...s, rule: { ...s.rule, [k]: e.target.value } }));
  return (
    <Modal open onClose={onClose} title={badge ? `Edit ${badge.name}` : 'New badge'} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Code" value={f.code} onChange={set('code')} disabled={Boolean(badge)} placeholder="FDFS_LEGEND" />
        <Input label="Name" value={f.name} onChange={set('name')} />
        <Textarea label="Description" rows={2} className="sm:col-span-2" value={f.description} onChange={set('description')} />
        <Select label="Icon" value={f.icon} onChange={set('icon')} options={Object.keys(BADGE_ICONS).map((i) => ({ value: i, label: i }))} />
        <Select label="Tier" value={f.tier} onChange={set('tier')} options={['BRONZE', 'SILVER', 'GOLD'].map((t) => ({ value: t, label: t }))} />
        <Select label="Rule" value={f.rule.type} onChange={rule('type')} options={[['JOINED', 'On registration'], ['CITY_MEMBER', 'Member of city'], ['FANCLUB_MEMBER', 'Fan club memberships ≥'], ['EVENTS_ATTENDED', 'Events attended ≥'], ['FDFS_ATTENDED', 'FDFS attended ≥'], ['REFERRALS', 'Successful referrals ≥'], ['POINTS', 'Points ≥'], ['MANUAL', 'Manual award only']].map(([value, label]) => ({ value, label }))} />
        {['FANCLUB_MEMBER', 'EVENTS_ATTENDED', 'FDFS_ATTENDED', 'REFERRALS', 'POINTS'].includes(f.rule.type) && <Input label="Threshold" type="number" min="0" value={f.rule.threshold} onChange={rule('threshold')} />}
        {f.rule.type === 'CITY_MEMBER' && <Select label="City (optional)" value={f.rule.city} onChange={rule('city')} placeholder="Any city" options={(cities.data?.items || []).map((c) => ({ value: c._id, label: c.name }))} />}
        <div className="sm:col-span-2"><Switch label="Active" checked={f.active} onChange={(v) => setF((s) => ({ ...s, active: v }))} /></div>
      </div>
    </Modal>
  );
}

export function AdminBadges() {
  const [form, setForm] = useState(null);
  const query = useQuery({ queryKey: ['admin', 'badges'], queryFn: adminApi.badges });
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-fog-400">Badges are awarded automatically when a user meets the rule.</p>
        <Button icon={Plus} onClick={() => setForm({})}>New badge</Button>
      </div>
      <AdminTable
        query={query}
        emptyIcon={Award}
        columns={[
          { key: 'n', label: 'Badge', render: (b) => <span className="flex items-center gap-2 font-semibold text-fog-100"><BadgeIcon name={b.icon} className="size-4 text-gold-400" />{b.name}</span> },
          { key: 'code', label: 'Code', render: (b) => <span className="text-xs text-fog-400">{b.code}</span> },
          { key: 'rule', label: 'Rule', render: (b) => `${b.rule.type}${b.rule.threshold ? ` ≥ ${b.rule.threshold}` : ''}${b.rule.city ? ` (${b.rule.city.name})` : ''}` },
          { key: 'tier', label: 'Tier', render: (b) => b.tier },
          { key: 's', label: 'Status', render: (b) => <StatusBadge status={b.active ? 'ACTIVE' : 'DISABLED'} /> },
          { key: 'a', label: '', className: 'text-right', render: (b) => <Button size="sm" variant="secondary" onClick={() => setForm({ badge: b })}>Edit</Button> },
        ]}
      />
      {form && <BadgeForm badge={form.badge} onClose={() => setForm(null)} />}
    </div>
  );
}

// ------------------------------------------------------------------ Site settings
export function AdminSettings() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminApi.settings });
  const [s, setS] = useState(null);
  useEffect(() => {
    if (data?.settings) setS(structuredClone(data.settings));
  }, [data]);
  const save = useMutation({
    mutationFn: () => {
      const { platformName, tagline, description, logo, favicon, hero, contactEmail, social, footerText, disclaimer, seo, defaultImages, maintenanceMode, maintenanceMessage } = s;
      return adminApi.updateSettings({ platformName, tagline, description, logo: logo || null, favicon: favicon || null, hero, contactEmail, social, footerText, disclaimer, seo, defaultImages, maintenanceMode, maintenanceMessage });
    },
    onSuccess: () => (toast.success('Settings saved'), qc.invalidateQueries({ queryKey: ['settings'] })),
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (isLoading || (!s && !isError)) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  const set = (path) => (eOrV) => {
    const v = eOrV?.target ? eOrV.target.value : eOrV;
    setS((prev) => {
      const next = structuredClone(prev);
      const keys = path.split('.');
      let o = next;
      keys.slice(0, -1).forEach((k) => (o = o[k] ??= {}));
      o[keys.at(-1)] = v;
      return next;
    });
  };
  return (
    <form className="space-y-6" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      <section className="card space-y-4 p-5">
        <h2 className="eyebrow">Branding</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Platform name" value={s.platformName} onChange={set('platformName')} />
          <Input label="Contact email" type="email" value={s.contactEmail || ''} onChange={set('contactEmail')} />
        </div>
        <Input label="Tagline" value={s.tagline || ''} onChange={set('tagline')} />
        <Textarea label="Description" rows={2} value={s.description || ''} onChange={set('description')} />
        <div className="grid gap-4 sm:grid-cols-3">
          <ImageUpload label="Logo" value={s.logo} onChange={set('logo')} folder="branding" aspect="aspect-[3/1]" />
          <ImageUpload label="Favicon" value={s.favicon} onChange={set('favicon')} folder="branding" aspect="aspect-square max-w-24" />
          <ImageUpload label="Social share image" value={s.seo?.ogImage} onChange={set('seo.ogImage')} folder="branding" />
        </div>
      </section>
      <section className="card space-y-4 p-5">
        <h2 className="eyebrow">Homepage hero</h2>
        <Textarea label="Headline (one line per row)" rows={3} value={s.hero?.headline || ''} onChange={set('hero.headline')} />
        <Textarea label="Subheading" rows={2} value={s.hero?.subheading || ''} onChange={set('hero.subheading')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Primary CTA" value={s.hero?.primaryCta || ''} onChange={set('hero.primaryCta')} />
          <Input label="Secondary CTA" value={s.hero?.secondaryCta || ''} onChange={set('hero.secondaryCta')} />
          <Input label="Background video URL (optional)" value={s.hero?.backgroundVideoUrl || ''} onChange={set('hero.backgroundVideoUrl')} hint="MP4 you own the rights to" />
        </div>
        <ImageUpload label="Hero background image" value={s.hero?.backgroundImage} onChange={set('hero.backgroundImage')} folder="branding" hint="Upload only imagery you have permission to use. No celebrity photos without rights." />
      </section>
      <section className="card space-y-4 p-5">
        <h2 className="eyebrow">Social & footer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {['instagram', 'whatsapp', 'twitter', 'youtube', 'facebook'].map((k) => (
            <Input key={k} label={k[0].toUpperCase() + k.slice(1)} value={s.social?.[k] || ''} onChange={set(`social.${k}`)} placeholder={k === 'whatsapp' ? 'Number or wa.me link' : 'Handle or URL'} />
          ))}
        </div>
        <Input label="Footer text" value={s.footerText || ''} onChange={set('footerText')} />
        <Textarea label="Disclaimer (shown in every footer)" rows={3} value={s.disclaimer || ''} onChange={set('disclaimer')} hint="Must clearly state the platform is not officially affiliated." />
      </section>
      <section className="card space-y-4 p-5">
        <h2 className="eyebrow">SEO</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Default title" value={s.seo?.defaultTitle || ''} onChange={set('seo.defaultTitle')} />
          <Input label="Title template" value={s.seo?.titleTemplate || ''} onChange={set('seo.titleTemplate')} hint="%s is replaced by the page title" />
        </div>
        <Textarea label="Default description" rows={2} value={s.seo?.defaultDescription || ''} onChange={set('seo.defaultDescription')} />
        <Input label="Keywords" value={s.seo?.keywords || ''} onChange={set('seo.keywords')} />
      </section>
      <section className="card space-y-4 p-5">
        <h2 className="eyebrow">Default images</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ImageUpload label="City cover" value={s.defaultImages?.cityCover} onChange={set('defaultImages.cityCover')} folder="branding" />
          <ImageUpload label="Fan club cover" value={s.defaultImages?.fanClubCover} onChange={set('defaultImages.fanClubCover')} folder="branding" />
          <ImageUpload label="Event cover" value={s.defaultImages?.eventCover} onChange={set('defaultImages.eventCover')} folder="branding" />
          <ImageUpload label="FDFS poster" value={s.defaultImages?.fdfsPoster} onChange={set('defaultImages.fdfsPoster')} folder="branding" aspect="aspect-[2/3]" />
        </div>
      </section>
      <section className="card space-y-4 border-crimson-500/20 p-5">
        <h2 className="eyebrow">Maintenance</h2>
        <Switch label="Maintenance mode" description="Only super admins can use the API while enabled" checked={s.maintenanceMode} onChange={set('maintenanceMode')} />
        <Input label="Maintenance message" value={s.maintenanceMessage || ''} onChange={set('maintenanceMessage')} />
      </section>
      <Button type="submit" size="lg" loading={save.isPending}>Save settings</Button>
    </form>
  );
}
