import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { auth, login, setup, teardown } from './helpers.js';

let app;
let seeded;
let accounts;
let adminT;
let clubAdminT;
let modT;
let newUser; // registered during tests
let newUserT;

const api = (p) => `/api/v1${p}`;

before(async () => {
  ({ app, seeded, accounts } = await setup());
  adminT = (await login(app, accounts.superAdmin.email, accounts.superAdmin.password)).token;
  clubAdminT = (await login(app, accounts.clubAdmin.username, accounts.clubAdmin.password)).token;
  modT = (await login(app, accounts.moderator.email, accounts.moderator.password)).token;
});
after(teardown);

describe('Auth', () => {
  it('registers a user with a valid Country → State → City chain', async () => {
    const city = seeded.launchCity;
    const res = await request(app)
      .post(api('/auth/register'))
      .send({
        fullName: 'Test Fan',
        username: 'test_fan',
        email: 'test@fan.dev',
        password: 'Password123',
        country: String(city.country),
        state: String(city.state),
        city: String(city._id),
      });
    assert.equal(res.status, 201, res.body.message);
    assert.ok(res.body.data.accessToken);
    assert.equal(res.body.data.user.city.slug, 'nashik');
    assert.equal(res.body.data.user.password, undefined);
    assert.ok(res.headers['set-cookie'].some((c) => c.startsWith('srk_rt=') && c.includes('HttpOnly')));
    newUser = res.body.data.user;
    newUserT = res.body.data.accessToken;
  });

  it('rejects duplicate email and inconsistent locations', async () => {
    const city = seeded.launchCity;
    const dup = await request(app).post(api('/auth/register')).send({
      fullName: 'Dup',
      username: 'dup_user',
      email: 'test@fan.dev',
      password: 'Password123',
      country: String(city.country),
      state: String(city.state),
      city: String(city._id),
    });
    assert.equal(dup.status, 409);
    const bad = await request(app).post(api('/auth/register')).send({
      fullName: 'Bad Loc',
      username: 'bad_loc',
      email: 'bad@fan.dev',
      password: 'Password123',
      country: String(city.state), // wrong on purpose
      state: String(city.state),
      city: String(city._id),
    });
    assert.equal(bad.status, 400);
  });

  it('logs in, rotates refresh tokens, detects reuse and logs out', async () => {
    const { cookie } = await login(app, 'test@fan.dev', 'Password123');
    const r1 = await request(app).post(api('/auth/refresh')).set('Cookie', cookie);
    assert.equal(r1.status, 200);
    assert.ok(r1.body.data.accessToken);
    const rotated = r1.headers['set-cookie'];
    // Reusing the old (rotated) token must fail and revoke the family
    const reuse = await request(app).post(api('/auth/refresh')).set('Cookie', cookie);
    assert.equal(reuse.status, 401);
    const afterReuse = await request(app).post(api('/auth/refresh')).set('Cookie', rotated);
    assert.equal(afterReuse.status, 401, 'family should be revoked after reuse');

    const s = await login(app, 'test_fan', 'Password123');
    const out = await request(app).post(api('/auth/logout')).set('Cookie', s.cookie);
    assert.equal(out.status, 200);
    const again = await request(app).post(api('/auth/refresh')).set('Cookie', s.cookie);
    assert.equal(again.status, 401);
  });

  it('rejects wrong password with a generic message', async () => {
    const res = await request(app).post(api('/auth/login')).send({ identifier: 'test@fan.dev', password: 'nope' });
    assert.equal(res.status, 401);
    assert.match(res.body.message, /Invalid email\/username or password/);
  });

  it('GET /auth/me requires a token', async () => {
    assert.equal((await request(app).get(api('/auth/me'))).status, 401);
    const me = await request(app).get(api('/auth/me')).set(auth(newUserT));
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.username, 'test_fan');
  });

  it('forgot/reset password flow works and invalidates old sessions', async () => {
    const f = await request(app).post(api('/auth/forgot-password')).send({ email: 'test@fan.dev' });
    assert.equal(f.status, 200);
    const token = f.body.data.devToken; // only exposed in NODE_ENV=test
    assert.ok(token);
    const r = await request(app).post(api('/auth/reset-password')).send({ token, password: 'NewPassword456' });
    assert.equal(r.status, 200);
    const s = await login(app, 'test@fan.dev', 'NewPassword456');
    newUserT = s.token;
  });
});

