import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clapperboard, PlayCircle, Plus } from 'lucide-react';
import { movieApi, userApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { Reveal } from '../../components/common/Reveal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge, CardSkeletonGrid, EmptyState, ErrorState, LoadingState, SectionHeading } from '../../components/ui/Display.jsx';
import { FDFSCard } from '../../components/cards/Cards.jsx';
import { MomentStrip } from '../../features/fandom/Fandom.jsx';
import { formatDateLong } from '../../utils/format.js';

const MovieCard = ({ movie }) => (
  <Link to={`/movies/${movie.slug}`} className="card group block overflow-hidden p-0">
    {movie.poster?.url ? (
      <img src={movie.poster.url} alt="" className="aspect-2/3 w-full object-cover transition group-hover:opacity-90" />
    ) : (
      <div className="flex aspect-2/3 items-center justify-center bg-ink-800">
        <Clapperboard className="size-10 text-fog-600" aria-hidden />
      </div>
    )}
    <div className="p-4">
      <h3 className="truncate font-semibold text-fog-100">{movie.title}</h3>
      <p className="mt-1 text-sm text-fog-400">{movie.releaseDate ? formatDateLong(movie.releaseDate) : 'Release date to be announced'}</p>
    </div>
  </Link>
);

export default function Movies() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['movies'], queryFn: () => movieApi.list() });

  return (
    <>
      <Seo title="SRK films" description="Upcoming Shah Rukh Khan releases and the cities organising their first day first show." />
      <div className="container-page py-12 sm:py-16">
        <SectionHeading eyebrow="First day. First show." title="SRK films" subtitle="Every announced release, and the cities already organising an FDFS." />
        {isLoading ? (
          <CardSkeletonGrid count={4} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" />
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : data?.items?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.items.map((m) => (
              <Reveal key={m._id}>
                <MovieCard movie={m} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState icon={Clapperboard} title="No films listed yet" message="Releases appear here as soon as they are announced." />
        )}

        {/* Renders nothing — heading included — once every moment has passed for the year. */}
        <MomentStrip
          limit={3}
          heading={{
            eyebrow: 'Mark your calendar',
            title: 'Dates worth celebrating',
            subtitle: 'Turn up to an event or FDFS while one of these is on and you earn its badge.',
          }}
        />
      </div>
    </>
  );
}

/**
 * Lets a club admin open their city's FDFS for this film in one call. Only clubs that don't
 * already have a listing are offered, so the button can't produce the duplicate the API rejects.
 */
function OrganiseFdfs({ movie, existingFdfs }) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [picked, setPicked] = useState('');

  const { data: mine } = useQuery({ queryKey: ['my-fan-clubs'], queryFn: userApi.myFanClubs, enabled: isAuthenticated });

  const eligible = useMemo(() => {
    const taken = new Set((existingFdfs || []).map((f) => String(f.fanClub?._id)));
    return (mine?.memberships || [])
      .filter((m) => m.role === 'ADMIN' && m.status === 'ACTIVE' && m.fanClub?.status === 'APPROVED' && !taken.has(String(m.fanClub?._id)))
      .map((m) => m.fanClub);
  }, [mine, existingFdfs]);

  const create = useMutation({
    mutationFn: () => movieApi.createFdfs({ movieId: movie._id, fanClubId: picked || eligible[0]?._id }),
    onSuccess: (res) => {
      toast.success('FDFS created. Add the theatre and show time when you have them.');
      qc.invalidateQueries({ queryKey: ['movie', movie.slug] });
      if (res?.fdfs?.slug) navigate(`/fdfs/${res.fdfs.slug}`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (!isAuthenticated || !eligible.length) return null;

  return (
    <div className="card mt-6 p-5">
      <p className="font-semibold text-fog-100">Organise this FDFS in your city</p>
      <p className="mt-1 text-sm text-fog-400">
        Creates the listing with the film and release date filled in. Theatre, show time and meeting point stay &ldquo;To Be Announced&rdquo; until you add them.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {eligible.length > 1 && (
          <select
            value={picked || eligible[0]._id}
            onChange={(e) => setPicked(e.target.value)}
            aria-label="Fan club"
            className="h-11 rounded-xl border border-white/10 bg-ink-800 px-3 text-sm text-fog-100"
          >
            {eligible.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <Button icon={Plus} loading={create.isPending} onClick={() => create.mutate()}>
          Create FDFS
        </Button>
      </div>
    </div>
  );
}

export function MovieDetail() {
  const { slug } = useParams();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['movie', slug], queryFn: () => movieApi.get(slug) });

  if (isLoading) return <LoadingState label="Loading film…" />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  const { movie, fdfs } = data;
  return (
    <>
      <Seo title={movie.title} description={movie.tagline || movie.synopsis} image={movie.poster?.url} />
      <div className="container-page py-12 sm:py-16">
        <div className="flex flex-col gap-8 sm:flex-row">
          {movie.poster?.url && (
            <img src={movie.poster.url} alt={`${movie.title} poster`} className="h-72 w-48 shrink-0 self-start rounded-2xl object-cover ring-1 ring-white/10" />
          )}
          <div className="min-w-0 flex-1">
            <Badge tone={movie.status === 'RELEASED' ? 'neutral' : 'gold'}>{movie.status}</Badge>
            <h1 className="display mt-3 text-5xl text-fog-100 sm:text-7xl">{movie.title}</h1>
            {movie.tagline && <p className="mt-2 text-lg text-fog-300">{movie.tagline}</p>}
            <p className="mt-2 text-sm text-fog-400">{movie.releaseDate ? formatDateLong(movie.releaseDate) : 'Release date to be announced'}</p>
            {movie.synopsis && <p className="mt-5 max-w-2xl text-fog-300">{movie.synopsis}</p>}
            {movie.trailerUrl && (
              <Button href={movie.trailerUrl} variant="outline" icon={PlayCircle} className="mt-6">
                Watch trailer
              </Button>
            )}
            <OrganiseFdfs movie={movie} existingFdfs={fdfs} />
          </div>
        </div>

        <div className="mt-14">
          <SectionHeading eyebrow="Across the country" title="Cities organising this FDFS" />
          {fdfs?.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {fdfs.map((f) => (
                <Reveal key={f._id}>
                  <FDFSCard fdfs={f} />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Clapperboard}
              title="No city has opened an FDFS yet"
              message="Run a verified fan club? Open the first one for your city."
            />
          )}
        </div>
      </div>
    </>
  );
}
