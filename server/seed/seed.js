/* eslint-disable no-console */
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import {
  Announcement,
  Badge,
  City,
  CityMembership,
  Country,
  Event,
  FanClub,
  FanClubApplication,
  FanClubMember,
  FDFS,
  Moment,
  Permission,
  Role,
  SiteSetting,
  State,
  User,
  UserPoints,
} from '../models/index.js';
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from '../constants/roles.js';
import { slugify, randomToken } from '../utils/helpers.js';
import { generateReferralCode } from '../services/referral.service.js';
import { evaluateBadges } from '../services/badge.service.js';
import { DEFAULT_BADGES, DEFAULT_MOMENTS, LAUNCH } from './initial-data.js';

export const SEED_ACCOUNTS = {
  superAdmin: { email: 'admin@srkians.local', username: 'srkadmin', fullName: 'Platform Admin', password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345', role: ROLES.SUPER_ADMIN },
  moderator: { email: 'moderator@srkians.local', username: 'nashik_mod', fullName: 'Demo Nashik Moderator', password: 'Moderator@12345', role: ROLES.CITY_MODERATOR, isDemo: true },
  clubAdmin: { email: 'clubadmin@srkians.local', username: 'aryanfc_admin', fullName: 'SRK Aryan FC Admin', password: 'ClubAdmin@12345', role: ROLES.FAN_CLUB_ADMIN, isDemo: true },
  demoUser: { email: 'demo@srkians.local', username: 'demo_srkian', fullName: 'Demo SRKian', password: 'Demo@12345', role: ROLES.USER, isDemo: true },
};

const log = (...a) => console.log('  ›', ...a);

async function upsertUser(spec, loc) {
  let user = await User.findOne({ email: spec.email });
  if (user) return user;
  user = await User.create({
    fullName: spec.fullName,
    username: spec.username,
    email: spec.email,
    password: spec.password,
    role: spec.role,
    emailVerified: true,
    isDemo: Boolean(spec.isDemo),
    bio: spec.isDemo ? 'Demo account for testing the platform.' : undefined,
    favouriteMovie: 'Swades',
    referralCode: await generateReferralCode(spec.username),
    city: loc.city,
    state: loc.state,
    country: loc.country,
  });
  await CityMembership.create({ user: user._id, city: loc.city });
  await City.updateOne({ _id: loc.city }, { $inc: { memberCount: 1 } });
  await UserPoints.create({ user: user._id, total: 0, city: loc.city, state: loc.state, country: loc.country });
  log(`user ${spec.email} (${spec.role})`);
  return user;
}

export async function seed({ reset = false } = {}) {
  if (reset) {
    if (env.isProd) throw new Error('Refusing to reset the database in production');
    await mongoose.connection.dropDatabase();
    log('database dropped');
  }

  // Roles & permissions (reference data for future admin-editable RBAC)
  for (const key of Object.values(PERMISSIONS)) await Permission.updateOne({ key }, { key }, { upsert: true });
  for (const [name, permissions] of Object.entries(ROLE_PERMISSIONS)) await Role.updateOne({ name }, { name, permissions, isSystem: true }, { upsert: true });
  log('roles & permissions');

  await SiteSetting.updateOne({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true });
  log('site settings');

  // Locations
  const country = await Country.findOneAndUpdate(
    { code: LAUNCH.country.code },
    { $setOnInsert: { ...LAUNCH.country, slug: slugify(LAUNCH.country.name), status: 'ACTIVE' } },
    { upsert: true, new: true }
  );
  const state = await State.findOneAndUpdate(
    { country: country._id, name: LAUNCH.state.name },
    { $setOnInsert: { name: LAUNCH.state.name, slug: slugify(`${LAUNCH.state.name}-${country.code}`), country: country._id, status: 'ACTIVE' } },
    { upsert: true, new: true }
  );
  const cities = {};
  for (const c of LAUNCH.cities) {
    cities[c.name] = await City.findOneAndUpdate(
      { state: state._id, name: c.name },
      { $setOnInsert: { ...c, slug: slugify(c.name), state: state._id, country: country._id, status: 'ACTIVE' } },
      { upsert: true, new: true }
    );
  }
  log(`locations: ${country.name} → ${state.name} → ${Object.keys(cities).join(', ')}`);

  const launchCity = cities[LAUNCH.launchCity];
  const loc = { city: launchCity._id, state: state._id, country: country._id };

  // Badges
  for (const b of DEFAULT_BADGES) {
    const { cityName, ...rule } = b.rule;
    if (cityName) rule.city = cities[cityName]?._id;
    await Badge.updateOne({ code: b.code }, { $setOnInsert: { ...b, rule } }, { upsert: true });
  }
  log(`${DEFAULT_BADGES.length} badges`);

  // Moments (2 November, film anniversaries) — linked to the MANUAL badges seeded above.
  for (const m of DEFAULT_MOMENTS) {
    const { badge: badgeCode, ...rest } = m;
    const badge = badgeCode ? await Badge.findOne({ code: badgeCode }).select('_id').lean() : null;
    await Moment.updateOne({ code: m.code }, { $setOnInsert: { ...rest, badge: badge?._id, isDemo: true } }, { upsert: true });
  }
  log(`${DEFAULT_MOMENTS.length} moments`);

  // Accounts
  const admin = await upsertUser(SEED_ACCOUNTS.superAdmin, loc);
  const moderator = await upsertUser(SEED_ACCOUNTS.moderator, loc);
  await User.updateOne({ _id: moderator._id }, { $addToSet: { moderatedCities: launchCity._id } });
  const clubAdmin = await upsertUser(SEED_ACCOUNTS.clubAdmin, loc);
  const demoUser = await upsertUser(SEED_ACCOUNTS.demoUser, loc);

  // Initial fan club (approved)
  let club = await FanClub.findOne({ slug: slugify(LAUNCH.fanClub.name) });
  if (!club) {
    club = await FanClub.create({
      ...LAUNCH.fanClub,
      slug: slugify(LAUNCH.fanClub.name),
      ...loc,
      admin: clubAdmin._id,
      adminName: clubAdmin.fullName,
      status: 'APPROVED',
      approvedAt: new Date(),
      featured: true,
      memberCount: 0,
    });
    await FanClubApplication.create({
      fanClub: club._id,
      applicant: clubAdmin._id,
      city: launchCity._id,
      status: 'APPROVED',
      history: [
        { action: 'SUBMIT', status: 'PENDING', by: clubAdmin._id },
        { action: 'APPROVE', status: 'APPROVED', by: admin._id, note: 'Initial launch club (seed)' },
      ],
    });
    await FanClubMember.create({ fanClub: club._id, user: clubAdmin._id, role: 'ADMIN', status: 'ACTIVE', joinedAt: new Date() });
    await FanClubMember.create({ fanClub: club._id, user: demoUser._id, role: 'MEMBER', status: 'ACTIVE', joinedAt: new Date() });
    await FanClub.updateOne({ _id: club._id }, { memberCount: 2 });
    await City.updateOne({ _id: launchCity._id }, { $inc: { fanClubCount: 1 } });
    log(`fan club: ${club.name}`);
  }

  // Demo event (clearly marked; venue left "To Be Announced")
  const demoEventSlug = 'demo-nashik-srkians-fan-meet';
  if (!(await Event.exists({ slug: demoEventSlug }))) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 21);
    date.setUTCHours(0, 0, 0, 0);
    await Event.create({
      title: '[Demo] Nashik SRKians Fan Meet',
      slug: demoEventSlug,
      description:
        'DEMO LISTING — created by the seed script to showcase the events feature. Venue and timing are placeholders to be announced by the fan club admin.',
      eventType: 'FAN_MEET',
      date,
      startTime: '17:00',
      endTime: '20:00',
      ...loc,
      organizer: clubAdmin._id,
      fanClub: club._id,
      capacity: 100,
      status: 'UPCOMING',
      checkInCode: randomToken(12),
      isDemo: true,
    });
    log('demo event');
  }

  // Demo FDFS — theatre/show time intentionally left blank ("To Be Announced")
  const demoFdfsSlug = 'king-nashik';
  if (!(await FDFS.exists({ slug: demoFdfsSlug }))) {
    await FDFS.create({
      movie: 'KING',
      slug: demoFdfsSlug,
      releaseDate: new Date(Date.UTC(2026, 11, 24)),
      ...loc,
      fanClub: club._id,
      organizer: clubAdmin._id,
      instructions: 'DEMO LISTING — theatre, show time and meeting point will be announced by SRK Aryan FC Nashik. Release date shown is a placeholder from the launch brief; confirm before publicising.',
      registrationOpen: true,
      status: 'UPCOMING',
      checkInCode: randomToken(12),
      isDemo: true,
    });
    log('demo FDFS');
  }

  if (!(await Announcement.exists({ isDemo: true }))) {
    await Announcement.create({
      title: '[Demo] Welcome to the Nashik SRKian network!',
      body: 'This is a demo announcement. Find your fan club, register for FDFS and meet fellow SRKians in your city.',
      target: 'CITY',
      city: launchCity._id,
      state: state._id,
      country: country._id,
      author: admin._id,
      pinned: true,
      isDemo: true,
    });
    log('demo announcement');
  }

  for (const u of [admin, moderator, clubAdmin, demoUser]) await evaluateBadges(u._id).catch(() => {});
  return { admin, moderator, clubAdmin, demoUser, club, launchCity };
}

// CLI entry: `npm run seed` / `npm run seed:reset`
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    try {
      await connectDB();
      console.log('Seeding SRKians…');
      await seed({ reset: process.argv.includes('--reset') });
      console.log('\nDone. Development accounts:');
      for (const a of Object.values(SEED_ACCOUNTS)) console.log(`  ${a.role.padEnd(15)} ${a.email} / ${a.password}`);
      console.log('\n⚠  Change the super admin password (or set SEED_ADMIN_PASSWORD) before going live.');
    } catch (err) {
      console.error('Seed failed:', err);
      process.exitCode = 1;
    } finally {
      await mongoose.disconnect();
    }
  })();
}