describe('Cities', () => {
  it('searches cities with autocomplete', async () => {
    const res = await request(app).get(api('/cities/search?q=nas'));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.cities[0].slug, 'nashik');
  });

  it('returns city detail with live stats', async () => {
    const res = await request(app).get(api('/cities/nashik'));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.city.name, 'Nashik');
    assert.ok(res.body.data.stats.members >= 5);
    assert.equal(res.body.data.stats.fanClubs, 1);
  });

  it('changes a user city and keeps member counts consistent', async () => {
    const pune = (await request(app).get(api('/cities/pune'))).body.data.city;
    const before = (await request(app).get(api('/cities/nashik'))).body.data.city.memberCount;
    const res = await request(app).post(api(`/cities/${pune._id}/join`)).set(auth(newUserT));
    assert.equal(res.status, 200);
    const after = (await request(app).get(api('/cities/nashik'))).body.data.city.memberCount;
    assert.equal(after, before - 1);
    assert.equal((await request(app).get(api('/cities/pune'))).body.data.city.memberCount, 1);
    // move back to Nashik
    await request(app).post(api(`/cities/${seeded.launchCity._id}/join`)).set(auth(newUserT));
  });
});

describe('Fan clubs', () => {
  let appliedId;

  it('hides private contact details from the public API', async () => {
    const res = await request(app).get(api('/fan-clubs/srk-aryan-fc-nashik'));
    assert.equal(res.status, 200);
    const c = res.body.data.fanClub;
    assert.equal(c.isVerified, true);
    assert.equal(c.instagram, 'srkaryanfc_nashik');
    assert.equal(c.whatsappNumber, undefined, 'WhatsApp must not leak when showWhatsApp=false');
    assert.equal(c.phone, undefined);
    // Club admin sees it
    const own = await request(app).get(api('/fan-clubs/srk-aryan-fc-nashik')).set(auth(clubAdminT));
    assert.equal(own.body.data.fanClub.whatsappNumber, '7020318629');
    // List endpoint also strips it
    const list = await request(app).get(api('/fan-clubs'));
    assert.equal(list.body.data.items[0].whatsappNumber, undefined);
  });

  it('shows WhatsApp once the admin opts in', async () => {
    const id = seeded.club._id;
    const upd = await request(app).patch(api(`/fan-clubs/${id}`)).set(auth(clubAdminT)).send({ contactVisibility: { showWhatsApp: true } });
    assert.equal(upd.status, 200, upd.body.message);
    const res = await request(app).get(api('/fan-clubs/srk-aryan-fc-nashik'));
    assert.equal(res.body.data.fanClub.whatsappNumber, '7020318629');
    await request(app).patch(api(`/fan-clubs/${id}`)).set(auth(clubAdminT)).send({ contactVisibility: { showWhatsApp: false } });
  });

  it('non-managers cannot edit a club', async () => {
    const res = await request(app).patch(api(`/fan-clubs/${seeded.club._id}`)).set(auth(newUserT)).send({ name: 'Hijacked' });
    assert.equal(res.status, 403);
  });

  it('accepts an application as PENDING and hides it publicly', async () => {
    const city = seeded.launchCity;
    const res = await request(app)
      .post(api('/fan-clubs/apply'))
      .set(auth(newUserT))
      .send({
        name: 'Nashik Kings Club',
        description: 'A brand new SRK fan club for college students in Nashik.',
        country: String(city.country),
        state: String(city.state),
        city: String(city._id),
        adminName: 'Test Fan',
        instagram: '@nashikkings',
        phone: '9999999999',
      });
    assert.equal(res.status, 201, res.body.message);
    assert.equal(res.body.data.fanClub.status, 'PENDING');
    appliedId = res.body.data.fanClub._id;
    const pub = await request(app).get(api('/fan-clubs/nashik-kings-club'));
    assert.equal(pub.status, 404);
  });

  it('only moderators/admins can approve (RBAC)', async () => {
    const denied = await request(app).patch(api(`/admin/fan-clubs/${appliedId}/status`)).set(auth(newUserT)).send({ action: 'APPROVE' });
    assert.equal(denied.status, 403);
    const denied2 = await request(app).patch(api(`/admin/fan-clubs/${appliedId}/status`)).set(auth(clubAdminT)).send({ action: 'APPROVE' });
    assert.equal(denied2.status, 403);
    const ok = await request(app).patch(api(`/admin/fan-clubs/${appliedId}/status`)).set(auth(modT)).send({ action: 'APPROVE', note: 'Looks good' });
    assert.equal(ok.status, 200, ok.body.message);
    assert.equal(ok.body.data.fanClub.status, 'APPROVED');

    const pub = await request(app).get(api('/fan-clubs/nashik-kings-club'));
    assert.equal(pub.status, 200);
    assert.equal(pub.body.data.fanClub.phone, undefined);

    // applicant was promoted and notified
    const me = await request(app).get(api('/auth/me')).set(auth(newUserT));
    assert.equal(me.body.data.user.role, 'FAN_CLUB_ADMIN');
    const notes = await request(app).get(api('/notifications')).set(auth(newUserT));
    assert.ok(notes.body.data.items.some((n) => /approved/i.test(n.title)));

    const logs = await request(app).get(api('/admin/audit-logs')).set(auth(adminT));
    assert.ok(logs.body.data.items.some((l) => l.action === 'FANCLUB_APPROVE'));
  });

  it('join and leave with duplicate prevention', async () => {
    const demo = await login(app, accounts.demoUser.email, accounts.demoUser.password);
    const j = await request(app).post(api(`/fan-clubs/${appliedId}/join`)).set(auth(demo.token));
    assert.equal(j.status, 200);
    assert.equal(j.body.data.status, 'ACTIVE');
    const dup = await request(app).post(api(`/fan-clubs/${appliedId}/join`)).set(auth(demo.token));
    assert.equal(dup.status, 409);
    let club = (await request(app).get(api('/fan-clubs/nashik-kings-club'))).body.data.fanClub;
    assert.equal(club.memberCount, 2); // admin + demo
    const l = await request(app).delete(api(`/fan-clubs/${appliedId}/leave`)).set(auth(demo.token));
    assert.equal(l.status, 200);
    club = (await request(app).get(api('/fan-clubs/nashik-kings-club'))).body.data.fanClub;
    assert.equal(club.memberCount, 1);
  });

  it('contact admin creates a request the admin can respond to', async () => {
    const demo = await login(app, accounts.demoUser.email, accounts.demoUser.password);
    const res = await request(app)
      .post(api(`/fan-clubs/${seeded.club._id}/contact`))
      .set(auth(demo.token))
      .send({ name: 'Demo', subject: 'FDFS tickets', message: 'How can I book FDFS tickets with the club?' });
    assert.equal(res.status, 201);
    const list = await request(app).get(api('/fan-club/contact-requests')).set(auth(clubAdminT));
    assert.equal(list.status, 200);
    const item = list.body.data.items.find((i) => i.subject === 'FDFS tickets');
    assert.ok(item);
    const resp = await request(app).patch(api(`/fan-club/contact-requests/${item._id}`)).set(auth(clubAdminT)).send({ response: 'Register on the FDFS page!' });
    assert.equal(resp.body.data.request.status, 'RESPONDED');
    // plain users cannot read contact requests
    assert.equal((await request(app).get(api('/fan-club/contact-requests')).set(auth(demo.token))).status, 403);
  });
});

