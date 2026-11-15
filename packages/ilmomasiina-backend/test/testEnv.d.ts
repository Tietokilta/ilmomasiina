import { FastifyInstance } from "fastify";
import { Mock } from "vitest";

import type { Db } from "../src/db";
import EmailService from "../src/mail";
import type { User } from "../src/models/user";

declare global {
  /* eslint-disable vars-on-top -- declare global needs these to be var, not let */
  var server: FastifyInstance;
  var db: Db;
  var emailSend: Mock<(typeof EmailService)["send"]>;
  var consoleLog: Mock<typeof console.log>;
  var consoleWarn: Mock<typeof console.warn>;
  var consoleError: Mock<typeof console.error>;
  var adminUser: User;
  var adminToken: string;
}

// expect.extend() matchers defined in setup.ts
interface CustomMatchers<R = unknown> {
  /**
   * Checks if the result is an API error with the expected status and optional code,
   * as returned by the wrapper functions in `api.ts`.
   */
  toBeApiError: (expectedStatus: number, expectedCode?: string) => R;
}

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
