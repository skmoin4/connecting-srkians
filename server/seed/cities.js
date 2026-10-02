/**
 * Imports India's states and major cities so new SRKians can pick their own city at sign-up.
 *
 * Idempotent and additive: it only ever inserts. Names already present (including the launch
 * cities from `seed.js`) are left exactly as they are, so admins can rename, disable or write
 * descriptions for a city without this script undoing that on the next run.
 *
 *   npm run seed:cities
 */
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { connectDB } from '../config/db.js';
import { City, Country, State } from '../models/index.js';
import { slugify } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';
import { LAUNCH } from './initial-data.js';
import { FEATURED_CITIES, INDIA_LOCATIONS } from './india-cities.js';

/**
 * City slugs are globally unique, but several Indian city names are not: Bilaspur, Udaipur,
 * Aurangabad, Hamirpur and Pratapgarh each exist in two states. The first one imported keeps the
 * plain slug; later ones are qualified by state (`udaipur-tripura`) so both stay reachable.
 */
async function citySlug(name, stateName) {
  const plain = slugify(name);
  if (!(await City.exists({ slug: plain }))) return plain;

  const qualified = slugify(`${name}-${stateName}`);
  if (!(await City.exists({ slug: qualified }))) return qualified;

  for (let i = 2; i < 50; i += 1) {
    const candidate = `${qualified}-${i}`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await City.exists({ slug: candidate }))) return candidate;
  }
  throw new Error(`Could not generate a unique slug for ${name} (${stateName})`);
}

export async function seedCities({ log = (m) => logger.info(`  ${m}`) } = {}) {
  const country = await Country.findOneAndUpdate(
    { code: LAUNCH.country.code },
    { $setOnInsert: { ...LAUNCH.country, slug: slugify(LAUNCH.country.name), status: 'ACTIVE' } },
    { upsert: true, new: true }
  );

  const featured = new Set(FEATURED_CITIES);
  let statesAdded = 0;
  let citiesAdded = 0;
  let skipped = 0;

  for (const { state: stateName, cities } of INDIA_LOCATIONS) {
    const before = await State.exists({ country: country._id, name: stateName });
    const state = await State.findOneAndUpdate(
      { country: country._id, name: stateName },
      { $setOnInsert: { name: stateName, slug: slugify(`${stateName}-${country.code}`), country: country._id, status: 'ACTIVE' } },
      { upsert: true, new: true }
    );
    if (!before) statesAdded += 1;

    for (const name of cities) {
      if (await City.exists({ state: state._id, name })) {
        skipped += 1;
        continue;
      }
      await City.create({
        name,
        slug: await citySlug(name, stateName),
        state: state._id,
        country: country._id,
        status: 'ACTIVE',
        featured: featured.has(name),
      });
      citiesAdded += 1;
    }
  }

  const totals = {
    states: await State.countDocuments({ country: country._id }),
    cities: await City.countDocuments({ country: country._id }),
  };
  log(`states: +${statesAdded} (${totals.states} total)`);
  log(`cities: +${citiesAdded}, ${skipped} already present (${totals.cities} total)`);
  return { statesAdded, citiesAdded, skipped, totals };
}

// CLI entry: `npm run seed:cities`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    try {
      await connectDB();
      logger.info('Importing Indian states and cities…');
      await seedCities();
      logger.info('Done.');
      process.exit(0);
    } catch (err) {
      logger.error('City import failed:', err.message);
      process.exit(1);
    } finally {
      await mongoose.disconnect().catch(() => {});
    }
  })();
}