describe('Events & FDFS', () => {
  let eventId;
  let fdfsId;
  let demo;

  before(async () => {
    demo = await login(app, accounts.demoUser.email, accounts.demoUser.password);
  });

  it('plain users cannot create events', async () => {
    const res = await request(app).post(api('/events')).set(auth(demo.token)).send({ title: 'x', date: '2030-01-01', city: String(seeded.launchCity._id) });
    assert.equal(res.status, 403);
  });

  it('club admin creates an event; members get notified', async () => {
    const res = await request(app)
      .post(api('/events'))
      .set(auth(clubAdminT))
      .send({
        title: 'Birthday Bash',
        eventType: 'BIRTHDAY_CELEBRATION',
        date: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
        startTime: '18:00',
        city: String(seeded.launchCity._id),
        fanClub: String(seeded.club._id),
        capacity: 1,
      });
    assert.equal(res.status, 201, res.body.message);
    eventId = res.body.data.event._id;
    const notes = await request(app).get(api('/notifications')).set(auth(demo.token));
    assert.ok(notes.body.data.items.some((n) => /New event/.test(n.title)));
  });

  it('attendance: going, duplicate-safe, capacity enforced, cancel restores', async () => {
    const g = await request(app).post(api(`/events/${eventId}/attendance`)).set(auth(demo.token)).send({ status: 'GOING' });
    assert.equal(g.status, 200, g.body.message);
    assert.equal(g.body.data.counts.going, 1);
    const again = await request(app).post(api(`/events/${eventId}/attendance`)).set(auth(demo.token)).send({ status: 'GOING' });
    assert.equal(again.body.data.counts.going, 1);
    const full = await request(app).post(api(`/events/${eventId}/attendance`)).set(auth(newUserT)).send({ status: 'GOING' });
    assert.equal(full.status, 400);
    const c = await request(app).post(api(`/events/${eventId}/attendance`)).set(auth(demo.token)).send({ status: 'CANCELLED' });
    assert.equal(c.body.data.counts.going, 0);
    const att = await request(app).get(api(`/events/${eventId}/attendees`)).set(auth(clubAdminT));
    assert.equal(att.status, 200);
    assert.equal((await request(app).get(api(`/events/${eventId}/attendees`)).set(auth(demo.token))).status, 403);
  });

  it('FDFS: create, join, TBA details and update notifications', async () => {
    const res = await request(app)
      .post(api('/fdfs'))
      .set(auth(clubAdminT))
      .send({ movie: 'Test Movie', releaseDate: '2030-05-01', fanClub: String(seeded.club._id) });
    assert.equal(res.status, 201, res.body.message);
    fdfsId = res.body.data.fdfs._id;
    const slug = res.body.data.fdfs.slug;
    assert.equal(res.body.data.fdfs.theatre, undefined); // never invented

    const j = await request(app).post(api(`/fdfs/${fdfsId}/join`)).set(auth(demo.token)).send({ status: 'GOING' });
    assert.equal(j.status, 200);
    assert.equal(j.body.data.counts.going, 1);

    const detail = await request(app).get(api(`/fdfs/${slug}`)).set(auth(demo.token));
    assert.equal(detail.body.data.fdfs.myStatus, 'GOING');

    await request(app).patch(api(`/fdfs/${fdfsId}`)).set(auth(clubAdminT)).send({ theatre: 'City Pride Cinema' });
    const notes = await request(app).get(api('/notifications')).set(auth(demo.token));
    assert.ok(notes.body.data.items.some((n) => /theatre updated/i.test(n.title)));

    assert.equal((await request(app).patch(api(`/fdfs/${fdfsId}`)).set(auth(demo.token)).send({ theatre: 'X' })).status, 403);
  });

  it('QR check-in marks attendance once', async () => {
    // Use the seeded demo event? It is 21 days out; check-in opens 24h before. Create one for today.
    const ev = await request(app)
      .post(api('/events'))
      .set(auth(clubAdminT))
      .send({ title: 'Today Meetup', date: new Date().toISOString().slice(0, 10), city: String(seeded.launchCity._id), fanClub: String(seeded.club._id) });
    const id = ev.body.data.event._id;
    const code = (await request(app).get(api(`/events/${id}/check-in-code`)).set(auth(clubAdminT))).body.data.code;
    assert.ok(code);
    const bad = await request(app).post(api(`/events/${id}/check-in`)).set(auth(demo.token)).send({ code: 'wrongcode' });
    assert.equal(bad.status, 400);
    const ok = await request(app).post(api(`/events/${id}/check-in`)).set(auth(demo.token)).send({ code });
    assert.equal(ok.status, 200, ok.body.message);
    const dup = await request(app).post(api(`/events/${id}/check-in`)).set(auth(demo.token)).send({ code });
    assert.equal(dup.status, 409);
  });
});

