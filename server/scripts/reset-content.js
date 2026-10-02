/**
 * Clears everything people created — accounts, fan clubs, events, FDFS, announcements, points,
 * notifications — and leaves one super admin behind.
 *
 * Deliberately keeps the scaffolding: countries, states, cities, roles, permissions, badge and
 * moment definitions, and site settings. Wiping those would break registration, which needs an
 * existing city, and would throw away the ~500 cities `seed:cities` imported.
 *
 * Denormalised counters on City (memberCount, fanClubCount) are reset too, since the rows they
 * counted are gone.
 *
 *   ADMIN_NAME="Moin" ADMIN_EMAIL="you@example.com" ADMIN_USERNAME="moin" \
 *   ADMIN_PASSWORD="…" node scripts/reset-content.js --yes
 */
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { connectDB } from '../config/db.js';
import { City, User } from '../models/index.js';
import { ROLES } from '../constants/roles.js';
import { generateReferralCode } from '../services/referral.service.js';
import { logger } from '../utils/logger.js';

/** Collections holding user-generated content. Everything here is emptied. */
const CONTENT_COLLECTIONS = [
  'users',
  'refreshtokens',
  'citymemberships',
  'fanclubs',
  'fanclubapplications',
  'fanclubmembers',
  'admincontactrequests',
  'admincollaborations',
  'events',
  'eventattendees',
  'fdfs',
  'fdfsparticipants',
  'announcements',
  'notifications',
  'reports',
  'pointstransactions',
  'userpoints',
  'userbadges',
  'referrals',
  'auditlogs',
  'movies',
];

/** Kept, because the app cannot function without them. */
const KEPT_COLLECTIONS = ['countries', 'states', 'cities', 'roles', 'permissions', 'badges', 'moments', 'sitesettings'];

export async function resetContent({ admin, log = (m) => logger.info(`  ${m}`) }) {
  const db = mongoose.connection.db;
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));

  for (const name of CONTENT_COLLECTIONS) {
    if (!existing.has(name)) continue;
    const { deletedCount } = await db.collection(name).deleteMany({});
    if (deletedCount) log(`cleared ${name}: ${deletedCount}`);
  }

  // The counters described rows that no longer exist.
  const counters = await City.updateMany({ $or: [{ memberCount: { $gt: 0 } }, { fanClubCount: { $gt: 0 } }] }, { memberCount: 0, fanClubCount: 0 });
  log(`reset counters on ${counters.modifiedCount} cities`);

  for (const name of KEPT_COLLECTIONS) {
    if (!existing.has(name)) continue;
    log(`kept ${name}: ${await db.collection(name).countDocuments()}`);
  }

  // The super admin needs a city only so the admin UI has something to show; any active one works.
  const city = await City.findOne({ status: 'ACTIVE' }).sort({ featured: -1, name: 1 }).lean();

  const user = await User.create({
    fullName: admin.fullName,
    username: admin.username,
    email: admin.email,
    password: admin.password, // hashed by the model's pre-save hook
    role: ROLES.SUPER_ADMIN,
    status: 'ACTIVE',
    emailVerified: true,
    country: city?.country,
    state: city?.state,
    city: city?._id,
    referralCode: await generateReferralCode(admin.username),
  });
  log(`super admin: ${user.email} (@${user.username})${city ? ` · ${city.name}` : ''}`);
  return user;
}

// CLI entry — refuses to run without --yes, since it deletes live data.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    try {
      if (!process.argv.includes('--yes')) {
        logger.error('Refusing to run without --yes. This permanently deletes all accounts and content.');
        process.exit(1);
      }
      const admin = {
        fullName: process.env.ADMIN_NAME,
        username: process.env.ADMIN_USERNAME,
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      };
      for (const [k, v] of Object.entries(admin)) {
        if (!v) throw new Error(`Missing ADMIN_${k === 'fullName' ? 'NAME' : k.toUpperCase()}`);
      }
      await connectDB();
      logger.info(`Resetting content in "${mongoose.connection.name}"…`);
      await resetContent({ admin });
      logger.info('Done.');
      process.exit(0);
    } catch (err) {
      logger.error('Reset failed:', err.message);
      process.exit(1);
    } finally {
      await mongoose.disconnect().catch(() => {});
    }
  })();
}
