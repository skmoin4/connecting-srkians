import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clapperboard, Plus, Send, Sparkles } from 'lucide-react';
import { adminApi, momentApi, movieApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select, Switch, Textarea } from '../../components/ui/Form.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { StatusBadge } from '../../components/ui/Display.jsx';
import { ImageUpload } from '../../components/common/ImageUpload.jsx';
import { BADGE_ICONS, BadgeIcon } from '../../components/common/BadgeIcon.jsx';
import { AdminTable } from '../../features/admin/AdminTable.jsx';
import { formatDate, toInputDate } from '../../utils/format.js';

const MOVIE_STATUS = ['ANNOUNCED', 'RELEASED', 'CANCELLED'];
const MOMENT_TYPES = ['BIRTHDAY', 'ANNIVERSARY', 'RELEASE', 'CUSTOM'];

// ------------------------------------------------------------------ Films
function MovieForm({ movie, onClose }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState({
    title: movie?.title || '',
    tagline: movie?.tagline || '',
    synopsis: movie?.synopsis || '',
    poster: movie?.poster || null,
    banner: movie?.banner || null,
    releaseDate: toInputDate(movie?.releaseDate) || '',
    trailerUrl: movie?.trailerUrl || '',
    status: movie?.status || 'ANNOUNCED',
    featured: movie?.featured ?? false,
  });
  const save = useMutation({
    mutationFn: () => (movie ? movieApi.update(movie._id, f) : movieApi.create(f)),
    onSuccess: () => {
      toast.success('Film saved');
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
      qc.invalidateQueries({ queryKey: ['movie-countdown'] });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <Modal
      open
      onClose={onClose}
      title={movie ? `Edit ${movie.title}` : 'New film'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Title" value={f.title} onChange={set('title')} />
        <Input label="Release date" type="date" value={f.releaseDate} onChange={set('releaseDate')} hint="Leave empty for “to be announced”" />
        <Input label="Tagline" className="sm:col-span-2" value={f.tagline} onChange={set('tagline')} />
        <Textarea label="Synopsis" rows={3} className="sm:col-span-2" value={f.synopsis} onChange={set('synopsis')} />
        <Input label="Trailer URL" className="sm:col-span-2" value={f.trailerUrl} onChange={set('trailerUrl')} placeholder="https://youtube.com/…" />
        <ImageUpload label="Poster" value={f.poster} onChange={(v) => setF((s) => ({ ...s, poster: v }))} folder="fdfs" aspect="aspect-2/3" />
        <ImageUpload label="Banner" value={f.banner} onChange={(v) => setF((s) => ({ ...s, banner: v }))} folder="fdfs" />
        <Select label="Status" value={f.status} onChange={set('status')} options={MOVIE_STATUS.map((v) => ({ value: v, label: v }))} />
        <div className="self-end">
          <Switch
            label="Feature on homepage countdown"
            checked={f.featured}
            onChange={(v) => setF((s) => ({ ...s, featured: v }))}
          />
        </div>
      </div>
    </Modal>
  );
}

export function AdminMovies() {
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(null);
  const query = useQuery({ queryKey: ['admin', 'movies'], queryFn: () => movieApi.list({ limit: 100 }) });

  const invite = useMutation({
    mutationFn: (id) => movieApi.inviteOrganisers(id),
    onSuccess: (data) => toast.success(data?.alreadySent ? 'Organisers were already invited for this film' : `Invited ${data.invited} fan club admins`),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id) => movieApi.remove(id),
    onSuccess: () => (toast.success('Film deleted'), qc.invalidateQueries({ queryKey: ['admin', 'movies'] })),
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-fog-400">
          The next dated film drives the homepage countdown. “Invite organisers” asks every verified club admin to open their city&apos;s FDFS — it sends once per film.
        </p>
        <Button icon={Plus} onClick={() => setForm({})}>
          New film
        </Button>
      </div>
      <AdminTable
        query={query}
        emptyIcon={Clapperboard}
        empty="No films yet"
        columns={[
          {
            key: 't',
            label: 'Film',
            render: (m) => (
              <span className="flex items-center gap-2 font-semibold text-fog-100">
                {m.featured && <span className="rounded bg-gold-500/15 px-1.5 py-0.5 text-[10px] text-gold-400">Featured</span>}
                {m.title}
              </span>
            ),
          },
          { key: 'd', label: 'Release', render: (m) => (m.releaseDate ? formatDate(m.releaseDate) : <span className="text-fog-500">To be announced</span>) },
          { key: 's', label: 'Status', render: (m) => <StatusBadge status={m.status} /> },
          {
            key: 'a',
            label: '',
            className: 'text-right',
            render: (m) => (
              <span className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" icon={Send} disabled={!m.releaseDate} loading={invite.isPending && invite.variables === m._id} onClick={() => invite.mutate(m._id)}>
                  Invite organisers
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setForm({ movie: m })}>
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => remove.mutate(m._id)}>
                  Delete
                </Button>
              </span>
            ),
          },
        ]}
      />
      {form && <MovieForm movie={form.movie} onClose={() => setForm(null)} />}
    </div>
  );
}

// ------------------------------------------------------------------ Moments
function MomentForm({ moment, onClose }) {
  const toast = useToast();
  const qc = useQueryClient();
  const badges = useQuery({ queryKey: ['admin', 'badges', 'for-moments'], queryFn: adminApi.badges });
  const [f, setF] = useState({
    code: moment?.code || '',
    title: moment?.title || '',
    subtitle: moment?.subtitle || '',
    description: moment?.description || '',
    type: moment?.type || 'CUSTOM',
    day: moment?.day || 1,
    month: moment?.month || 1,
    sinceYear: moment?.sinceYear || '',
    windowDays: moment?.windowDays ?? 0,
    icon: moment?.icon || 'sparkles',
    badge: moment?.badge?._id || '',
    active: moment?.active ?? true,
  });
  const save = useMutation({
    mutationFn: () => {
      const body = { ...f, sinceYear: f.sinceYear === '' ? undefined : Number(f.sinceYear), badge: f.badge || undefined };
      return moment ? momentApi.update(moment._id, body) : momentApi.create(body);
    },
    onSuccess: () => {
      toast.success('Moment saved');
      qc.invalidateQueries({ queryKey: ['admin', 'moments'] });
      qc.invalidateQueries({ queryKey: ['moments-live'] });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <Modal
      open
      onClose={onClose}
      title={moment ? `Edit ${moment.title}` : 'New moment'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Code" value={f.code} onChange={set('code')} disabled={Boolean(moment)} placeholder="SRK_BIRTHDAY" />
        <Input label="Title" value={f.title} onChange={set('title')} />
        <Input label="Subtitle" className="sm:col-span-2" value={f.subtitle} onChange={set('subtitle')} placeholder="2 November" />
        <Textarea label="Description" rows={2} className="sm:col-span-2" value={f.description} onChange={set('description')} />
        <Input label="Day" type="number" min="1" max="31" value={f.day} onChange={set('day')} />
        <Input label="Month" type="number" min="1" max="12" value={f.month} onChange={set('month')} />
        <Input label="First year" type="number" min="1900" max="2200" value={f.sinceYear} onChange={set('sinceYear')} hint="Lets the page say “30 years of …”" />
        <Input label="Window (days either side)" type="number" min="0" max="15" value={f.windowDays} onChange={set('windowDays')} />
        <Select label="Type" value={f.type} onChange={set('type')} options={MOMENT_TYPES.map((v) => ({ value: v, label: v }))} />
        <Select label="Icon" value={f.icon} onChange={set('icon')} options={Object.keys(BADGE_ICONS).map((i) => ({ value: i, label: i }))} />
        <Select
          label="Badge for attending"
          className="sm:col-span-2"
          value={f.badge}
          onChange={set('badge')}
          placeholder="No badge"
          options={(badges.data?.items || []).filter((b) => b.rule?.type === 'MANUAL').map((b) => ({ value: b._id, label: b.name }))}
          hint="Only manual badges are listed — rule-based ones are awarded by thresholds instead."
        />
        <div className="sm:col-span-2">
          <Switch label="Active" checked={f.active} onChange={(v) => setF((s) => ({ ...s, active: v }))} />
        </div>
      </div>
    </Modal>
  );
}

export function AdminMoments() {
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(null);
  const query = useQuery({ queryKey: ['admin', 'moments'], queryFn: momentApi.all });

  const remove = useMutation({
    mutationFn: (id) => momentApi.remove(id),
    onSuccess: () => (toast.success('Moment deleted'), qc.invalidateQueries({ queryKey: ['admin', 'moments'] })),
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-fog-400">
          Recurring dates the fandom celebrates. While one is live the homepage shows a banner, and checking in at any event or FDFS awards its badge.
        </p>
        <Button icon={Plus} onClick={() => setForm({})}>
          New moment
        </Button>
      </div>
      <AdminTable
        query={query}
        emptyIcon={Sparkles}
        empty="No moments yet"
        columns={[
          {
            key: 't',
            label: 'Moment',
            render: (m) => (
              <span className="flex items-center gap-2 font-semibold text-fog-100">
                <BadgeIcon name={m.icon} className="size-4 text-gold-400" />
                {m.title}
                {m.live && <span className="rounded bg-gold-500/15 px-1.5 py-0.5 text-[10px] text-gold-400">Live now</span>}
              </span>
            ),
          },
          { key: 'd', label: 'Date', render: (m) => `${String(m.day).padStart(2, '0')}/${String(m.month).padStart(2, '0')}${m.windowDays ? ` ±${m.windowDays}d` : ''}` },
          { key: 'n', label: 'Next', render: (m) => (m.daysAway === 0 ? 'Today' : m.daysAway > 0 ? `in ${m.daysAway} days` : `${-m.daysAway} days ago`) },
          { key: 'b', label: 'Badge', render: (m) => m.badge?.name || <span className="text-fog-500">—</span> },
          { key: 's', label: 'Status', render: (m) => <StatusBadge status={m.active ? 'ACTIVE' : 'DISABLED'} /> },
          {
            key: 'a',
            label: '',
            className: 'text-right',
            render: (m) => (
              <span className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setForm({ moment: m })}>
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => remove.mutate(m._id)}>
                  Delete
                </Button>
              </span>
            ),
          },
        ]}
      />
      {form && <MomentForm moment={form.moment} onClose={() => setForm(null)} />}
    </div>
  );
}
