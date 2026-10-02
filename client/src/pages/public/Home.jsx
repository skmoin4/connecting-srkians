import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CalendarDays, Clapperboard, Globe, Landmark, Map, MapPin, ShieldCheck, Ticket, Users, UsersRound } from 'lucide-react';
import { communityApi } from '../../api/endpoints.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { Reveal } from '../../components/common/Reveal.jsx';
import { CitySearch } from '../../components/common/CitySearch.jsx';
import { LocationSelector } from '../../components/common/LocationSelector.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CardSkeletonGrid, Counter, EmptyState, SectionHeading, Skeleton } from '../../components/ui/Display.jsx';
import { CityCard, EventCard, FanClubCard, FDFSCard } from '../../components/cards/Cards.jsx';
import { CityRace, MomentBanner, MovieCountdown } from '../../features/fandom/Fandom.jsx';

function Hero() {
  const s = useSettings();
  const { isAuthenticated } = useAuth();
  const reduce = useReducedMotion();
  const lines = (s.hero.headline || '').split('\n').filter(Boolean);
  const bg = s.hero.backgroundImage?.url;
  const video = s.hero.backgroundVideoUrl;

  const fade = (i) => (reduce ? {} : { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] } });

  return (
    <section className="grain relative isolate flex min-h-[min(88svh,60rem)] items-end overflow-hidden border-b border-white/5 sm:items-center">
      {/* Background: admin-uploaded image/video only — no automatic celebrity imagery. */}
      {video ? (
        <video className="absolute inset-0 -z-20 size-full object-cover opacity-50" src={video} autoPlay muted loop playsInline aria-hidden />
      ) : bg ? (
        <img src={bg} alt="" className="absolute inset-0 -z-20 size-full object-cover opacity-55" fetchPriority="high" />
      ) : (
        <div className="absolute inset-0 -z-20" aria-hidden>
          <div className="absolute top-[-20%] left-1/2 h-[80vh] w-[60vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(225_29_46/0.35),transparent)] blur-2xl" />
          <div className="absolute top-[10%] right-[-10%] h-[50vh] w-[40vw] rounded-full bg-[radial-gradient(closest-side,rgb(212_162_76/0.18),transparent)] blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
          {/* light beams */}
          <div className="absolute top-0 left-[18%] h-full w-px rotate-[18deg] bg-gradient-to-b from-gold-400/25 via-transparent to-transparent" />
          <div className="absolute top-0 left-[72%] h-full w-px -rotate-[14deg] bg-gradient-to-b from-crimson-400/25 via-transparent to-transparent" />
        </div>
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/55 to-ink-950/30" aria-hidden />

      <div className="container-page pt-24 pb-14 sm:py-24">
        <motion.p {...fade(0)} className="eyebrow mb-5 flex items-center gap-2">
          <span className="inline-block h-px w-8 bg-gold-500" aria-hidden /> {s.tagline}
        </motion.p>
        <h1 className="display text-[3.4rem] text-fog-100 sm:text-7xl md:text-8xl lg:text-[8.5rem]">
          {lines.map((line, i) => (
            <motion.span key={line} {...fade(i + 1)} className={i === lines.length - 1 ? 'text-gold-gradient block' : 'block'}>
              {line}
            </motion.span>
          ))}
        </h1>
        <motion.p {...fade(lines.length + 1)} className="mt-6 max-w-xl text-base text-fog-300 sm:text-lg">
          {s.hero.subheading}
        </motion.p>
        <motion.div {...fade(lines.length + 2)} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" iconRight={ArrowRight} onClick={() => document.getElementById('find-city')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })}>
            {s.hero.primaryCta}
          </Button>
          <Button size="lg" variant="outline" to={isAuthenticated ? '/dashboard' : '/register'}>
            {s.hero.secondaryCta}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

const STAT_ITEMS = [
  ['srkians', 'SRKians', Users],
  ['cities', 'Cities', MapPin],
  ['states', 'States', Map],
  ['countries', 'Countries', Globe],
  ['fanClubs', 'Fan Clubs', UsersRound],
  ['upcomingEvents', 'Upcoming Events', CalendarDays],
  ['upcomingFdfs', 'Upcoming FDFS', Clapperboard],
];

function Stats() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['stats'], queryFn: communityApi.stats, staleTime: 60 * 1000 });
  if (isError) return null;
  return (
    <section aria-label="Platform statistics" className="border-b border-white/5 bg-ink-900/40">
      {/* Phones get a compact icon-beside-number row so seven stats don't stack into a wall of
          huge numerals; from sm up it returns to the centred column layout. */}
      <div className="container-page grid grid-cols-2 gap-x-4 gap-y-0.5 py-3 sm:grid-cols-4 sm:gap-px sm:py-2 lg:grid-cols-7">
        {STAT_ITEMS.map(([key, label, Icon]) => (
          <div key={key} className="flex items-center gap-2.5 py-2 sm:flex-col sm:gap-0 sm:px-2 sm:py-5 sm:text-center">
            <Icon className="size-4 shrink-0 text-gold-500 sm:mb-2" aria-hidden />
            <div className="flex min-w-0 flex-col sm:items-center">
              {isLoading ? (
                <Skeleton className="h-7 w-12 sm:h-10 sm:w-16" />
              ) : (
                <Counter value={data?.[key] || 0} className="display text-2xl leading-none text-fog-100 sm:text-5xl" />
              )}
              <span className="mt-0.5 truncate text-[10px] font-semibold tracking-[0.12em] text-fog-400 uppercase sm:mt-1 sm:text-[11px] sm:tracking-[0.16em]">
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FindCity() {
  const [loc, setLoc] = useState({});
  const navigate = useNavigate();
  return (
    <section id="find-city" className="relative scroll-mt-20 py-16 sm:py-24">
      <div className="vignette absolute inset-0 -z-10 opacity-60" aria-hidden />
      <div className="container-page">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="eyebrow mb-3">Step one</p>
          <h2 className="display text-5xl text-fog-100 sm:text-7xl">Find your SRKian family</h2>
          <p className="mx-auto mt-3 max-w-xl text-fog-400">Choose your city to discover verified fan clubs, admins, events and FDFS near you.</p>
        </Reveal>
        <Reveal delay={0.1} className="card mx-auto mt-10 max-w-3xl p-5 sm:p-8">
          <CitySearch />
          <div className="my-6 flex items-center gap-3 text-xs tracking-[0.2em] text-fog-500 uppercase">
            <span className="h-px flex-1 bg-white/10" /> or browse <span className="h-px flex-1 bg-white/10" />
          </div>
          <LocationSelector value={loc} onChange={setLoc} />
          <Button size="lg" className="mt-6 w-full" iconRight={ArrowRight} disabled={!loc.citySlug} onClick={() => navigate(`/cities/${loc.citySlug}`)}>
            Take me to my city
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

const STEPS = [
  [MapPin, 'Select your city', 'Country → State → City. Your local SRKian network starts here.'],
  [ShieldCheck, 'Find verified clubs', 'Every listed fan club is reviewed and verified by the platform.'],
  [Users, 'Connect with admins', 'Reach admins through the platform — personal numbers stay private.'],
  [Ticket, 'Join events & FDFS', 'Fan meets, birthday celebrations and the loudest first-day shows.'],
];

function HowItWorks() {
  return (
    <section className="border-y border-white/5 bg-ink-900/40 py-16 sm:py-20">
      <div className="container-page">
        <SectionHeading eyebrow="How it works" title="City first. Always." />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([Icon, title, text], i) => (
            <Reveal as="li" key={title} delay={i * 0.06} className="card relative overflow-hidden p-6">
              <span className="display absolute -top-3 right-3 text-8xl text-white/[0.04]" aria-hidden>
                0{i + 1}
              </span>
              <Icon className="size-6 text-gold-400" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold text-fog-100">{title}</h3>
              <p className="mt-1.5 text-sm text-fog-400">{text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default function Home() {
  const s = useSettings();
  const { data, isLoading } = useQuery({ queryKey: ['discover'], queryFn: communityApi.discover });

  return (
    <>
      <Seo
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: s.platformName,
          description: s.description,
          url: typeof window !== 'undefined' ? window.location.origin : undefined,
          potentialAction: { '@type': 'SearchAction', target: `${typeof window !== 'undefined' ? window.location.origin : ''}/search?q={query}`, 'query-input': 'required name=query' },
        }}
      />
      <Hero />
      <Stats />
      {/* Both render nothing unless there is something live, so the page never shows an empty slot. */}
      <MomentBanner />
      <MovieCountdown />
      <FindCity />
      <HowItWorks />

      <section className="container-page py-16 sm:py-20">
        <SectionHeading eyebrow="First day. First show." title="Upcoming FDFS" action={<Button to="/fdfs" variant="ghost" iconRight={ArrowRight}>All FDFS</Button>} />
        {isLoading ? (
          <CardSkeletonGrid count={3} />
        ) : data?.fdfs?.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.fdfs.map((f) => (
              <Reveal key={f._id}>
                <FDFSCard fdfs={f} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState icon={Clapperboard} title="No FDFS announced yet" message="Fan clubs announce FDFS here as soon as release plans are confirmed." />
        )}
      </section>

      <section className="container-page pb-16 sm:pb-20">
        <SectionHeading eyebrow="Meet the family" title="Upcoming events" action={<Button to="/events" variant="ghost" iconRight={ArrowRight}>All events</Button>} />
        {isLoading ? (
          <CardSkeletonGrid count={3} />
        ) : data?.events?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.events.map((e) => (
              <Reveal key={e._id}>
                <EventCard event={e} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState icon={CalendarDays} title="No upcoming events" message="Check back soon, or ask your city's fan club to host one." />
        )}
      </section>

      <section className="container-page pb-16 sm:pb-20">
        <SectionHeading eyebrow="Verified by the platform" title="Featured fan clubs" action={<Button to="/fan-clubs" variant="ghost" iconRight={ArrowRight}>All fan clubs</Button>} />
        {isLoading ? (
          <CardSkeletonGrid count={3} />
        ) : data?.featuredClubs?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.featuredClubs.slice(0, 6).map((c) => (
              <Reveal key={c._id}>
                <FanClubCard club={c} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState icon={UsersRound} title="No verified fan clubs yet" message="Run a fan club? Register it and get verified." action={<Button to="/fan-clubs/register">Register your fan club</Button>} />
        )}
      </section>

      <CityRace />

      <section className="container-page pb-16 sm:pb-20">
        <SectionHeading eyebrow="Where SRKians live" title="Popular cities" action={<Button to="/cities" variant="ghost" iconRight={ArrowRight}>All cities</Button>} />
        {isLoading ? (
          <CardSkeletonGrid count={4} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(data?.popularCities || []).slice(0, 8).map((c) => (
              <Reveal key={c._id}>
                <CityCard city={c} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section className="container-page">
        <Reveal className="grain relative overflow-hidden rounded-3xl border border-gold-500/20 bg-gradient-to-br from-crimson-700/30 via-ink-900 to-ink-900 p-8 sm:p-12">
          <Landmark className="absolute -right-6 -bottom-6 size-48 text-white/[0.03]" aria-hidden />
          <p className="eyebrow mb-3">For fan club admins</p>
          <h2 className="display max-w-2xl text-5xl text-fog-100 sm:text-6xl">Run a fan club? Put your city on the map.</h2>
          <p className="mt-3 max-w-xl text-fog-300">Get verified, manage members, announce FDFS and connect with admins in other cities — all in one place.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" variant="gold" to="/fan-clubs/register" iconRight={ArrowRight}>
              Register your fan club
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
