import { faker } from '@faker-js/faker';
import {
  afterAll,
  afterEach, beforeAll, beforeEach, vi,
} from 'vitest';

import initApp from '../src/app';
import { db } from '../src/drizzle/db';
import { auditlogTable, eventTable, userTable } from '../src/drizzle/schema';
import EmailService from '../src/mail';
import { testUser } from './testData';

// Common setup for all backend test files: initialize Sequelize & Fastify, tear down at test end.
beforeAll(async () => {
  global.server = await initApp();
});
afterAll(async () => {
  await global.server.close();
});
beforeEach(async () => {
  // Ensure deterministic test data.
  faker.seed(133742069);

  // Delete test data that can conflict between tests.
  await db.delete(userTable).execute();
  // Event truncation cascades to all other event data:
  await db.delete(eventTable).execute();
  await db.delete(auditlogTable).execute();

  // Create a test user to ensure full functionality.
  global.adminUser = await testUser();
});

// Mock email sending: ensure no actual email is sent and allow checking for calls.
beforeAll(() => {
  global.emailSend = vi.spyOn(EmailService, 'send').mockImplementation(async () => { });
});
afterEach(() => {
  emailSend.mockClear();
});
