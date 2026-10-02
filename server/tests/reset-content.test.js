import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { auth, login, setup, teardown } from './helpers.js';

let app;

const api = (p) => `/api/v1${p}`;
const ADMIN = { fullName: 'Moin', username: 'moin', email: 'moin@example.com', password: 'skm@7020' };

before(async () => {
  ({ app } = await setup());
});
after(teardown);

describe('Content reset', () => {
  it('clears accounts and content but keeps the scaffolding', async () => {
    const db = mongoose.connection.db;
    const before = {
      cities: await db.collection('cities').countDocuments(),
      badges: await db.collection('badges').countDocuments(),
      roles: await db.collection('roles').countDocuments(),
    };
    assert.ok(before.cities > 0 && before.badges > 0 && before.roles > 0, 'seed should have scaffolding');
    assert.ok((await db.collection('users').countDocuments()) > 1, 'seed should have demo users');
    assert.ok((await db.collection('fanclubs').countDocuments()) > 0, 'seed should have a demo club');

    const { resetContent } = await import('../scripts/reset-content.js');
    await resetContent({ admin: ADMIN, log: () => {} });

    for (const name of ['fanclubs', 'events', 'fdfs', 'announcements', 'notifications', 'userbadges', 'pointstransactions', 'citymemberships']) {
      assert.equal(await db.collection(name).countDocuments(), 0, `${name} should be empty`);
    }
    assert.equal(await db.collection('users').countDocuments(), 1, 'only the super admin should remain');

    assert.equal(await db.collection('cities').countDocuments(), before.cities, 'cities must survive');
    assert.equal(await db.collection('badges').countDocuments(), before.badges, 'badge definitions must survive');
    assert.equal(await db.collection('roles').countDocuments(), before.roles, 'roles must survive');
    assert.ok((await db.collection('moments').countDocuments()) > 0, 'moments must survive');
    assert.ok((await db.collection('sitesettings').countDocuments()) > 0, 'site settings must survive');
  });

  it('leaves city counters at zero', async () => {
    const stale = await mongoose.connection.db
      .collection('cities')
      .countDocuments({ $or: [{ memberCount: { $gt: 0 } }, { fanClubCount: { $gt: 0 } }] });
    assert.equal(stale, 0, 'no city should still claim members or clubs');
  });

  it('lets the new super admin log in and reach the admin panel', async () => {
    const { token } = await login(app, ADMIN.email, ADMIN.password);
    const me = await request(app).get(api('/auth/me')).set(auth(token));
    assert.equal(me.body.data.user.role, 'SUPER_ADMIN');
    assert.equal(me.body.data.user.fullName, 'Moin');
    assert.equal(me.body.data.user.username, 'moin');

    const dash = await request(app).get(api('/admin/dashboard')).set(auth(token));
    assert.equal(dash.status, 200, dash.body.message);
  });

  it('still lets a brand new user register into a surviving city', async () => {
    const cities = await request(app).get(api('/cities')).query({ limit: 1 });
    const city = cities.body.data.items[0];
    assert.ok(city, 'cities should still be listed');

    const res = await request(app).post(api('/auth/register')).send({
      fullName: 'Fresh Fan',
      username: 'fresh_fan',
      email: 'fresh@fan.dev',
      password: 'Password123',
      country: String(city.country?._id || city.country),
      state: String(city.state?._id || city.state),
      city: String(city._id),
    });
    assert.equal(res.status, 201, res.body.message);
  });
});
