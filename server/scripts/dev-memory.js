/* eslint-disable no-console */
/**
 * Zero-install development mode: starts an in-memory MongoDB (via mongodb-memory-server), seeds
 * it, and boots the API. Data is lost on exit. Use a real MONGO_URI for persistent development.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create({ instance: { dbName: 'srkians' } });
process.env.MONGO_URI = mongod.getUri('srkians');
console.log(`In-memory MongoDB running at ${process.env.MONGO_URI}`);

const { startServer } = await import('../bootstrap.js');
const { seed, SEED_ACCOUNTS } = await import('../seed/seed.js');

await startServer({ mongoUri: process.env.MONGO_URI, onShutdown: () => mongod.stop() });
await seed();
console.log('\nSeeded development accounts:');
for (const a of Object.values(SEED_ACCOUNTS)) console.log(`  ${a.role.padEnd(15)} ${a.email} / ${a.password}`);
