import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clapperboard, MapPin, UsersRound } from 'lucide-react';
import { communityApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { PageHeader, Reveal } from '../../components/common/Reveal.jsx';
import { CitySearch } from '../../components/common/CitySearch.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CardSkeletonGrid, EmptyState, ErrorState, SectionHeading } from '../../components/ui/Display.jsx';
import { CityCard, EventCard, FanClubCard, FDFSCard } from '../../components/cards/Cards.jsx';

function Section({ eyebrow, title, to, children }) {
  return (
    <section className="py-8">
      <SectionHeading eyebrow={eyebrow} title={title} action={to && <Button to={to} variant="ghost">See all</Button>} />
      {children}
    </section>
  );
}

export default function Discover() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['discover', user?._id], queryFn: communityApi.discover });

  return (
    <>
      <Seo title="Discover SRKian Communities" description="Popular cities, featured fan clubs, upcoming events and FDFS across the SRKian network." />
      <PageHeader eyebrow="Discover" title="The SRKian network" subtitle="Cities, clubs, events and first-day shows — all in one place.">
        <CitySearch className="max-w-2xl" />
      </PageHeader>
      <div className="container-page py-4">
        {isLoading ? (
          <div className="py-10">
            <CardSkeletonGrid />
          </div>
        ) : isError ? (
          <div className="py-10">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : (
          <>
            {user && (
              <Section eyebrow={user.city ? `Around ${user.city.name}` : 'Near you'} title="Fan clubs near your city" to={user.city ? `/fan-clubs?citySlug=${user.city.slug}` : '/fan-clubs'}>
                {data.nearYou.length ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {data.nearYou.slice(0, 6).map((c) => (
                      <FanClubCard key={c._id} club={c} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={UsersRound} title="No fan clubs near you yet." message="Start one for your city!" action={<Button to="/fan-clubs/register">Register a fan club</Button>} />
                )}
              </Section>
            )}
            <Section eyebrow="Most SRKians" title="Popular cities" to="/cities">
              {data.popularCities.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {data.popularCities.map((c) => (
                    <Reveal key={c._id}>
                      <CityCard city={c} />
                    </Reveal>
                  ))}
                </div>
              ) : (
                <EmptyState icon={MapPin} title="No cities yet" />
              )}
            </Section>
            <Section eyebrow="Verified" title="Featured fan clubs" to="/fan-clubs">
              {data.featuredClubs.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.featuredClubs.slice(0, 6).map((c) => (
                    <FanClubCard key={c._id} club={c} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={UsersRound} title="No verified fan clubs yet" />
              )}
            </Section>
            <Section eyebrow="First day first show" title="Upcoming FDFS" to="/fdfs">
              {data.fdfs.length ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {data.fdfs.map((f) => (
                    <FDFSCard key={f._id} fdfs={f} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Clapperboard} title="No FDFS announced yet." />
              )}
            </Section>
            <Section eyebrow="Meetups" title="Upcoming events" to="/events">
              {data.events.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.events.map((e) => (
                    <EventCard key={e._id} event={e} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={CalendarDays} title="No upcoming events." />
              )}
            </Section>
            <Section eyebrow="Just added" title="New cities">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.newCities.map((c) => (
                  <CityCard key={c._id} city={c} />
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </>
  );
}