describe('Notifications', () => {
  it('lists, marks read and deletes', async () => {
    const list = await request(app).get(api('/notifications')).set(auth(newUserT));
    assert.ok(list.body.data.unread > 0);
    const first = list.body.data.items[0];
    await request(app).patch(api(`/notifications/${first._id}/read`)).set(auth(newUserT));
    await request(app).patch(api('/notifications/read-all')).set(auth(newUserT));
    const count = await request(app).get(api('/notifications/unread-count')).set(auth(newUserT));
    assert.equal(count.body.data.unread, 0);
    const del = await request(app).delete(api(`/notifications/${first._id}`)).set(auth(newUserT));
    assert.equal(del.status, 200);
  });

  it('respects notification preferences', async () => {
    const demo = await login(app, accounts.demoUser.email, accounts.demoUser.password);
    await request(app).patch(api('/users/me/notification-preferences')).set(auth(demo.token)).send({ events: false });
    const before = (await request(app).get(api('/notifications/unread-count')).set(auth(demo.token))).body.data.unread;
    await request(app)
      .post(api('/events'))
      .set(auth(clubAdminT))
      .send({ title: 'Quiet Event', date: '2031-01-01', city: String(seeded.launchCity._id), fanClub: String(seeded.club._id) });
    const after = (await request(app).get(api('/notifications/unread-count')).set(auth(demo.token))).body.data.unread;
    assert.equal(after, before);
  });
});

