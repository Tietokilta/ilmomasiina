import { and, eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

import type { SignupPathParams } from '@tietokilta/ilmomasiina-models';
import { AuditEvent } from '@tietokilta/ilmomasiina-models';
import { AuditLogger } from '../../auditlog';
import { db } from '../../drizzle/db';
import { SIGNUP_IS_ACTIVE } from '../../drizzle/helpers';
import { signupTable } from '../../drizzle/schema';
import { refreshSignupPositions } from './computeSignupPosition';
import { signupsAllowed } from './createNewSignup';
import { NoSuchSignup, SignupsClosed } from './errors';

/** Requires admin authentication OR editTokenVerification */
async function deleteSignup(id: string, auditLogger: AuditLogger, admin: boolean = false): Promise<void> {
  await db.transaction(async (db) => {
    const signup = await db.query.signupTable.findFirst({
      where: and(SIGNUP_IS_ACTIVE, eq(signupTable.id, id)),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
      },
      with: {
        quota: {
          columns: {
            id: true,
          },
          with: {
            event: {
              columns: {
                id: true,
                registrationStartDate: true,
                registrationEndDate: true,
                openQuotaSize: true,
                title: true,
                date: true,
                location: true,
              },
            },
          },
        },
      },
    });
    if (!signup) {
      throw new NoSuchSignup('No signup found with id');
    }
    if (!admin && !signupsAllowed(signup.quota.event)) {
      throw new SignupsClosed('Signups closed for this event.');
    }

    // Delete the DB object
    await db.delete(signupTable).where(eq(signupTable.id, signup.id)).execute();

    // Advance the queue and send emails to people that were accepted
    await refreshSignupPositions(signup.quota.event);

    // Create an audit log event
    await auditLogger(AuditEvent.DELETE_SIGNUP, { signup, transaction: db });
  });
}

/** Requires admin authentication */
export async function deleteSignupAsAdmin(
  request: FastifyRequest<{ Params: SignupPathParams }>,
  reply: FastifyReply,
): Promise<void> {
  await deleteSignup(request.params.id, request.logEvent, true);
  reply.status(204);
}

/** Requires editTokenVerification */
export async function deleteSignupAsUser(
  request: FastifyRequest<{ Params: SignupPathParams }>,
  reply: FastifyReply,
): Promise<void> {
  await deleteSignup(request.params.id, request.logEvent);
  reply.status(204);
}
