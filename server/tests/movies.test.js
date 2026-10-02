import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { auth, login, setup, teardown } from './helpers.js';

let app;
let seeded;
let accounts;
let adminT;
let clubAdminT;
let movieId;

const api = (p) => `/api/v1${p}`;

before(async () => {
  ({ app, seeded, accounts } = await setup());
  adminT = (await login(app, accounts.superAdmin.email, accounts.superAdmin.password)).token;
  clubAdminT = (await login(app, accounts.clubAdmin.username, accounts.clubAdmin.password)).token;
});
after(teardown);

describe('Movies', () => {
  it('only lets movie managers add a film', async () => {
    const denied = await request(app).post(api('/movies')).set(auth(clubAdminT)).send({ title: 'Nope' });
    assert.equal(denied.status, 403);

    const res = await request(app)
      .post(api('/movies'))
      .set(auth(adminT))
      .send({ title: 'King', tagline: 'The next one', releaseDate: '2030-06-14', featured: true });
    assert.equal(res.status, 201, res.body.message);
    assert.equal(res.body.data.movie.slug, 'king');
    movieId = res.body.data.movie._id;
  });

  it('serves the countdown film to guests', async () => {
    const res = await request(app).get(api('/movies/countdown'));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.movie.title, 'King');
  });

  it('does not let /:slug shadow the fixed routes', async () => {
    const res = await request(app).get(api('/movies/king'));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.movie.title, 'King');
    assert.ok(Array.isArray(res.body.data.fdfs));
  });

  it('creates an FDFS for a club in one call, pre-filled from the film', async () => {
    const res = await request(app)
      .post(api('/movies/fdfs'))
      .set(auth(clubAdminT))
      .send({ movieId, fanClubId: String(seeded.club._id) });
    assert.equal(res.status, 201, res.body.message);
    assert.equal(res.body.data.fdfs.movie, 'King');
    assert.equal(String(res.body.data.fdfs.city), String(seeded.launchCity._id));
    // Theatre stays empty so the UI shows "To Be Announced" rather than inventing one.
    assert.ok(!res.body.data.fdfs.theatre);
  });

  it('refuses a second FDFS for the same club and film', async () => {
    const res = await request(app)
      .post(api('/movies/fdfs'))
      .set(auth(clubAdminT))
      .send({ movieId, fanClubId: String(seeded.club._id) });
    assert.equal(res.status, 400);
  });

  it('invites fan club admins once per film', async () => {
    const first = await request(app).post(api(`/movies/${movieId}/invite-organisers`)).set(auth(adminT));
    assert.equal(first.status, 200);
    assert.equal(first.body.data.alreadySent, false);
    assert.ok(first.body.data.invited >= 1);

    const second = await request(app).post(api(`/movies/${movieId}/invite-organisers`)).set(auth(adminT));
    assert.equal(second.body.data.alreadySent, true);
  });
});

describe('Moments', () => {
  it('lists seeded moments with their next occurrence', async () => {
    const res = await request(app).get(api('/moments'));
    assert.equal(res.status, 200);
    const birthday = res.body.data.items.find((m) => m.code === 'SRK_BIRTHDAY');
    assert.ok(birthday, 'SRK birthday moment should be seeded');
    assert.equal(new Date(birthday.date).getUTCMonth() + 1, 11);
    assert.equal(new Date(birthday.date).getUTCDate(), 2);
    assert.equal(typeof birthday.live, 'boolean');
  });

  it('keeps moment management behind the permission', async () => {
    const res = await request(app).post(api('/moments')).set(auth(clubAdminT)).send({ code: 'X', title: 'X', day: 1, month: 1 });
    assert.equal(res.status, 403);
  });

  it('marks a moment live inside its window', async () => {
    const today = new Date();
    const res = await request(app)
      .post(api('/moments'))
      .set(auth(adminT))
      .send({ code: 'TODAY_TEST', title: 'Today', day: today.getUTCDate(), month: today.getUTCMonth() + 1, windowDays: 1 });
    assert.equal(res.status, 201, res.body.message);

    const live = await request(app).get(api('/moments/live'));
    assert.ok(live.body.data.items.some((m) => m.code === 'TODAY_TEST'));
  });
});

describe('City race', () => {
  it('ranks cities by points earned this month only', async () => {
    const res = await request(app).get(api('/leaderboard/cities'));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.items));
    assert.ok(new Date(res.body.data.monthStart) <= new Date());
    assert.ok(new Date(res.body.data.monthEnd) > new Date());
    for (const row of res.body.data.items) {
      assert.ok(row.city?.slug, 'each row carries its city');
      assert.ok(row.points > 0);
    }
  });
});
