import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Download, RefreshCw } from 'lucide-react';
import { eventApi, fdfsApi, locationApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select, Switch, Textarea } from '../../components/ui/Form.jsx';
import { ImageUpload } from '../../components/common/ImageUpload.jsx';
import { Avatar, EmptyState, LoadingState, StatusBadge, Tabs } from '../../components/ui/Display.jsx';
import { EVENT_STATUS, EVENT_TYPES, SITE_URL } from '../../constants/index.js';
import { eventSchema, fdfsSchema, toPayload } from '../../validations/schemas.js';
import { toInputDate } from '../../utils/format.js';

const blankToUndef = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? undefined : v]));

/** Create / edit an event. `club` supplies default city + WhatsApp group. */
export function EventFormModal({ open, onClose, club, event }) {
  const toast = useToast();
  const qc = useQueryClient();
  const editing = Boolean(event);
  const [cover, setCover] = useState(event?.coverImage || null);
  const [regOpen, setRegOpen] = useState(event?.registrationOpen ?? true);
  const [status, setStatus] = useState(event?.status || 'UPCOMING');
  const [cityId, setCityId] = useState(event?.city?._id || club?.city?._id || club?.city || '');
  const cities = useQuery({ queryKey: ['cities', 'by-state', club?.state?._id || club?.state], queryFn: () => locationApi.cities({ state: club?.state?._id || club?.state, limit: 100, sort: 'name' }), enabled: open && !editing && Boolean(club?.state) });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(eventSchema) });
  useEffect(() => {
    if (!open) return;
    reset({
      title: event?.title || '',
      eventType: event?.eventType || 'FAN_MEET',
      date: toInputDate(event?.date),
      startTime: event?.startTime || '',
      endTime: event?.endTime || '',
      venue: event?.venue || club?.eventDefaults?.venue || '',
      address: event?.address || '',
      mapLink: event?.mapLink || '',
      capacity: event?.capacity ? String(event.capacity) : club?.eventDefaults?.capacity ? String(club.eventDefaults.capacity) : '',
      registrationDeadline: toInputDate(event?.registrationDeadline),
      contactInfo: event?.contactInfo || '',
      whatsappGroupLink: event?.whatsappGroupLink || club?.eventDefaults?.whatsappGroupLink || '',
      description: event?.description || '',
    });
    setCover(event?.coverImage || null);
    setRegOpen(event?.registrationOpen ?? true);
    setStatus(event?.status || 'UPCOMING');
  }, [open, event, club, reset]);

  const m = useMutation({
    mutationFn: (values) => {
      const body = blankToUndef({ ...toPayload(values, ['capacity']), coverImage: cover, registrationOpen: regOpen, status });
      if (editing) return eventApi.update(event._id, body);
      return eventApi.create({ ...body, city: cityId, fanClub: club._id });
    },
    onSuccess: () => {
      toast.success(editing ? 'Event updated — attendees notified of changes' : 'Event published');
      qc.invalidateQueries({ queryKey: ['managed-events'] });
      qc.invalidateQueries({ queryKey: ['events'] });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Modal open={open} onClose={onClose} size="lg" title={editing ? 'Edit event' : 'Create event'} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={handleSubmit((v) => m.mutate(v))} loading={m.isPending}>{editing ? 'Save changes' : 'Publish event'}</Button></>}>
      <div className="space-y-5">
        <Input label="Title" required error={errors.title?.message} {...register('title')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Type" options={Object.entries(EVENT_TYPES).map(([value, label]) => ({ value, label }))} {...register('eventType')} />
          {editing ? (
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={EVENT_STATUS.map((s) => ({ value: s, label: s }))} />
          ) : (
            <Select label="City" value={cityId} onChange={(e) => setCityId(e.target.value)} options={(cities.data?.items || []).map((c) => ({ value: c._id, label: c.name }))} hint="Defaults to your club's city" />
          )}
          <Input label="Date" type="date" required error={errors.date?.message} {...register('date')} />
          <Input label="Registration deadline" type="date" {...register('registrationDeadline')} />
          <Input label="Start time" type="time" {...register('startTime')} />
          <Input label="End time" type="time" {...register('endTime')} />
          <Input label="Venue" placeholder="Leave empty if not decided (shows To Be Announced)" {...register('venue')} />
          <Input label="Capacity" type="number" min="0" {...register('capacity')} />
        </div>
        <Input label="Address" {...register('address')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Map link" placeholder="https://maps.google.com/…" error={errors.mapLink?.message} {...register('mapLink')} />
          <Input label="WhatsApp group link" error={errors.whatsappGroupLink?.message} hint="Shown only to registered attendees" {...register('whatsappGroupLink')} />
        </div>
        <Input label="Contact info" placeholder="e.g. DM @club on Instagram" {...register('contactInfo')} />
        <Textarea label="Description" rows={4} {...register('description')} />
        <ImageUpload label="Cover image" value={cover} onChange={setCover} folder="events" />
        {!editing && (
          <Select label="Publish as" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'UPCOMING', label: 'Published (notify members)' }, { value: 'DRAFT', label: 'Draft (hidden)' }]} />
        )}
        <Switch label="Registrations open" checked={regOpen} onChange={setRegOpen} />
      </div>
    </Modal>
  );
}

