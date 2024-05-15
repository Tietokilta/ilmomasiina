import { FastifyInstance } from 'fastify';

import type { AuditEvent } from '@tietokilta/ilmomasiina-models';
import { db, Transaction } from '../drizzle/db';
import { auditlogTable } from '../drizzle/schema';

/**
 * Creates an {@link AuditLogger}
 *
 * @param ipAddress related ip address
 * @param user a function returning username (email), executed when events are logged
 */
function eventLogger(ipAddress: string, user?: () => (string | null)) {
  return async (
    action: AuditEvent,
    {
      event, signup, extra, transaction,
    }: {
      event?: { id: string, title: string },
      signup?: { id: string, firstName: string | null, lastName: string | null },
      extra?: object,
      transaction?: Transaction,
    },
  ) => {
    (transaction ?? db).insert(auditlogTable).values({
      user: user ? user() : null,
      action,
      eventId: event?.id || null,
      eventName: event?.title || null,
      signupId: signup?.id || null,
      signupName: signup ? `${signup.firstName} ${signup.lastName}` : null,
      extra: extra ? JSON.stringify(extra) : null,
      ipAddress,
    }).execute();
  };
}

/**
 * Couples audit event logging with FastifyRequest
 *
 * Decorates each request object with a `logEvent` method.
 * Using this method, user and ip address information will be automatically inferred into audit log event.
 */
export function addLogEventHook(fastify: FastifyInstance): void {
  fastify.decorateRequest('logEvent', () => { throw new Error('Not initialized'); });
  fastify.addHook('onRequest', async (req) => {
    (req.logEvent as AuditLogger) = eventLogger(req.ip, () => req.sessionData?.email || null);
  });
}

/** Use to log internally triggered actions to the audit log (actions run by cron jobs for example) */
export const internalAuditLogger = eventLogger('internal');

export type AuditLogger = ReturnType<typeof eventLogger>;

declare module 'fastify' {
  interface FastifyRequest {
    readonly logEvent: AuditLogger,
  }
}
