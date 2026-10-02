import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { setup, teardown } from './helpers.js';

let app;

const api = (p) => `/api/v1${p}`;

before(async () => {
  ({ app } = await setup());
});
after(teardown);

describe('India city import', () => {
  let first;

  it('imports states and cities on top of the launch seed', async () => {
    const { seedCities } = await import('../seed/cities.js');
    first = await seedCities({ log: () => {} });
    assert.ok(first.citiesAdded > 250, `expected 250+ cities, got ${first.citiesAdded}`);
    assert.ok(first.totals.states >= 30, `expected 30+ states/UTs, got ${first.totals.states}`);
  });

  it('keeps the launch cities untouched', async () => {
    const { City } = await import('../models/index.js');
    const nashik = await City.findOne({ slug: 'nashik' }).lean();
    assert.ok(nashik, 'Nashik should still own the plain slug');
    assert.equal(nashik.name, 'Nashik');
    // The main seed created it with a description; the importer must not have overwritten it.
    assert.ok(nashik.description);
  });

  it('gives duplicate city names distinct slugs', async () => {
    const { City } = await import('../models/index.js');
    for (const name of ['Bilaspur', 'Udaipur', 'Aurangabad', 'Hamirpur', 'Pratapgarh']) {
      const rows = await City.find({ name }).populate('state', 'name').lean();
      if (rows.length < 2) continue;
      const slugs = new Set(rows.map((r) => r.slug));
      assert.equal(slugs.size, rows.length, `${name} slugs collided: ${[...slugs].join(', ')}`);
    }
    // Aurangabad is seeded in Maharashtra first, so Bihar's copy must be the qualified one.
    const bihar = await City.findOne({ name: 'Aurangabad', slug: { $ne: 'aurangabad' } }).lean();
    assert.ok(bihar, 'the second Aurangabad should have a qualified slug');
  });

  it('is idempotent — a second run adds nothing', async () => {
    const { seedCities } = await import('../seed/cities.js');
    const second = await seedCities({ log: () => {} });
    assert.equal(second.citiesAdded, 0);
    assert.equal(second.statesAdded, 0);
    assert.equal(second.totals.cities, first.totals.cities);
  });

  it('serves the imported cities through the public API', async () => {
    const res = await request(app).get(api('/cities/search')).query({ q: 'Indo' });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.cities.some((c) => c.name === 'Indore'), 'Indore should be searchable');

    const states = await request(app).get(api('/states'));
    assert.ok(states.body.data.states.length >= 30);
  });
});
