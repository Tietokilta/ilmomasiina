import { FastifyInstance } from "fastify";
import { Sequelize } from "sequelize";
import { Mock } from "vitest";

import EmailService from "../src/mail";
import { User } from "../src/models/user";

/* eslint-disable no-var, vars-on-top */
declare global {
  var server: FastifyInstance;
  var sequelize: Sequelize;
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
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
