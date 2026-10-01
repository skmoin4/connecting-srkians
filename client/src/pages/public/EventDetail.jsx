import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, Clock, ExternalLink, Info, MapPin, Settings2, Users } from 'lucide-react';
import { eventApi } from '../../api/endpoints.js';
import { API_URL } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { AttendanceActions } from '../../components/common/AttendanceActions.jsx';
import { ContactAdminButton, ReportButton, ShareButton } from '../../components/common/Actions.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { WhatsAppIcon } from '../../components/ui/BrandIcons.jsx';
import { Badge, DemoBadge, ErrorState, LoadingState, StatusBadge, VerifiedBadge } from '../../components/ui/Display.jsx';
import { AnnouncementBanner } from '../../components/cards/Cards.jsx';
import { formatDateLong, formatTime, googleCalendarUrl, locationLine } from '../../utils/format.js';
import { EVENT_TYPES, TBA } from '../../constants/index.js';

export function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-gold-400" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs font-semibold tracking-wider text-fog-500 uppercase">{label}</dt>
        <dd className="mt-0.5 break-words text-fog-100">{children}</dd>
      </div>
    </div>
  );
}

export default function EventDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const key = ['event', slug, user?._id];
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: key, queryFn: () => eventApi.get(slug) });

  if (isLoading) return <LoadingState className="min-h-[60vh]" />;
  if (isError) return <div className="container-page py-16"><ErrorState error={error} onRetry={refetch} /></div>;
  const e = data.event;
  const where = [e.venue, e.address].filter(Boolean).join(', ');
  const timeText = e.startTime ? `${formatTime(e.startTime)}${e.endTime ? ` – ${formatTime(e.endTime)}` : ''}` : TBA;

  return (
    <>
      <Seo
        title={`${e.title} — ${e.city?.name}`}
        description={(e.description || `${EVENT_TYPES[e.eventType]} in ${e.city?.name}`).slice(0, 155)}
        image={e.coverImage?.url}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: e.title,
          startDate: e.date,
          eventStatus: e.status === 'CANCELLED' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
          eventAttendanceMode: e.eventType === 'ONLINE_EVENT' ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
          location: { '@type': 'Place', name: e.venue || TBA, address: locationLine(e.city, e.state, e.country) },
          organizer: { '@type': 'Organization', name: e.fanClub?.name || e.organizer?.fullName },
          image: e.coverImage?.url,
        }}
      />
      <header className="relative isolate overflow-hidden border-b border-white/5">
        {e.coverImage?.url ? (
          <img src={e.coverImage.url} alt="" className="absolute inset-0 -z-20 size-full object-cover opacity-40" />
        ) : (
          <div className="grain vignette absolute inset-0 -z-20" aria-hidden />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent" aria-hidden />
        <div className="container-page pt-16 pb-10 sm:pt-24">
          <div className="flex flex-wrap gap-2">
            <Badge tone="red">{EVENT_TYPES[e.eventType]}</Badge>
            {e.status !== 'UPCOMING' && <StatusBadge status={e.status} />}
            {e.isDemo && <DemoBadge />}
          </div>
          <h1 className="display mt-3 max-w-4xl text-5xl text-fog-100 sm:text-7xl">{e.title}</h1>
          <p className="mt-3 text-fog-300">
            {formatDateLong(e.date)} · {e.city?.name}
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <AttendanceActions item={e} mutate={eventApi.attendance} queryKey={['event', slug]} />
            {e.whatsappGroupLink && (
              <Button variant="secondary" href={e.whatsappGroupLink} icon={WhatsAppIcon}>
                Join WhatsApp
              </Button>
            )}
            <ShareButton title={e.title} text={`${e.title} — ${e.city?.name}`} />
            {e.canManage && (
              <Button variant="outline" to={`/fan-club/events?edit=${e._id}`} icon={Settings2}>
                Manage
              </Button>
            )}
          </div>
          {e.hasWhatsappGroup && !e.whatsappGroupLink && <p className="mt-3 text-xs text-fog-500">Register to unlock the WhatsApp group link.</p>}
        </div>
      </header>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          {e.isDemo && (
            <p className="flex gap-2 rounded-xl border border-sky-500/25 bg-sky-500/5 p-4 text-sm text-sky-200">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> This is demo data created for testing the platform.
            </p>
          )}
          <section>
            <h2 className="eyebrow mb-3">About this event</h2>
            <p className="leading-relaxed whitespace-pre-line text-fog-300">{e.description || 'The organiser has not added a description yet.'}</p>
          </section>
          {e.announcements?.length > 0 && (
            <section className="space-y-3">
              <h2 className="eyebrow">Updates</h2>
              {e.announcements.map((a) => (
                <AnnouncementBanner key={a._id} announcement={a} />
              ))}
            </section>
          )}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <dl className="space-y-4">
              <DetailRow icon={Clock} label="Date & time">
                {formatDateLong(e.date)}
                <br />
                <span className="text-fog-300">{timeText}</span>
              </DetailRow>
              <DetailRow icon={MapPin} label="Venue">
                {where || TBA}
                <br />
                <span className="text-fog-400">{locationLine(e.city, e.state)}</span>
                {e.mapLink && (
                  <a href={e.mapLink} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-sm text-gold-300 hover:underline">
                    Open map <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                )}
              </DetailRow>
              <DetailRow icon={Users} label="Registrations">
                {e.counts?.going || 0} going · {e.counts?.interested || 0} interested
                {e.capacity ? <span className="block text-sm text-fog-400">Capacity {e.capacity}</span> : null}
                <span className={`block text-sm ${e.registration?.open ? 'text-emerald-300' : 'text-crimson-400'}`}>{e.registration?.open ? 'Registration open' : e.registration?.reason}</span>
              </DetailRow>
            </dl>
          </div>
          <div className="card space-y-3 p-5">
            <h2 className="eyebrow">Organised by</h2>
            {e.fanClub ? (
              <Link to={`/fan-clubs/${e.fanClub.slug}`} className="flex items-center gap-2 font-semibold text-fog-100 hover:text-gold-300">
                {e.fanClub.name} {e.fanClub.isVerified && <VerifiedBadge compact />}
              </Link>
            ) : (
              <p className="font-semibold text-fog-100">{e.organizer?.fullName}</p>
            )}
            {e.contactInfo && <p className="text-sm text-fog-300">{e.contactInfo}</p>}
            {e.fanClub && <ContactAdminButton fanClub={e.fanClub} label="Contact organizer" className="w-full" />}
          </div>
          <div className="card flex flex-col gap-2 p-5">
            <h2 className="eyebrow mb-1">Add to calendar</h2>
            <Button variant="secondary" size="sm" icon={CalendarPlus} href={googleCalendarUrl({ title: e.title, date: e.date, startTime: e.startTime, endTime: e.endTime, details: e.description, location: where })}>
              Google Calendar
            </Button>
            <Button variant="secondary" size="sm" icon={CalendarPlus} href={`${API_URL}/events/${e.slug}/calendar.ics`}>
              Apple / Outlook (.ics)
            </Button>
          </div>
          <div className="text-center">
            <ReportButton targetType="EVENT" targetId={e._id} label="Report event" />
          </div>
        </aside>
      </div>
    </>
  );
}
