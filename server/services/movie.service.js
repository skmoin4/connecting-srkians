import { CityMembership, FanClub, FanClubMember, FDFS, Movie } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { isObjectId, randomToken, uniqueSlug } from '../utils/helpers.js';
import { canManageClub } from './fanClub.service.js';
import { notifyUsers } from './notification.service.js';

const PUBLIC_FIELDS = 'title slug tagline synopsis poster banner releaseDate trailerUrl status featured';

/** Films the countdown can point at: announced, and either undated or not yet released. */
export async function listMovies({ status, limit = 20 } = {}) {
  const filter = status ? { status } : { status: { $ne: 'CANCELLED' } };
  return Movie.find(filter).sort({ featured: -1, releaseDate: 1, createdAt: -1 }).limit(limit).select(PUBLIC_FIELDS).lean();
}

/**
 * The film the homepage counts down to: the featured one if an admin picked it, otherwise the
 * next dated release. Returns null rather than throwing so the homepage simply omits the section.
 */
export async function countdownMovie() {
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const upcoming = { status: 'ANNOUNCED', releaseDate: { $gte: today } };
  return (
    (await Movie.findOne({ ...upcoming, featured: true }).sort({ releaseDate: 1 }).select(PUBLIC_FIELDS).lean()) ||
    (await Movie.findOne(upcoming).sort({ releaseDate: 1 }).select(PUBLIC_FIELDS).lean())
  );
}

export async function getMovie(slug) {
  const movie = await Movie.findOne({ slug }).select(PUBLIC_FIELDS).lean();
  if (!movie) throw ApiError.notFound('Movie not found');
  // Cities that already have an FDFS for this film, so fans can jump straight to theirs.
  const fdfs = await FDFS.find({ movie: movie.title, status: { $in: ['UPCOMING', 'ONGOING'] } })
    .sort({ releaseDate: 1 })
    .limit(50)
    .populate('city', 'name slug')
    .populate('fanClub', 'name slug')
    .select('movie slug releaseDate theatre showTime poster counts city fanClub status')
    .lean();
  return { movie, fdfs };
}

export async function createMovie(user, data) {
  return Movie.create({ ...data, slug: await uniqueSlug(Movie, data.title), createdBy: user._id });
}

export async function updateMovie(id, data) {
  if (!isObjectId(id)) throw ApiError.badRequest('Invalid movie');
  const movie = await Movie.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!movie) throw ApiError.notFound('Movie not found');
  return movie;
}

export async function deleteMovie(id) {
  if (!isObjectId(id)) throw ApiError.badRequest('Invalid movie');
  const movie = await Movie.findByIdAndDelete(id);
  if (!movie) throw ApiError.notFound('Movie not found');
  return movie;
}

/**
 * Invites every verified club's admin to open an FDFS for a film. Sent once per movie (tracked by
 * `fdfsInviteSentAt`) so re-saving a release date doesn't notify the same admins again.
 */
export async function inviteFdfsOrganisers(id, { force = false } = {}) {
  const movie = await Movie.findById(id);
  if (!movie) throw ApiError.notFound('Movie not found');
  if (!movie.releaseDate) throw ApiError.badRequest('Set a release date before inviting organisers');
  if (movie.fdfsInviteSentAt && !force) return { invited: 0, alreadySent: true };

  const clubs = await FanClub.find({ status: 'APPROVED' }).select('admin').lean();
  const admins = [...new Set(clubs.map((c) => String(c.admin)).filter(Boolean))];
  await notifyUsers(admins, {
    type: 'FDFS',
    title: `${movie.title} — open your city's FDFS`,
    message: `Releasing ${movie.releaseDate.toDateString()}. Create your FDFS listing so your city can register.`,
    link: `/movies/${movie.slug}`,
  });
  movie.fdfsInviteSentAt = new Date();
  await movie.save();
  return { invited: admins.length, alreadySent: false };
}

/**
 * One-click FDFS for a club, pre-filled from the film. Theatre, show time and meeting point are
 * deliberately left empty — they show as "To Be Announced" until the organiser knows them.
 */
export async function createFdfsFromMovie(user, { movieId, fanClubId }) {
  if (!isObjectId(movieId)) throw ApiError.badRequest('Invalid movie');
  const movie = await Movie.findById(movieId).lean();
  if (!movie) throw ApiError.notFound('Movie not found');
  if (!movie.releaseDate) throw ApiError.badRequest('This film has no release date yet');

  const club = await FanClub.findById(fanClubId).populate('city', 'name').lean();
  if (!club) throw ApiError.badRequest('Fan club not found');
  if (!canManageClub(user, { ...club, city: club.city._id })) throw ApiError.forbidden('You do not manage this fan club');
  if (club.status !== 'APPROVED') throw ApiError.badRequest('Only verified fan clubs can organise FDFS');

  const existing = await FDFS.findOne({ movie: movie.title, fanClub: club._id, status: { $nin: ['CANCELLED'] } }).lean();
  if (existing) throw ApiError.badRequest('Your club already has an FDFS for this film');

  const fdfs = await FDFS.create({
    movie: movie.title,
    poster: movie.poster,
    releaseDate: movie.releaseDate,
    fanClub: club._id,
    city: club.city._id,
    state: club.state,
    country: club.country,
    organizer: user._id,
    status: 'UPCOMING',
    whatsappGroupLink: club.eventDefaults?.whatsappGroupLink,
    slug: await uniqueSlug(FDFS, `${movie.title}-${club.city.name}`),
    checkInCode: randomToken(12),
  });

  const [members, cityMembers] = await Promise.all([
    FanClubMember.find({ fanClub: club._id, status: 'ACTIVE' }).select('user').lean(),
    CityMembership.find({ city: club.city._id }).select('user').limit(5000).lean(),
  ]);
  notifyUsers(
    [...members, ...cityMembers].map((m) => m.user),
    {
      type: 'FDFS',
      title: `${movie.title} FDFS announced in ${club.city.name}`,
      message: `${club.name} is organising it. Theatre and show time will follow.`,
      link: `/fdfs/${fdfs.slug}`,
    },
    { excludeUserId: user._id }
  );
  return fdfs;
}

/** Marks films as RELEASED once their date has passed. Called from the scheduled jobs. */
export async function syncMovieStatuses() {
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  await Movie.updateMany({ status: 'ANNOUNCED', releaseDate: { $lt: today } }, { status: 'RELEASED' });
}
