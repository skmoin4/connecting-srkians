import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clapperboard, Clock, ExternalLink, Info, MapPin, Navigation, Settings2, Users } from 'lucide-react';
import { fdfsApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { AttendanceActions } from '../../components/common/AttendanceActions.jsx';
import { ContactAdminButton, ReportButton, ShareButton } from '../../components/common/Actions.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { WhatsAppIcon } from '../../components/ui/BrandIcons.jsx';
import { Badge, DemoBadge, ErrorState, LoadingState, StatusBadge, VerifiedBadge } from '../../components/ui/Display.jsx';
import { AnnouncementBanner } from '../../components/cards/Cards.jsx';
import { DetailRow } from './EventDetail.jsx';
import { formatDateLong, locationLine } from '../../utils/format.js';
import { TBA } from '../../constants/index.js';

const Tba = ({ value }) => (value ? value : <span className="text-fog-400 italic">{TBA}</span>);

export default function FdfsDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['fdfs-detail', slug, user?._id], queryFn: () => fdfsApi.get(slug) });

  if (isLoading) return <LoadingState className="min-h-[60vh]" />;
  if (isError) return <div className="container-page py-16"><ErrorState error={error} onRetry={refetch} /></div>;
  const f = data.fdfs;

  return (
    <>
      <Seo
        title={`${f.movie} FDFS in ${f.city?.name}`}
        description={`Join ${f.fanClub?.name} for the ${f.movie} First Day First Show in ${f.city?.name}. Theatre, show time and meeting point details.`}
        image={f.poster?.url}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: `${f.movie} FDFS — ${f.city?.name}`,
          startDate: f.releaseDate,
          location: { '@type': 'Place', name: f.theatre || TBA, address: locationLine(f.city, f.state, f.country) },
          organizer: { '@type': 'Organization', name: f.fanClub?.name },
        }}
      />
      <header className="grain relative isolate overflow-hidden border-b border-white/5">
        <div className="vignette absolute inset-0 -z-20" aria-hidden />
        {f.poster?.url && <img src={f.poster.url} alt="" className="absolute inset-0 -z-20 size-full scale-110 object-cover opacity-20 blur-2xl" aria-hidden />}
        <div className="container-page grid gap-8 pt-12 pb-10 sm:pt-16 md:grid-cols-[240px_1fr] md:items-end">
          <div className="mx-auto w-44 overflow-hidden rounded-2xl border border-white/10 shadow-2xl md:mx-0 md:w-full">
            {f.poster?.url ? (
              <img src={f.poster.url} alt={`${f.movie} poster`} className="aspect-[2/3] w-full object-cover" />
            ) : (
              <div className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-crimson-700/50 to-ink-950">
                <Clapperboard className="size-10 text-gold-400" aria-hidden />
                <span className="text-xs text-fog-400">Poster coming soon</span>
              </div>
            )}
          </div>
          <div className="min-w-0 text-center md:text-left">
            <div className="flex flex-wrap justify-center gap-2 md:justify-start">
              <Badge tone="red">FDFS</Badge>
              {f.status !== 'UPCOMING' && <StatusBadge status={f.status} />}
              {f.isDemo && <DemoBadge />}
            </div>
            <h1 className="display mt-3 text-7xl text-fog-100 sm:text-8xl lg:text-9xl">{f.movie}</h1>
            <p className="mt-1 text-lg text-fog-300">
              {f.city?.name} · Release {formatDateLong(f.releaseDate)}
            </p>
            <p className="mt-2 text-sm text-fog-400">
              <span className="font-semibold text-gold-300">{f.counts?.going || 0}</span> SRKians going · {f.counts?.interested || 0} interested
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5 md:justify-start">
              <AttendanceActions item={f} mutate={fdfsApi.join} queryKey={['fdfs-detail', slug]} goingLabel="I'm In" />
              {f.whatsappGroupLink && (
                <Button variant="secondary" href={f.whatsappGroupLink} icon={WhatsAppIcon}>
                  Join WhatsApp
                </Button>
              )}
              <ShareButton title={`${f.movie} FDFS — ${f.city?.name}`} text={`I'm going to the ${f.movie} FDFS in ${f.city?.name}!`} />
              {f.canManage && (
                <Button variant="outline" to={`/fan-club/fdfs?edit=${f._id}`} icon={Settings2}>
                  Manage
                </Button>
              )}
            </div>
            {f.hasWhatsappGroup && !f.whatsappGroupLink && <p className="mt-3 text-xs text-fog-500">Say “I'm In” to unlock the WhatsApp group link.</p>}
          </div>
        </div>
      </header>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          <section className="card p-5 sm:p-6">
            <h2 className="eyebrow mb-5">Show details</h2>
            <dl className="grid gap-5 sm:grid-cols-2">
              <DetailRow icon={MapPin} label="Theatre">
                <Tba value={f.theatre} />
                {f.theatreAddress && <span className="block text-sm text-fog-400">{f.theatreAddress}</span>}
                {f.mapLink && (
                  <a href={f.mapLink} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-sm text-gold-300 hover:underline">
                    Open map <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                )}
              </DetailRow>
              <DetailRow icon={Clock} label="Show time">
                <Tba value={f.showTime} />
              </DetailRow>
              <DetailRow icon={Navigation} label="Meeting point">
                <Tba value={f.meetingPoint} />
                {f.meetingTime && <span className="block text-sm text-fog-400">at {f.meetingTime}</span>}
              </DetailRow>
              <DetailRow icon={Users} label="Registration">
                <span className={f.registration?.open ? 'text-emerald-300' : 'text-crimson-400'}>{f.registration?.open ? 'Open' : f.registration?.reason}</span>
                {f.capacity ? <span className="block text-sm text-fog-400">Capacity {f.capacity}</span> : null}
              </DetailRow>
            </dl>
          </section>
          <section>
            <h2 className="eyebrow mb-3">Instructions</h2>
            {f.isDemo && (
              <p className="mb-3 flex gap-2 rounded-xl border border-sky-500/25 bg-sky-500/5 p-4 text-sm text-sky-200">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> Demo listing — details will be updated by the organiser.
              </p>
            )}
            <p className="leading-relaxed whitespace-pre-line text-fog-300">{f.instructions || 'The organiser will share instructions closer to the release.'}</p>
          </section>
          {f.announcements?.length > 0 && (
            <section className="space-y-3">
              <h2 className="eyebrow">Updates</h2>
              {f.announcements.map((a) => (
                <AnnouncementBanner key={a._id} announcement={a} />
              ))}
            </section>
          )}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card space-y-3 p-5">
            <h2 className="eyebrow">Organised by</h2>
            {f.fanClub && (
              <Link to={`/fan-clubs/${f.fanClub.slug}`} className="flex items-center gap-2 font-semibold text-fog-100 hover:text-gold-300">
                {f.fanClub.name} {f.fanClub.isVerified && <VerifiedBadge compact />}
              </Link>
            )}
            {f.organizer && <p className="text-sm text-fog-400">Organiser: {f.organizer.fullName}</p>}
            {f.fanClub && <ContactAdminButton fanClub={f.fanClub} className="w-full" />}
          </div>
          <div className="text-center">
            <ReportButton targetType="FDFS" targetId={f._id} label="Report FDFS listing" />
          </div>
        </aside>
      </div>
    </>
  );
}
