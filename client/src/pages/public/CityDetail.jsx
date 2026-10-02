import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, Clapperboard, Megaphone, MessageCircle, ShieldCheck, UserPlus, Users, UsersRound } from 'lucide-react';
import { locationApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { Reveal } from '../../components/common/Reveal.jsx';
import { useRequireAuth, ShareButton } from '../../components/common/Actions.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState, ErrorState, LoadingState, SectionHeading, StatCard } from '../../components/ui/Display.jsx';
import { AnnouncementBanner, EventCard, FanClubCard, FDFSCard, UserCard } from '../../components/cards/Cards.jsx';
import { locationLine } from '../../utils/format.js';

export default function CityDetail() {
  const { slug } = useParams();
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const requireAuth = useRequireAuth();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['city', slug, user?._id], queryFn: () => locationApi.city(slug) });

  const join = useMutation({
    mutationFn: () => locationApi.join(data.city._id),
    onSuccess: async (_d) => {
      toast.success(`Welcome to ${data.city.name} SRKians!`);
      if (_d?.whatsappGroupLink) toast.info('The city WhatsApp group link is now on this page.');
      await refreshUser();
      qc.invalidateQueries({ queryKey: ['city'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading) return <LoadingState className="min-h-[60vh]" />;
  if (isError) return <div className="container-page py-16"><ErrorState error={error} onRetry={refetch} /></div>;

  const { city, stats, fanClubs, events, fdfs, moderators, announcements, isMember } = data;
  const title = `${city.name} SRKians`;

  return (
    <>
      <Seo
        title={`${city.name} SRKians | Find SRK Fan Clubs in ${city.name}`}
        description={`Find verified SRK fan clubs, admins, fan events and FDFS in ${city.name}, ${city.state?.name}. Join ${stats.members} SRKians in ${city.name}.`}
        image={city.coverImage?.url}
        jsonLd={{ '@context': 'https://schema.org', '@type': 'Place', name: city.name, address: { '@type': 'PostalAddress', addressLocality: city.name, addressRegion: city.state?.name, addressCountry: city.country?.code } }}
      />
      <header className="grain relative isolate overflow-hidden border-b border-white/5">
        {city.coverImage?.url ? (
          <img src={city.coverImage.url} alt="" className="absolute inset-0 -z-20 size-full object-cover opacity-45" />
        ) : (
          <div className="vignette absolute inset-0 -z-20" aria-hidden />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" aria-hidden />
        <div className="container-page pt-16 pb-10 sm:pt-28 sm:pb-14">
          <Reveal>
            <p className="eyebrow mb-3">{locationLine(city.state, city.country)}</p>
            <h1 className="display text-6xl text-fog-100 sm:text-8xl lg:text-9xl">
              {city.name} <span className="text-gold-gradient">SRKians</span>
            </h1>
            {city.description && <p className="mt-4 max-w-2xl text-base text-fog-300 sm:text-lg">{city.description}</p>}
          </Reveal>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {isMember ? (
              <>
                <Button size="lg" variant="outline" icon={Check} disabled>
                  You're a {city.name} SRKian
                </Button>
                {/* Members only — the link never reaches the public page. */}
                {city.whatsappGroupLink && (
                  <Button size="lg" variant="gold" href={city.whatsappGroupLink} icon={MessageCircle}>
                    Join the {city.name} WhatsApp group
                  </Button>
                )}
              </>
            ) : (
              <Button size="lg" icon={UserPlus} loading={join.isPending} onClick={() => requireAuth() && join.mutate()}>
                Join {city.name} community
              </Button>
            )}
            <Button size="lg" variant="secondary" onClick={() => document.getElementById('clubs')?.scrollIntoView({ behavior: 'smooth' })}>
              View fan clubs
            </Button>
            <Button size="lg" variant="secondary" to={`/events?citySlug=${city.slug}`}>
              View events
            </Button>
            <ShareButton size="lg" variant="ghost" title={title} text={`Find SRK fan clubs in ${city.name}`} />
          </div>
          {user && !isMember && user.city && <p className="mt-3 text-xs text-fog-500">Joining will change your primary city from {user.city.name}.</p>}
          {!isMember && city.hasWhatsappGroup && (
            <p className="mt-3 text-xs text-gold-400">{city.name} has a WhatsApp group — join the community to get the invite link.</p>
          )}
        </div>
      </header>

      <div className="container-page space-y-14 py-10">
        <section aria-label={`${city.name} statistics`} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Registered SRKians" value={stats.members} icon={Users} animated />
          <StatCard label="Verified fan clubs" value={stats.fanClubs} icon={ShieldCheck} animated />
          <StatCard label="Upcoming events" value={stats.upcomingEvents} icon={CalendarDays} tone="red" animated />
          <StatCard label="Upcoming FDFS" value={stats.upcomingFdfs} icon={Clapperboard} tone="red" animated />
        </section>

        {(city.announcement || announcements.length > 0) && (
          <section>
            <SectionHeading eyebrow="City board" title="Announcements" />
            <div className="space-y-3">
              {city.announcement && <AnnouncementBanner announcement={{ title: `${city.name} announcement`, body: city.announcement, pinned: true }} />}
              {announcements.map((a) => (
                <AnnouncementBanner key={a._id} announcement={a} />
              ))}
            </div>
          </section>
        )}

        <section id="clubs" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Verified by the platform"
            title={`Fan clubs in ${city.name}`}
            action={<Button to={`/fan-clubs?citySlug=${city.slug}`} variant="ghost">See all</Button>}
          />
          {fanClubs.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fanClubs.map((c) => (
                <FanClubCard key={c._id} club={{ ...c, city }} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={UsersRound}
              title={`No fan clubs found in ${city.name}.`}
              message="Be the first to bring your city's SRKians together."
              action={<Button to="/fan-clubs/register">Register a fan club</Button>}
            />
          )}
        </section>

        <section>
          <SectionHeading eyebrow="First day first show" title={`FDFS in ${city.name}`} action={<Button to={`/fdfs?citySlug=${city.slug}`} variant="ghost">See all</Button>} />
          {fdfs.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {fdfs.map((f) => (
                <FDFSCard key={f._id} fdfs={{ ...f, city }} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Clapperboard} title="No FDFS announced yet." message={`${city.name} fan clubs will post FDFS plans here.`} />
          )}
        </section>

        <section>
          <SectionHeading eyebrow="Meetups & celebrations" title="Upcoming events" action={<Button to={`/events?citySlug=${city.slug}`} variant="ghost">See all</Button>} />
          {events.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <EventCard key={e._id} event={{ ...e, city }} />
              ))}
            </div>
          ) : (
            <EmptyState icon={CalendarDays} title="No upcoming events." message="Stay tuned — or ask your fan club to host one." />
          )}
        </section>

        <section>
          <SectionHeading eyebrow="Your local leaders" title="City admins & moderators" />
          {fanClubs.some((c) => c.admin) || moderators.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fanClubs
                .filter((c) => c.admin)
                .map((c) => (
                  <UserCard key={c._id} user={c.admin} meta={`Admin · ${c.name}`} />
                ))}
              {moderators.map((m) => (
                <UserCard key={m._id} user={m} meta="City Moderator" />
              ))}
            </div>
          ) : (
            <EmptyState icon={Megaphone} title="No admins listed yet" message="Admins appear here once a fan club is verified." />
          )}
        </section>
      </div>
    </>
  );
}
