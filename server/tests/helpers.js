process.env.NODE_ENV = 'test';
process.env.DISABLE_JOBS = 'true';
process.env.REFRESH_REUSE_GRACE_MS = '0'; // exercise strict reuse detection

import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;

export async function setup() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('srkians-test'));
  const { createApp } = await import('../app.js');
  const { seed, SEED_ACCOUNTS } = await import('../seed/seed.js');
  const seeded = await seed();
  const app = createApp();
  return { app, seeded, accounts: SEED_ACCOUNTS };
}

export async function teardown() {
  await mongoose.disconnect();
  await mongod?.stop();
}

/** Logs in and returns { token, cookie, user }. */
export async function login(app, identifier, password) {
  const res = await request(app).post('/api/v1/auth/login').send({ identifier, password });
  if (res.status !== 200) throw new Error(`login failed for ${identifier}: ${res.status} ${res.body.message}`);
  return { token: res.body.data.accessToken, cookie: res.headers['set-cookie'], user: res.body.data.user };
}

export const auth = (token) => ({ Authorization: `Bearer ${token}` });