export function FdfsFormModal({ open, onClose, club, fdfs }) {
  const toast = useToast();
  const qc = useQueryClient();
  const editing = Boolean(fdfs);
  const [poster, setPoster] = useState(fdfs?.poster || null);
  const [regOpen, setRegOpen] = useState(fdfs?.registrationOpen ?? true);
  const [status, setStatus] = useState(fdfs?.status || 'UPCOMING');
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(fdfsSchema) });

  useEffect(() => {
    if (!open) return;
    reset({
      movie: fdfs?.movie || '',
      releaseDate: toInputDate(fdfs?.releaseDate),
      theatre: fdfs?.theatre || '',
      theatreAddress: fdfs?.theatreAddress || '',
      mapLink: fdfs?.mapLink || '',
      showTime: fdfs?.showTime || '',
      meetingPoint: fdfs?.meetingPoint || '',
      meetingTime: fdfs?.meetingTime || '',
      capacity: fdfs?.capacity ? String(fdfs.capacity) : '',
      whatsappGroupLink: fdfs?.whatsappGroupLink || club?.eventDefaults?.whatsappGroupLink || '',
      instructions: fdfs?.instructions || '',
    });
    setPoster(fdfs?.poster || null);
    setRegOpen(fdfs?.registrationOpen ?? true);
    setStatus(fdfs?.status || 'UPCOMING');
  }, [open, fdfs, club, reset]);

  const m = useMutation({
    mutationFn: (values) => {
      // Empty strings are sent on edit so admins can clear details back to "To Be Announced".
      const body = { ...toPayload(values, ['capacity']), poster, registrationOpen: regOpen, status };
      if (editing) return fdfsApi.update(fdfs._id, body);
      return fdfsApi.create({ ...blankToUndef(body), fanClub: club._id });
    },
    onSuccess: () => {
      toast.success(editing ? 'FDFS updated — participants notified of changes' : 'FDFS published');
      qc.invalidateQueries({ queryKey: ['managed-fdfs'] });
      qc.invalidateQueries({ queryKey: ['fdfs'] });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Modal open={open} onClose={onClose} size="lg" title={editing ? `Edit ${fdfs.movie} FDFS` : 'Create FDFS'} description="Leave unknown details empty — they show as “To Be Announced”. Never guess theatre or timings." footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={handleSubmit((v) => m.mutate(v))} loading={m.isPending}>{editing ? 'Save changes' : 'Publish FDFS'}</Button></>}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Movie" required placeholder="e.g. KING" error={errors.movie?.message} {...register('movie')} />
          <Input label="Release date" type="date" required error={errors.releaseDate?.message} {...register('releaseDate')} />
          <Input label="Theatre" {...register('theatre')} />
          <Input label="Show time" placeholder="e.g. 6:00 AM" {...register('showTime')} />
          <Input label="Meeting point" {...register('meetingPoint')} />
          <Input label="Meeting time" placeholder="e.g. 5:15 AM" {...register('meetingTime')} />
          <Input label="Theatre address" {...register('theatreAddress')} />
          <Input label="Map link" error={errors.mapLink?.message} {...register('mapLink')} />
          <Input label="Capacity" type="number" min="0" {...register('capacity')} />
          <Input label="WhatsApp group link" error={errors.whatsappGroupLink?.message} hint="Shown only to participants" {...register('whatsappGroupLink')} />
        </div>
        <Textarea label="Instructions" rows={4} placeholder="Dress code, what to bring, ticket collection…" {...register('instructions')} />
        <ImageUpload label="Poster" value={poster} onChange={setPoster} folder="fdfs" aspect="aspect-[2/3] max-w-48" hint="Only upload a poster you have permission to use." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={(editing ? EVENT_STATUS : ['UPCOMING', 'DRAFT']).map((s) => ({ value: s, label: s }))} />
        </div>
        <Switch label="Registrations open" description="Opening registrations notifies club members" checked={regOpen} onChange={setRegOpen} />
      </div>
    </Modal>
  );
}

