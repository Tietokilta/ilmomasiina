import { FastifyInstance } from "fastify";
import { Sequelize } from "sequelize";
import { MockInstance } from "vitest";

import EmailService from "../src/mail";
import { User } from "../src/models/user";

/* eslint-disable no-var, vars-on-top */
declare global {
  var server: FastifyInstance;
  var sequelize: Sequelize;
  var emailSend: MockInstance<Parameters<(typeof EmailService)["send"]>, Promise<void>>;
  var adminUser: User;
  var adminToken: string;
}