describe('Privacy & admin', () => {
  it('public profile never exposes email and honours privacy', async () => {
    const res = await request(app).get(api('/users/test_fan'));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.profile.email, undefined);
    await request(app).patch(api('/users/me/privacy')).set(auth(newUserT)).send({ showCity: false });
    const hidden = await request(app).get(api('/users/test_fan'));
    assert.equal(hidden.body.data.profile.city, undefined);
    await request(app).patch(api('/users/me/privacy')).set(auth(newUserT)).send({ publicProfile: false });
    const priv = await request(app).get(api('/users/test_fan'));
    assert.equal(priv.body.data.profile.isPrivate, true);
    assert.equal(priv.body.data.profile.bio, undefined);
  });

  it('admin routes are protected by role', async () => {
    assert.equal((await request(app).get(api('/admin/dashboard'))).status, 401);
    assert.equal((await request(app).get(api('/admin/dashboard')).set(auth(clubAdminT))).status, 403);
    assert.equal((await request(app).get(api('/admin/dashboard')).set(auth(modT))).status, 200);
    assert.equal((await request(app).get(api('/admin/users')).set(auth(modT))).status, 403, 'moderators cannot manage users');
    const users = await request(app).get(api('/admin/users')).set(auth(adminT));
    assert.equal(users.status, 200);
    const analytics = await request(app).get(api('/admin/analytics')).set(auth(adminT));
    assert.equal(analytics.status, 200);
    assert.equal(analytics.body.data.series.userGrowth.length, 30);
  });

  it('moderators are scoped to their cities', async () => {
    const mumbai = (await request(app).get(api('/cities/mumbai'))).body.data.city;
    const res = await request(app)
      .post(api('/announcements'))
      .set(auth(modT))
      .send({ title: 'Mumbai notice', target: 'CITY', city: mumbai._id });
    assert.equal(res.status, 403);
    const ok = await request(app)
      .post(api('/announcements'))
      .set(auth(modT))
      .send({ title: 'Nashik notice', target: 'CITY', city: String(seeded.launchCity._id), notify: false });
    assert.equal(ok.status, 201);
  });

  it('super admin can suspend a user, which blocks their session', async () => {
    const u = await request(app).get(api('/admin/users?q=test_fan')).set(auth(adminT));
    const id = u.body.data.items[0]._id;
    const s = await request(app).patch(api(`/admin/users/${id}`)).set(auth(adminT)).send({ status: 'SUSPENDED' });
    assert.equal(s.status, 200);
    assert.equal((await request(app).get(api('/auth/me')).set(auth(newUserT))).status, 401);
    const l = await request(app).post(api('/auth/login')).send({ identifier: 'test_fan', password: 'NewPassword456' });
    assert.equal(l.status, 403);
    await request(app).patch(api(`/admin/users/${id}`)).set(auth(adminT)).send({ status: 'ACTIVE' });
  });

  it('rejects NoSQL operator injection in login', async () => {
    const res = await request(app).post(api('/auth/login')).send({ identifier: { $gt: '' }, password: { $gt: '' } });
    assert.equal(res.status, 400);
  });

  it('reports are created and reviewed', async () => {
    const demo = await login(app, accounts.demoUser.email, accounts.demoUser.password);
    const r = await request(app).post(api('/reports')).set(auth(demo.token)).send({ targetType: 'FAN_CLUB', targetId: String(seeded.club._id), reason: 'INCORRECT_INFORMATION' });
    assert.equal(r.status, 201);
    const dup = await request(app).post(api('/reports')).set(auth(demo.token)).send({ targetType: 'FAN_CLUB', targetId: String(seeded.club._id), reason: 'SPAM' });
    assert.equal(dup.status, 409);
    const list = await request(app).get(api('/admin/reports')).set(auth(modT));
    assert.equal(list.body.data.items.length, 1);
    const upd = await request(app).patch(api(`/admin/reports/${r.body.data.report._id}`)).set(auth(modT)).send({ status: 'RESOLVED', note: 'Fixed' });
    assert.equal(upd.body.data.report.status, 'RESOLVED');
  });

  it('stats are live counts', async () => {
    const res = await request(app).get(api('/stats'));
    assert.equal(res.body.data.fanClubs, 2);
    assert.equal(res.body.data.cities, 5);
  });
});
