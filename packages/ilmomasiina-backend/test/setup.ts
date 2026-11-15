import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, RunnerTaskBase, vi } from "vitest";

import type { ErrorCode, ErrorResponse } from "@tietokilta/ilmomasiina-models";
import initApp from "../src/app";
import setupDatabase, { closeDatabase } from "../src/db";
import EmailService from "../src/mail";
import type { InjectResponse } from "./routes/api";
import { testUser } from "./testData";

const needsDb = (suite: RunnerTaskBase) => suite.name.includes("test/routes");
const needsApi = (suite: RunnerTaskBase) => suite.name.includes("test/routes");

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-condition */

// Common setup for all backend test files: initialize the database & Fastify, tear down at test end.
// eslint-disable-next-line no-empty-pattern -- vitest requires a destructured argument
beforeAll(async ({}, suite) => {
  if (needsDb(suite)) {
    global.db = await setupDatabase();
    // Drop the trigger that prevents deleting payments to allow test data to be reset.
    await global.db.execute(sql`DROP TRIGGER IF EXISTS payment_prevent_delete ON payment`);
  } else {
    global.db = undefined as any;
  }
  if (needsApi(suite)) {
    global.server = await initApp();
  } else {
    global.server = undefined as any;
  }
});
afterAll(async () => {
  if (global.server) {
    await global.server.close();
    global.server = undefined as any;
  }
  if (global.db) {
    await closeDatabase();
    global.db = undefined as any;
  }
});

beforeEach(async () => {
  // Ensure deterministic test data.
  faker.seed(133742069);

  if (db) {
    // Delete test data that can conflict between tests. Event truncation cascades to all other event data.
    await db.execute(sql`TRUNCATE "user", "payment", "event", "auditlog" CASCADE`);

    // Create a test user to ensure full functionality.
    global.adminUser = await testUser();

    // Create a token for the admin.
    global.adminToken = server.adminSession.createSession(global.adminUser);
  }
});

// Mock email sending: ensure no actual email is sent and allow checking for calls.
beforeAll(() => {
  global.emailSend = vi.spyOn(EmailService, "send").mockImplementation(async () => {});
});

// Allow silencing console logs
beforeAll(() => {
  global.consoleLog = vi.spyOn(console, "log");
  global.consoleWarn = vi.spyOn(console, "warn");
  global.consoleError = vi.spyOn(console, "error");
});

expect.extend({
  toBeApiError(received: unknown, expectedStatus: number, expectedCode?: ErrorCode) {
    if (!Array.isArray(received) || received.length !== 2) {
      throw new Error("toBeApiError matcher expects an array of [data, response]");
    }
    const [data, response] = received as [ErrorResponse, InjectResponse];
    if (response.statusCode !== expectedStatus) {
      return {
        pass: false,
        message: () => `Expected status code ${expectedStatus}, but received ${response.statusCode}`,
        expected: expectedStatus,
        actual: response.statusCode,
      };
    }
    if (expectedCode && data?.code !== expectedCode) {
      return {
        pass: false,
        message: () => `Expected error code '${expectedCode}', but received '${data?.code}'`,
        expected: expectedCode,
        actual: data?.code,
      };
    }
    return {
      pass: true,
      message: () => "Received expected API error",
    };
  },
});