/** Attendee list + manual attendance + QR check-in code. `kind` = 'event' | 'fdfs'. */
export function ParticipantsModal({ open, onClose, kind, item }) {
  const api = kind === 'fdfs' ? fdfsApi : eventApi;
  const [tab, setTab] = useState('list');
  const [status, setStatus] = useState('');
  const toast = useToast();
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['participants', kind, item?._id, status],
    queryFn: () => (kind === 'fdfs' ? fdfsApi.participants(item._id, { status, limit: 200 }) : eventApi.attendees(item._id, { status, limit: 200 })),
    enabled: open && Boolean(item),
  });
  const code = useQuery({ queryKey: ['checkin-code', kind, item?._id], queryFn: () => api.checkInCode(item._id), enabled: open && tab === 'qr' });
  const regen = useMutation({ mutationFn: () => api.checkInCode(item._id, 'true'), onSuccess: (d) => qc.setQueryData(['checkin-code', kind, item._id], d) });
  const mark = useMutation({
    mutationFn: (userId) => api.markAttended(item._id, userId),
    onSuccess: () => {
      toast.success('Marked as attended');
      qc.invalidateQueries({ queryKey: ['participants', kind, item._id] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!item) return null;
  const url = code.data ? `${SITE_URL}/check-in?type=${kind}&id=${item._id}&slug=${item.slug}&code=${code.data.code}` : '';
  const b = list.data?.breakdown || {};

  const exportCsv = () => {
    const rows = [['Name', 'Username', 'City', 'Status', 'Registered']].concat(
      (list.data?.items || []).map((p) => [p.user?.fullName, p.user?.username, p.user?.city?.name || '', p.status, new Date(p.createdAt).toISOString()])
    );
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${item.slug}-participants.csv`;
    a.click();
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={kind === 'fdfs' ? `${item.movie} FDFS participants` : `${item.title} — attendees`}>
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ value: 'list', label: 'Participants' }, { value: 'qr', label: 'QR check-in' }]} />
      {tab === 'list' ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[['', 'All'], ['GOING', `Going ${b.GOING || 0}`], ['INTERESTED', `Interested ${b.INTERESTED || 0}`], ['ATTENDED', `Attended ${b.ATTENDED || 0}`]].map(([v, l]) => (
              <button key={v} onClick={() => setStatus(v)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${status === v ? 'border-gold-500 text-gold-300' : 'border-white/10 text-fog-400'}`}>
                {l}
              </button>
            ))}
            <Button size="sm" variant="ghost" icon={Download} className="ml-auto" onClick={exportCsv} disabled={!list.data?.items?.length}>
              CSV
            </Button>
          </div>
          {list.isLoading ? (
            <LoadingState />
          ) : !list.data?.items?.length ? (
            <EmptyState title="No participants yet" className="border-0 shadow-none" />
          ) : (
            <ul className="divide-y divide-white/5">
              {list.data.items.map((p) => (
                <li key={p._id} className="flex items-center gap-3 py-2.5">
                  <Avatar src={p.user?.profilePhoto?.url} name={p.user?.fullName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fog-100">{p.user?.fullName}</span>
                    <span className="block text-xs text-fog-500">@{p.user?.username} {p.user?.city?.name ? `· ${p.user.city.name}` : ''}</span>
                  </span>
                  <StatusBadge status={p.status} />
                  {p.status !== 'ATTENDED' && (
                    <Button size="sm" variant="ghost" icon={Check} onClick={() => mark.mutate(p.user._id)} aria-label={`Mark ${p.user?.fullName} attended`}>
                      <span className="hidden sm:inline">Attended</span>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : code.isLoading ? (
        <LoadingState />
      ) : (
        <div className="flex flex-col items-center text-center">
          <div className="rounded-2xl bg-white p-4">
            <QRCodeSVG value={url} size={220} level="M" />
          </div>
          <p className="mt-4 max-w-sm text-sm text-fog-300">Show this at the venue. SRKians scan it while signed in to confirm attendance (opens 24h before start). Each person can check in once.</p>
          <input readOnly value={url} onFocus={(e) => e.target.select()} className="field mt-4 text-xs" aria-label="Check-in link" />
          <Button variant="ghost" size="sm" icon={RefreshCw} className="mt-3" onClick={() => regen.mutate()} loading={regen.isPending}>
            Regenerate code (invalidates old QR)
          </Button>
        </div>
      )}
    </Modal>
  );
}
