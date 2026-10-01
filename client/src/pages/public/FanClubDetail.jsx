import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clapperboard, Globe, Info, MapPin, Phone, Users } from 'lucide-react';
import { fanClubApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { ContactAdminButton, ReportButton, ShareButton } from '../../components/common/Actions.jsx';
import { JoinClubButton } from '../../components/common/JoinClubButton.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from '../../components/ui/BrandIcons.jsx';
import { Avatar, EmptyState, ErrorState, LoadingState, SectionHeading, StatusBadge, VerifiedBadge } from '../../components/ui/Display.jsx';
import { AnnouncementBanner, EventCard, FDFSCard, UserCard } from '../../components/cards/Cards.jsx';
import { compact, formatDate, instagramUrl, locationLine, whatsappUrl } from '../../utils/format.js';

export default function FanClubDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['fan-club', slug, user?._id], queryFn: () => fanClubApi.get(slug) });

  if (isLoading) return <LoadingState className="min-h-[60vh]" />;
  if (isError) return <div className="container-page py-16"><ErrorState error={error} onRetry={refetch} /></div>;
  const club = data.fanClub;
  const verified = club.isVerified;

  return (
    <>
      <Seo
        title={`${club.name} — SRK Fan Club in ${club.city?.name}`}
        description={(club.description || '').slice(0, 155)}
        image={club.coverImage?.url || club.logo?.url}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: club.name,
          description: club.description,
          logo: club.logo?.url,
          address: { '@type': 'PostalAddress', addressLocality: club.city?.name, addressRegion: club.state?.name, addressCountry: club.country?.code },
          sameAs: club.instagram ? [instagramUrl(club.instagram)] : undefined,
        }}
      />
      <header className="relative isolate border-b border-white/5">
        <div className="relative h-48 overflow-hidden sm:h-72">
          {club.coverImage?.url ? (
            <img src={club.coverImage.url} alt="" className="size-full object-cover" />
          ) : (
            <div className="grain vignette size-full bg-ink-900" aria-hidden />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" aria-hidden />
        </div>
        <div className="container-page relative -mt-16 pb-8 sm:-mt-20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <Avatar src={club.logo?.url} name={club.name} size="xl" className="border-4 border-ink-950" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {verified ? <VerifiedBadge /> : <StatusBadge status={club.status} />}
                {club.featured && <span className="text-xs font-semibold text-gold-400">★ Featured</span>}
              </div>
              <h1 className="display mt-2 text-5xl text-fog-100 sm:text-6xl">{club.name}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-fog-300">
                <MapPin className="size-4" aria-hidden /> {locationLine(club.city, club.state, club.country)}
              </p>
            </div>
          </div>

          {!verified && club.canManage && (
            <div className="mt-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                This club is <strong>{club.status.replace('_', ' ').toLowerCase()}</strong> and is only visible to you and moderators.
                {club.reviewNote && <> Reviewer note: “{club.reviewNote}”</>}
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2.5">
            {verified && <JoinClubButton club={club} />}
            {verified && <ContactAdminButton fanClub={club} />}
            {club.instagram && (
              <Button variant="secondary" href={instagramUrl(club.instagram)} icon={InstagramIcon}>
                Instagram
              </Button>
            )}
            {club.whatsappNumber && (
              <Button variant="secondary" href={whatsappUrl(club.whatsappNumber, `Hi! I found ${club.name} on SRKians.`)} icon={WhatsAppIcon}>
                WhatsApp
              </Button>
            )}
            <ShareButton title={club.name} text={`${club.name} — SRK fan club in ${club.city?.name}`} />
          </div>
        </div>
      </header>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-12">
          <section>
            <SectionHeading eyebrow="About the club" title="Our story" className="mb-4" />
            <p className="leading-relaxed whitespace-pre-line text-fog-300">{club.description || 'No description yet.'}</p>
          </section>

          {club.announcements?.length > 0 && (
            <section>
              <SectionHeading eyebrow="From the admin" title="Announcements" className="mb-4" />
              <div className="space-y-3">
                {club.announcements.map((a) => (
                  <AnnouncementBanner key={a._id} announcement={a} />
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionHeading eyebrow="First day first show" title="Upcoming FDFS" className="mb-4" />
            {club.fdfs?.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {club.fdfs.map((f) => (
                  <FDFSCard key={f._id} fdfs={{ ...f, fanClub: club }} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Clapperboard} title="No FDFS announced yet." />
            )}
          </section>

          <section>
            <SectionHeading eyebrow="Meetups" title="Upcoming events" className="mb-4" />
            {club.events?.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {club.events.map((e) => (
                  <EventCard key={e._id} event={{ ...e, fanClub: club }} />
                ))}
              </div>
            ) : (
              <EmptyState icon={CalendarDays} title="No upcoming events." />
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <h2 className="eyebrow mb-4">Club details</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-fog-400">Members</dt>
                <dd className="flex items-center gap-1.5 font-semibold text-fog-100">
                  <Users className="size-4 text-gold-400" aria-hidden /> {compact(club.memberCount || 0)}
                </dd>
              </div>
              {club.foundedDate && (
                <div className="flex justify-between gap-3">
                  <dt className="text-fog-400">Founded</dt>
                  <dd className="text-fog-100">{formatDate(club.foundedDate)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-fog-400">Membership</dt>
                <dd className="text-fog-100">{{ OPEN: 'Open', APPROVAL_REQUIRED: 'Approval required', CLOSED: 'Closed' }[club.membershipType]}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="eyebrow mb-4">Admin</h2>
            {club.admin && <UserCard user={club.admin} meta={club.adminName ? `${club.adminName} · Club admin` : 'Club admin'} />}
            <ul className="mt-4 space-y-2 text-sm">
              {club.instagram && (
                <li>
                  <a href={instagramUrl(club.instagram)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-fog-200 hover:text-gold-300">
                    <InstagramIcon className="size-4" /> @{club.instagram}
                  </a>
                </li>
              )}
              {club.whatsappNumber && (
                <li>
                  <a href={whatsappUrl(club.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-fog-200 hover:text-gold-300">
                    <WhatsAppIcon className="size-4" /> {club.whatsappNumber}
                  </a>
                </li>
              )}
              {club.phone && (
                <li>
                  <a href={`tel:${club.phone}`} className="flex items-center gap-2 text-fog-200 hover:text-gold-300">
                    <Phone className="size-4" aria-hidden /> {club.phone}
                  </a>
                </li>
              )}
              {club.whatsappGroupLink && (
                <li>
                  <a href={club.whatsappGroupLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-fog-200 hover:text-gold-300">
                    <WhatsAppIcon className="size-4" /> Join WhatsApp group
                  </a>
                </li>
              )}
              {club.telegramLink && (
                <li>
                  <a href={club.telegramLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-fog-200 hover:text-gold-300">
                    <TelegramIcon className="size-4" /> Telegram
                  </a>
                </li>
              )}
              {club.website && (
                <li>
                  <a href={club.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-fog-200 hover:text-gold-300">
                    <Globe className="size-4" aria-hidden /> Website
                  </a>
                </li>
              )}
            </ul>
            {!club.whatsappNumber && !club.phone && verified && (
              <p className="mt-4 text-xs text-fog-500">The admin keeps their phone number private. Use “Contact Admin” to reach them through the platform.</p>
            )}
            {verified && <ContactAdminButton fanClub={club} className="mt-4 w-full" />}
          </div>
          <div className="flex justify-center gap-4">
            <ReportButton targetType="FAN_CLUB" targetId={club._id} label="Report club" />
            <ReportButton targetType="ADMIN_CONTACT" targetId={club._id} label="Report admin contact" />
          </div>
        </aside>
      </div>
    </>
  );
}
