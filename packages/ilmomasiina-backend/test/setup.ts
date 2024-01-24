import { afterAll, beforeAll } from 'vitest';

import initApp from '../src/app';
import setupDatabase, { closeDatabase } from '../src/models';

// Common setup for all backend test files: initialize Sequelize & Fastify, tear down at test end.

beforeAll(async () => {
  global.sequelize = await setupDatabase();
  global.server = await initApp();
});
afterAll(async () => {
  await server.close();
  await closeDatabase();
});
