import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Clapperboard,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Network,
  Pencil,
  Plus,
  Settings,
  UserCheck,
  Users,
  UserX,
  Eye,
  Send,
} from 'lucide-react';
import { announcementApi, fanClubApi, networkApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useActiveClubId } from '../../store/clubStore.js';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { ImageUpload } from '../../components/common/ImageUpload.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select, Switch, Textarea } from '../../components/ui/Form.jsx';
import { Modal, ConfirmDialog } from '../../components/ui/Modal.jsx';
import { Avatar, EmptyState, ErrorState, LoadingState, Pagination, StatCard, StatusBadge, Tabs } from '../../components/ui/Display.jsx';
import { InstagramIcon } from '../../components/ui/BrandIcons.jsx';
import { EventFormModal, FdfsFormModal, ParticipantsModal } from '../../features/fanclub/EventForms.jsx';
import { AnnouncementFormModal } from '../../features/fanclub/AnnouncementForm.jsx';
import { formatDate, instagramUrl, timeAgo, toInputDate } from '../../utils/format.js';
import { MEMBERSHIP_TYPES } from '../../constants/index.js';
import { useDebounce } from '../../hooks/useDebounce.js';

// ------------------------------------------------------------------ Dashboard
function ClubDashboard({ club }) {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['club-dashboard', club._id], queryFn: () => fanClubApi.dashboard(club._id) });
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  const s = data.stats;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Members" value={s.members} icon={Users} hint={`+${s.newMembers30} in 30 days`} />
        <StatCard label="Pending requests" value={s.pendingRequests} icon={UserCheck} tone="red" />
        <StatCard label="Upcoming events" value={s.upcomingEvents} icon={CalendarDays} />
        <StatCard label="Upcoming FDFS" value={s.upcomingFdfs} icon={Clapperboard} tone="red" />
        <StatCard label="New contact requests" value={s.openContactRequests} icon={Inbox} />
        <StatCard label="FDFS going" value={s.fdfsGoing} icon={Clapperboard} hint={`${s.fdfsAttended} attended`} />
        <StatCard label="Event going" value={s.eventGoing} icon={CalendarDays} hint={`${s.eventAttended} attended`} />
        <StatCard label="Status" value={undefined} hint={club.status} icon={Eye} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-fog-100">Upcoming FDFS</h2>
          {data.upcomingFdfs.length ? (
            <ul className="space-y-2 text-sm">
              {data.upcomingFdfs.map((f) => (
                <li key={f._id} className="flex justify-between gap-3">
                  <span className="truncate text-fog-200">{f.movie} · {formatDate(f.releaseDate)}</span>
                  <span className="shrink-0 text-gold-300">{f.counts.going} going</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fog-400">No FDFS scheduled.</p>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-fog-100">Upcoming events</h2>
          {data.upcomingEvents.length ? (
            <ul className="space-y-2 text-sm">
              {data.upcomingEvents.map((e) => (
                <li key={e._id} className="flex justify-between gap-3">
                  <span className="truncate text-fog-200">{e.title} · {formatDate(e.date)}</span>
                  <span className="shrink-0 text-gold-300">{e.counts.going} going</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fog-400">No events scheduled.</p>
          )}
        </section>
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold text-fog-100">Recent members</h2>
          {data.recentMembers.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.recentMembers.map((m) => (
                <li key={m._id} className="flex items-center gap-3">
                  <Avatar src={m.user.profilePhoto?.url} name={m.user.fullName} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm text-fog-100">{m.user.fullName}</span>
                  <span className="text-xs text-fog-500">{timeAgo(m.joinedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fog-400">No members yet — share your club page!</p>
          )}
        </section>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Members
function Members({ club }) {
  const [status, setStatus] = useState('ACTIVE');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null);
  const dq = useDebounce(q);
  const toast = useToast();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['club-members', club._id, status, dq, page], queryFn: () => fanClubApi.members(club._id, { status, q: dq, page, limit: 25 }), placeholderData: keepPreviousData });
  const act = useMutation({
    mutationFn: ({ id, action }) => fanClubApi.memberAction(club._id, id, action),
    onSuccess: () => {
      toast.success('Member updated');
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ['club-members', club._id] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={status} onChange={(v) => (setStatus(v), setPage(1))} tabs={[{ value: 'ACTIVE', label: 'Members' }, { value: 'PENDING', label: 'Requests' }, { value: 'REMOVED', label: 'Removed' }]} />
        <Input aria-label="Search members" placeholder="Search members…" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} className="sm:w-64" />
      </div>
      {list.isLoading ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : !list.data.items.length ? (
        <EmptyState icon={Users} title={status === 'PENDING' ? 'No pending requests' : 'No members found'} />
      ) : (
        <>
          <ul className="card divide-y divide-white/5">
            {list.data.items.map((m) => (
              <li key={m._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Avatar src={m.user?.profilePhoto?.url} name={m.user?.fullName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fog-100">
                    {m.user?.fullName} {m.role === 'ADMIN' && <span className="ml-1 text-xs text-gold-400">Admin</span>}
                  </span>
                  <span className="block truncate text-xs text-fog-500">
                    @{m.user?.username} {m.user?.city?.name ? `· ${m.user.city.name}` : ''} · {timeAgo(m.joinedAt || m.createdAt)}
                  </span>
                </span>
                {m.user?.instagram && (
                  <a href={instagramUrl(m.user.instagram)} target="_blank" rel="noopener noreferrer" className="p-2 text-fog-400 hover:text-gold-300" aria-label="Instagram">
                    <InstagramIcon />
                  </a>
                )}
                {m.role !== 'ADMIN' && status === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => act.mutate({ id: m._id, action: 'APPROVE' })}>Approve</Button>
                    <Button size="sm" variant="ghost" onClick={() => act.mutate({ id: m._id, action: 'REJECT' })}>Reject</Button>
                  </div>
                )}
                {m.role !== 'ADMIN' && status === 'ACTIVE' && (
                  <Button size="sm" variant="ghost" icon={UserX} onClick={() => setConfirm(m)} aria-label={`Remove ${m.user?.fullName}`}>
                    <span className="hidden sm:inline">Remove</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <Pagination pagination={list.data.pagination} onPage={setPage} />
        </>
      )}
      <ConfirmDialog open={Boolean(confirm)} onClose={() => setConfirm(null)} danger title="Remove member?" message={`${confirm?.user?.fullName} will be removed and cannot rejoin without contacting you.`} confirmLabel="Remove" loading={act.isPending} onConfirm={() => act.mutate({ id: confirm._id, action: 'REMOVE' })} />
    </div>
  );
}

// ------------------------------------------------------------------ Events & FDFS
function ManagedList({ club, kind }) {
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState({ open: false, item: null });
  const [people, setPeople] = useState(null);
  const isFdfs = kind === 'fdfs';
  const list = useQuery({ queryKey: [isFdfs ? 'managed-fdfs' : 'managed-events', club._id], queryFn: () => (isFdfs ? fanClubApi.fdfs({ fanClub: club._id }) : fanClubApi.events({ fanClub: club._id })) });

  // Deep link from detail pages: /fan-club/events?edit=<id>
  const editId = params.get('edit');
  useEffect(() => {
    if (editId && list.data) {
      const item = list.data.items.find((i) => i._id === editId);
      if (item) setForm({ open: true, item });
      params.delete('edit');
      setParams(params, { replace: true });
    }
  }, [editId, list.data, params, setParams]);

  const Form = isFdfs ? FdfsFormModal : EventFormModal;
  const disabled = club.status !== 'APPROVED';
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-fog-400">{isFdfs ? 'City FDFS plans for your members.' : 'Meetups, celebrations and screenings.'}</p>
        <Button icon={Plus} onClick={() => setForm({ open: true, item: null })} disabled={disabled} title={disabled ? 'Your club must be verified first' : undefined}>
          {isFdfs ? 'New FDFS' : 'New event'}
        </Button>
      </div>
      {list.isLoading ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : !list.data.items.length ? (
        <EmptyState icon={isFdfs ? Clapperboard : CalendarDays} title={isFdfs ? 'No FDFS yet' : 'No events yet'} message={disabled ? 'Available once your club is verified.' : 'Create your first one.'} />
      ) : (
        <ul className="card divide-y divide-white/5">
          {list.data.items.map((it) => (
            <li key={it._id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <a href={`/${isFdfs ? 'fdfs' : 'events'}/${it.slug}`} className="block truncate font-semibold text-fog-100 hover:text-gold-300">
                  {isFdfs ? `${it.movie} FDFS` : it.title}
                </a>
                <p className="text-xs text-fog-400">
                  {formatDate(isFdfs ? it.releaseDate : it.date)} · {it.city?.name} · {it.counts?.going || 0} going · {it.counts?.interested || 0} interested · {it.counts?.attended || 0} attended
                  {!it.registrationOpen && ' · registration closed'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={it.status} />
                <Button size="sm" variant="secondary" icon={Users} onClick={() => setPeople(it)}>
                  People
                </Button>
                <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setForm({ open: true, item: it })}>
                  Edit
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Form open={form.open} onClose={() => setForm({ open: false, item: null })} club={club} {...(isFdfs ? { fdfs: form.item } : { event: form.item })} />
      <ParticipantsModal open={Boolean(people)} onClose={() => setPeople(null)} kind={kind} item={people} />
    </div>
  );
}

// ------------------------------------------------------------------ Announcements
function Announcements({ club }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({ queryKey: ['managed-announcements', club._id], queryFn: () => fanClubApi.announcements({ fanClub: club._id }) });
  const events = useQuery({ queryKey: ['managed-events', club._id], queryFn: () => fanClubApi.events({ fanClub: club._id }) });
  const fdfs = useQuery({ queryKey: ['managed-fdfs', club._id], queryFn: () => fanClubApi.fdfs({ fanClub: club._id }) });
  const remove = useMutation({ mutationFn: announcementApi.remove, onSuccess: () => (toast.success('Deleted'), qc.invalidateQueries({ queryKey: ['managed-announcements'] })), onError: (e) => toast.error(errorMessage(e)) });
  const targets = useMemo(
    () => [
      { value: 'FAN_CLUB', label: 'All club members', field: 'fanClub', fixedId: club._id },
      { value: 'FDFS', label: 'FDFS participants', field: 'fdfs', options: (fdfs.data?.items || []).map((f) => ({ value: f._id, label: `${f.movie} FDFS` })) },
      { value: 'EVENT', label: 'Event attendees', field: 'event', options: (events.data?.items || []).map((e) => ({ value: e._id, label: e.title })) },
    ],
    [club._id, fdfs.data, events.data]
  );
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-fog-400">e.g. “Meeting point updated”, “Theatre details announced”.</p>
        <Button icon={Plus} onClick={() => setOpen(true)} disabled={club.status !== 'APPROVED'}>
          New
        </Button>
      </div>
      {list.isLoading ? (
        <LoadingState />
      ) : !list.data?.items?.length ? (
        <EmptyState icon={Megaphone} title="No announcements yet" />
      ) : (
        <ul className="space-y-3">
          {list.data.items.map((a) => (
            <li key={a._id} className="card flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-fog-100">{a.title}</p>
                {a.body && <p className="mt-1 text-sm whitespace-pre-line text-fog-300">{a.body}</p>}
                <p className="mt-1 text-xs text-fog-500">
                  {a.target.replace('_', ' ')} · {timeAgo(a.createdAt)} · by {a.author?.fullName}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(a._id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
      <AnnouncementFormModal open={open} onClose={() => setOpen(false)} targets={targets} />
    </div>
  );
}

// ------------------------------------------------------------------ Contact requests
function ContactRequests({ club }) {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [reply, setReply] = useState(null);
  const [text, setText] = useState('');
  const toast = useToast();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['contact-requests', club._id, status, page], queryFn: () => fanClubApi.contactRequests({ fanClub: club._id, status, page }), placeholderData: keepPreviousData });
  const upd = useMutation({
    mutationFn: ({ id, body }) => fanClubApi.updateContactRequest(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-requests'] });
      qc.invalidateQueries({ queryKey: ['club-dashboard'] });
      setReply(null);
      setText('');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div>
      <Tabs className="mb-4" value={status} onChange={(v) => (setStatus(v), setPage(1))} tabs={[{ value: '', label: 'All' }, { value: 'NEW', label: 'New' }, { value: 'READ', label: 'Read' }, { value: 'RESPONDED', label: 'Responded' }, { value: 'CLOSED', label: 'Closed' }]} />
      {list.isLoading ? (
        <LoadingState />
      ) : !list.data?.items?.length ? (
        <EmptyState icon={Inbox} title="No contact requests" message="Members can reach you through “Contact Admin” without seeing your phone number." />
      ) : (
        <>
          <ul className="space-y-3">
            {list.data.items.map((r) => (
              <li key={r._id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-fog-100">{r.subject}</p>
                    <p className="text-xs text-fog-500">
                      From {r.name} (@{r.fromUser?.username}) · {timeAgo(r.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-3 text-sm whitespace-pre-line text-fog-300">{r.message}</p>
                {r.response && <p className="mt-3 border-l-2 border-gold-500/60 pl-3 text-sm text-fog-200">You: {r.response}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" icon={Send} onClick={() => (setReply(r), setText(r.response || ''))}>
                    {r.response ? 'Edit reply' : 'Reply'}
                  </Button>
                  {r.status === 'NEW' && (
                    <Button size="sm" variant="ghost" onClick={() => upd.mutate({ id: r._id, body: { status: 'READ' } })}>
                      Mark read
                    </Button>
                  )}
                  {r.status !== 'CLOSED' && (
                    <Button size="sm" variant="ghost" onClick={() => upd.mutate({ id: r._id, body: { status: 'CLOSED' } })}>
                      Close
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pagination pagination={list.data.pagination} onPage={setPage} />
        </>
      )}
      <Modal open={Boolean(reply)} onClose={() => setReply(null)} title={`Reply to ${reply?.name}`} description="Your reply is delivered as an in-app notification. Share contact details only if you choose to." footer={<><Button variant="ghost" onClick={() => setReply(null)}>Cancel</Button><Button loading={upd.isPending} disabled={text.trim().length < 2} onClick={() => upd.mutate({ id: reply._id, body: { response: text } })}>Send reply</Button></>}>
        <Textarea label="Reply" rows={5} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
      </Modal>
    </div>
  );
}

// ------------------------------------------------------------------ Settings
function ClubSettings({ club }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState(null);
  useEffect(() => {
    setF({
      name: club.name,
      description: club.description || '',
      adminName: club.adminName || '',
      instagram: club.instagram || '',
      whatsappNumber: club.whatsappNumber || '',
      phone: club.phone || '',
      whatsappGroupLink: club.whatsappGroupLink || '',
      telegramLink: club.telegramLink || '',
      website: club.website || '',
      foundedDate: toInputDate(club.foundedDate),
      membershipType: club.membershipType,
      logo: club.logo || null,
      coverImage: club.coverImage || null,
      contactVisibility: { ...club.contactVisibility },
      eventDefaults: { whatsappGroupLink: club.eventDefaults?.whatsappGroupLink || '', venue: club.eventDefaults?.venue || '', capacity: club.eventDefaults?.capacity ?? '' },
    });
  }, [club]);
  const save = useMutation({
    mutationFn: () =>
      fanClubApi.update(club._id, {
        ...f,
        foundedDate: f.foundedDate || null,
        eventDefaults: { ...f.eventDefaults, capacity: f.eventDefaults.capacity === '' ? undefined : Number(f.eventDefaults.capacity) },
      }),
    onSuccess: (d) => {
      toast.success(d.fanClub.status === 'PENDING' && club.status === 'CHANGES_REQUESTED' ? 'Saved and resubmitted for verification' : 'Club settings saved');
      qc.invalidateQueries({ queryKey: ['managed-clubs'] });
      qc.invalidateQueries({ queryKey: ['fan-club'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!f) return null;
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const vis = (k) => (v) => setF((s) => ({ ...s, contactVisibility: { ...s.contactVisibility, [k]: v } }));
  const def = (k) => (e) => setF((s) => ({ ...s, eventDefaults: { ...s.eventDefaults, [k]: e.target.value } }));
  return (
    <form className="space-y-6" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      {club.status === 'CHANGES_REQUESTED' && <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">Changes requested: {club.reviewNote || 'see notification'}. Saving will resubmit your club for review.</p>}
      <section className="card space-y-4 p-5">
        <h2 className="eyebrow">Identity</h2>
        <Input label="Club name" value={f.name} onChange={set('name')} />
        <Textarea label="Description" rows={5} value={f.description} onChange={set('description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUpload label="Logo" value={f.logo} onChange={(v) => setF((s) => ({ ...s, logo: v }))} folder="fan-clubs" aspect="aspect-square max-w-40" rounded="rounded-full" />
          <ImageUpload label="Cover" value={f.coverImage} onChange={(v) => setF((s) => ({ ...s, coverImage: v }))} folder="fan-clubs" />
        </div>
      </section>
      <section className="card space-y-4 p-5">
        <h2 className="eyebrow">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Admin name" value={f.adminName} onChange={set('adminName')} />
          <Input label="Instagram" value={f.instagram} onChange={set('instagram')} />
          <Input label="WhatsApp number" value={f.whatsappNumber} onChange={set('whatsappNumber')} inputMode="tel" />
          <Input label="Phone" value={f.phone} onChange={set('phone')} inputMode="tel" />
          <Input label="WhatsApp group link" value={f.whatsappGroupLink} onChange={set('whatsappGroupLink')} />
          <Input label="Telegram link" value={f.telegramLink} onChange={set('telegramLink')} />
          <Input label="Website" value={f.website} onChange={set('website')} />
          <Input label="Founded" type="date" value={f.foundedDate} onChange={set('foundedDate')} />
        </div>
        <div className="rounded-xl border border-white/5 bg-ink-850 p-4">
          <p className="text-sm font-semibold text-fog-100">Contact visibility</p>
          <p className="mb-2 text-xs text-fog-400">Hidden details are never included in public API responses.</p>
          <Switch label="Show Instagram" checked={f.contactVisibility.showInstagram} onChange={vis('showInstagram')} />
          <Switch label="Show WhatsApp number" checked={f.contactVisibility.showWhatsApp} onChange={vis('showWhatsApp')} />
          <Switch label="Show phone number" checked={f.contactVisibility.showPhone} onChange={vis('showPhone')} />
          <Switch label="Show WhatsApp group" checked={f.contactVisibility.showWhatsAppGroup} onChange={vis('showWhatsAppGroup')} />
        </div>
      </section>
      <section className="card space-y-4 p-5">
        <h2 className="eyebrow">Membership & event defaults</h2>
        <Select label="Membership type" value={f.membershipType} onChange={set('membershipType')} options={Object.entries(MEMBERSHIP_TYPES).map(([value, label]) => ({ value, label }))} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Default venue" value={f.eventDefaults.venue} onChange={def('venue')} />
          <Input label="Default capacity" type="number" min="0" value={f.eventDefaults.capacity} onChange={def('capacity')} />
          <Input label="Default WhatsApp group" value={f.eventDefaults.whatsappGroupLink} onChange={def('whatsappGroupLink')} />
        </div>
      </section>
      <Button type="submit" size="lg" loading={save.isPending}>
        Save settings
      </Button>
    </form>
  );
}

// ------------------------------------------------------------------ Admin network
function AdminNetwork({ club }) {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'directory';
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [target, setTarget] = useState(null);
  const [msg, setMsg] = useState({ subject: '', message: '' });
  const toast = useToast();
  const qc = useQueryClient();
  const dir = useQuery({ queryKey: ['network', dq], queryFn: () => networkApi.directory({ q: dq, limit: 48 }), enabled: tab === 'directory' });
  const box = useQuery({ queryKey: ['collabs', tab], queryFn: () => networkApi.collaborations({ box: tab }), enabled: tab !== 'directory' });
  const send = useMutation({
    mutationFn: () => networkApi.send({ senderClub: club._id, receiverClub: target._id, ...msg }),
    onSuccess: () => (toast.success('Collaboration request sent'), setTarget(null), setMsg({ subject: '', message: '' }), qc.invalidateQueries({ queryKey: ['collabs'] })),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const respond = useMutation({ mutationFn: ({ id, status }) => networkApi.respond(id, { status }), onSuccess: () => qc.invalidateQueries({ queryKey: ['collabs'] }), onError: (e) => toast.error(errorMessage(e)) });

  return (
    <div>
      <p className="mb-4 text-sm text-fog-400">Private directory of verified fan club admins. Visible only to club admins, moderators and the platform team.</p>
      <Tabs className="mb-4" value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} tabs={[{ value: 'directory', label: 'Directory' }, { value: 'inbox', label: 'Inbox' }, { value: 'sent', label: 'Sent' }]} />
      {tab === 'directory' ? (
        <>
          <Input aria-label="Search clubs" placeholder="Search clubs…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4" />
          {dir.isLoading ? (
            <LoadingState />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {(dir.data?.items || [])
                .filter((c) => c._id !== club._id)
                .map((c) => (
                  <li key={c._id} className="card flex items-center gap-3 p-4">
                    <Avatar src={c.logo?.url} name={c.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-fog-100">{c.name}</p>
                      <p className="truncate text-xs text-fog-400">
                        {c.admin?.fullName} · {c.city?.name}, {c.state?.name}
                      </p>
                      {c.instagram && (
                        <a href={instagramUrl(c.instagram)} target="_blank" rel="noopener noreferrer" className="text-xs text-gold-300">
                          @{c.instagram}
                        </a>
                      )}
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setTarget(c)} disabled={club.status !== 'APPROVED'}>
                      Collaborate
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </>
      ) : box.isLoading ? (
        <LoadingState />
      ) : !box.data?.items?.length ? (
        <EmptyState icon={Network} title={tab === 'inbox' ? 'No collaboration requests' : 'Nothing sent yet'} />
      ) : (
        <ul className="space-y-3">
          {box.data.items.map((c) => (
            <li key={c._id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-fog-100">{c.subject}</p>
                  <p className="text-xs text-fog-500">
                    {c.senderClub?.name} ({c.senderClub?.city?.name}) → {c.receiverClub?.name} ({c.receiverClub?.city?.name}) · {timeAgo(c.createdAt)}
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-2 text-sm whitespace-pre-line text-fog-300">{c.message}</p>
              {c.status === 'PENDING' && (
                <div className="mt-3 flex gap-2">
                  {tab === 'inbox' && (
                    <>
                      <Button size="sm" onClick={() => respond.mutate({ id: c._id, status: 'ACCEPTED' })}>Accept</Button>
                      <Button size="sm" variant="ghost" onClick={() => respond.mutate({ id: c._id, status: 'REJECTED' })}>Decline</Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => respond.mutate({ id: c._id, status: 'CLOSED' })}>Close</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Modal open={Boolean(target)} onClose={() => setTarget(null)} title={`Collaborate with ${target?.name}`} footer={<><Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button><Button loading={send.isPending} disabled={msg.subject.length < 3 || msg.message.length < 10} onClick={() => send.mutate()}>Send request</Button></>}>
        <div className="space-y-4">
          <Input label="Subject" value={msg.subject} onChange={(e) => setMsg((s) => ({ ...s, subject: e.target.value }))} placeholder="KING FDFS Collaboration" />
          <Textarea label="Message" rows={5} value={msg.message} onChange={(e) => setMsg((s) => ({ ...s, message: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}

// ------------------------------------------------------------------ Panel shell
export default function FanClubPanel() {
  const managed = useQuery({ queryKey: ['managed-clubs'], queryFn: fanClubApi.managed });
  const [activeId, setActiveId] = useActiveClubId();
  const clubs = managed.data?.clubs || [];
  const club = clubs.find((c) => c._id === activeId) || clubs.find((c) => c.status === 'APPROVED') || clubs[0];

  if (managed.isLoading) return <LoadingState className="min-h-[60vh]" />;
  if (managed.isError) return <div className="container-page py-16"><ErrorState error={managed.error} onRetry={managed.refetch} /></div>;
  if (!club) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={Users} title="You don't manage a fan club yet" message="Register your fan club to unlock the dashboard." action={<Button to="/fan-clubs/register">Register your fan club</Button>} />
      </div>
    );
  }

  const nav = [
    { to: '/fan-club/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/fan-club/members', label: 'Members', icon: Users },
    { to: '/fan-club/events', label: 'Events', icon: CalendarDays },
    { to: '/fan-club/fdfs', label: 'FDFS', icon: Clapperboard },
    { to: '/fan-club/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/fan-club/contact-requests', label: 'Contact requests', icon: Inbox },
    { to: '/fan-club/network', label: 'Admin network', icon: Network },
    { to: '/fan-club/settings', label: 'Settings', icon: Settings },
  ];

  // Club tools unlock after verification; settings stay editable so admins can resubmit.
  const gate = (el) => (club.status === 'APPROVED' ? el : <PendingNotice club={club} />);

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      {clubs.length > 1 && (
        <Select aria-label="Active fan club" value={club._id} onChange={(e) => setActiveId(e.target.value)} options={clubs.map((c) => ({ value: c._id, label: c.name }))} className="w-56" />
      )}
      <StatusBadge status={club.status} />
      <Button size="sm" variant="ghost" to={`/fan-clubs/${club.slug}`} icon={Eye}>
        View page
      </Button>
    </div>
  );

  return (
    <>
      <Seo title={`${club.name} — Dashboard`} noindex />
      <Routes>
        <Route element={<DashboardLayout title={club.name} subtitle="Fan club dashboard" nav={nav} header={header} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={gate(<ClubDashboard club={club} />)} />
          <Route path="members" element={gate(<Members club={club} />)} />
          <Route path="events" element={gate(<ManagedList club={club} kind="event" />)} />
          <Route path="fdfs" element={gate(<ManagedList club={club} kind="fdfs" />)} />
          <Route path="announcements" element={gate(<Announcements club={club} />)} />
          <Route path="contact-requests" element={gate(<ContactRequests club={club} />)} />
          <Route path="network" element={gate(<AdminNetwork club={club} />)} />
          <Route path="settings" element={<ClubSettings club={club} />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Routes>
    </>
  );
}

function PendingNotice({ club }) {
  return (
    <EmptyState
      icon={Eye}
      title={club.status === 'PENDING' ? 'Pending verification' : `Club ${club.status.replace('_', ' ').toLowerCase()}`}
      message={club.reviewNote || 'Most tools unlock once a moderator verifies your club. You can still update your settings.'}
      action={<Button to="/fan-club/settings">Open settings</Button>}
    />
  );
}
