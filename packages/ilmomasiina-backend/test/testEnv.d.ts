import { FastifyInstance } from 'fastify';
import { MockInstance } from 'vitest';

import EmailService from '../src/mail';

/* eslint-disable no-var, vars-on-top */
declare global {
  var server: FastifyInstance;
  var emailSend: MockInstance<Parameters<typeof EmailService['send']>, Promise<void>>;
  var adminUser: {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    password: string;
  };
}
