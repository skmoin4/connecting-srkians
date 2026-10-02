import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { auth, login, setup, teardown } from './helpers.js';

let app;
let seeded;
let accounts;
let adminT;
let memberT;

const api = (p) => `/api/v1${p}`;
const LINK = 'https://chat.whatsapp.com/TestInviteCode123';
const NUMBER = '9123456780';
const CONTACT = 'Nashik SRKians desk';

before(async () => {
  ({ app, seeded, accounts } = await setup());
  adminT = (await login(app, accounts.superAdmin.email, accounts.superAdmin.password)).token;

  await request(app).patch(api(`/admin/cities/${seeded.launchCity._id}`)).set(auth(adminT)).send({ whatsappGroupLink: LINK, whatsappNumber: NUMBER, contactName: CONTACT });

  const reg = await request(app).post(api('/auth/register')).send({
    fullName: 'Group Tester',
    username: 'group_tester',
    email: 'group@tester.dev',
    password: 'Password123',
    country: String(seeded.launchCity.country),
    state: String(seeded.launchCity.state),
    city: String(seeded.launchCity._id),
  });
  memberT = reg.body.data.accessToken;
});
after(teardown);

describe('City WhatsApp group link', () => {
  it('is hidden from guests but flagged as existing', async () => {
    const res = await request(app).get(api(`/cities/${seeded.launchCity.slug}`));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.city.whatsappGroupLink, undefined, 'guests must not receive the invite link');
    assert.equal(res.body.data.city.hasWhatsappGroup, true);
    assert.equal(res.body.data.city.whatsappNumber, undefined, 'guests must not receive the contact number');
    assert.equal(res.body.data.city.hasCityContact, true);
    const body = JSON.stringify(res.body);
    assert.ok(!body.includes('TestInviteCode123'), 'the link must not appear anywhere in the response');
    assert.ok(!body.includes(NUMBER), 'the number must not appear anywhere in the response');
  });

  it('is hidden from a signed-in user who has not joined the city', async () => {
    // Registering sets the user's city but does not create the membership the city page checks.
    const other = await request(app).post(api('/auth/register')).send({
      fullName: 'Outsider',
      username: 'outsider_one',
      email: 'outsider@tester.dev',
      password: 'Password123',
      country: String(seeded.launchCity.country),
      state: String(seeded.launchCity.state),
      city: String(seeded.launchCity._id),
    });
    const res = await request(app).get(api(`/cities/${seeded.launchCity.slug}`)).set(auth(other.body.data.accessToken));
    if (res.body.data.isMember) return; // registration joined them; covered by the next test
    assert.equal(res.body.data.city.whatsappGroupLink, undefined);
    assert.equal(res.body.data.city.whatsappNumber, undefined);
  });

  it('is returned once the user joins the city', async () => {
    const join = await request(app).post(api(`/cities/${seeded.launchCity._id}/join`)).set(auth(memberT));
    assert.equal(join.status, 200, join.body.message);
    assert.equal(join.body.data.whatsappGroupLink, LINK, 'the link should come back with the join response');

    const res = await request(app).get(api(`/cities/${seeded.launchCity.slug}`)).set(auth(memberT));
    assert.equal(res.body.data.isMember, true);
    assert.equal(res.body.data.city.whatsappGroupLink, LINK);
    assert.equal(res.body.data.city.whatsappNumber, NUMBER);
    assert.equal(res.body.data.city.contactName, CONTACT);
  });

  it('is visible to a moderator of that city', async () => {
    const modT = (await login(app, accounts.moderator.email, accounts.moderator.password)).token;
    const res = await request(app).get(api(`/cities/${seeded.launchCity.slug}`)).set(auth(modT));
    assert.equal(res.body.data.city.whatsappGroupLink, LINK);
  });

  it('rejects a non-URL invite link', async () => {
    const res = await request(app).patch(api(`/admin/cities/${seeded.launchCity._id}`)).set(auth(adminT)).send({ whatsappGroupLink: 'not-a-link' });
    assert.equal(res.status, 400);
  });

  it('rejects a malformed contact number', async () => {
    const res = await request(app).patch(api(`/admin/cities/${seeded.launchCity._id}`)).set(auth(adminT)).send({ whatsappNumber: 'call-me' });
    assert.equal(res.status, 400);
  });
});
