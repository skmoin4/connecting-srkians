// Forces the production path: no object store and no writable disk, which is what a serverless
// host gives us. Must be set before helpers.js imports the app, since env.js reads it once.
process.env.ALLOW_LOCAL_UPLOADS = 'false';

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { auth, login, setup, teardown } from './helpers.js';

let app;
let accounts;
let token;

const api = (p) => `/api/v1${p}`;

// Smallest valid PNG the server's magic-byte check will accept.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

before(async () => {
  ({ app, accounts } = await setup());
  token = (await login(app, accounts.clubAdmin.username, accounts.clubAdmin.password)).token;
});
after(teardown);

describe('Uploads without an object store', () => {
  let image;

  it('stores the image instead of refusing it', async () => {
    const res = await request(app)
      .post(api('/uploads/image'))
      .query({ folder: 'fan-clubs' })
      .set(auth(token))
      .attach('image', PNG, { filename: 'logo.png', contentType: 'image/png' });

    assert.equal(res.status, 201, res.body.message);
    image = res.body.data.image;
    // Relative, so the URL keeps working when the deployment domain changes.
    assert.match(image.url, /^\/api\/v1\/uploads\/[a-f0-9]{24}$/, `unexpected url: ${image.url}`);
    assert.equal(image.provider, 'db');
  });

  it('serves the stored image back to anyone, cached hard', async () => {
    const res = await request(app).get(image.url);
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'image/png');
    assert.match(res.headers['cache-control'], /immutable/);
    assert.ok(Buffer.from(res.body).equals(PNG), 'bytes should come back unchanged');
  });

  it('404s for an image that does not exist', async () => {
    const res = await request(app).get(api('/uploads/64b7f1c2a4d3e2b1a0c9d8e7'));
    assert.equal(res.status, 404);
  });

  it('still rejects a file that is not really an image', async () => {
    const res = await request(app)
      .post(api('/uploads/image'))
      .set(auth(token))
      .attach('image', Buffer.from('<?php echo 1; ?>'), { filename: 'evil.png', contentType: 'image/png' });
    assert.equal(res.status, 400);
  });

  it('accepts the stored image back when a form saves it', async () => {
    const club = await request(app).get(api('/fan-clubs')).query({ limit: 1 });
    const id = club.body.data.items[0]._id;
    const res = await request(app).patch(api(`/fan-clubs/${id}`)).set(auth(token)).send({ logo: image });
    assert.equal(res.status, 200, res.body.message);
  });

  it('requires a signed-in user', async () => {
    const res = await request(app).post(api('/uploads/image')).attach('image', PNG, { filename: 'logo.png', contentType: 'image/png' });
    assert.equal(res.status, 401);
  });
});
