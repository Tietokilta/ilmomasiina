import { faker } from '@faker-js/faker';
import {
  afterAll, afterEach, beforeAll, beforeEach, vi,
} from 'vitest';

import initApp from '../src/app';
import EmailService from '../src/mail';
import setupDatabase, { closeDatabase } from '../src/models';
import { testUser } from './testData';

// Common setup for all backend test files: initialize Sequelize & Fastify, tear down at test end.

beforeAll(async () => {
  global.sequelize = await setupDatabase();
  global.server = await initApp();
});
afterAll(async () => {
  await server.close();
  await closeDatabase();
});

beforeEach(async () => {
  // Ensure deterministic test data.
  faker.seed(133742069);

  // Delete test data that can conflict between tests.
  await sequelize.getQueryInterface().bulkDelete('user', {}, { truncate: true, cascade: true } as any);
  // Event truncation cascades to all other event data:
  await sequelize.getQueryInterface().bulkDelete('event', {}, { truncate: true, cascade: true } as any);
  await sequelize.getQueryInterface().bulkDelete('auditlog', {}, { truncate: true, cascade: true } as any);

  // Create a test user to ensure full functionality.
  global.adminUser = await testUser();
});

// Mock email sending: ensure no actual email is sent and allow checking for calls.
beforeAll(() => {
  global.emailSend = vi.spyOn(EmailService, 'send').mockImplementation(async () => {});
});
afterEach(() => {
  emailSend.mockClear();
});
