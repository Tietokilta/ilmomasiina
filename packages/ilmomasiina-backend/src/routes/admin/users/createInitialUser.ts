/* eslint-disable max-classes-per-file */
import { count } from 'drizzle-orm';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AdminLoginResponse, ErrorCode, UserCreateSchema } from '@tietokilta/ilmomasiina-models';
import AdminAuthSession from '../../../authentication/adminAuthSession';
import AdminPasswordAuth from '../../../authentication/adminPasswordAuth';
import { db, Transaction } from '../../../drizzle/db';
import { userTable } from '../../../drizzle/schema';
import CustomError from '../../../util/customError';
import { createUser } from './inviteUser';

export class InitialSetupNeeded extends CustomError {
  constructor(message: string) {
    super(418, ErrorCode.INITIAL_SETUP_NEEDED, message);
  }
}

export class InitialSetupAlreadyDone extends CustomError {
  constructor(message: string) {
    super(409, ErrorCode.INITIAL_SETUP_ALREADY_DONE, message);
  }
}

export async function isInitialSetupDone(tx?: Transaction) {
  const transaction = tx || db;
  return transaction.select({ count: count() }).from(userTable).execute().then((rows) => rows[0].count > 0);
}

/**
 * Creates a new (admin) user and logs them in
 *
 * Supposed to be used only for initial user creation.
 * For additional users, use {@link inviteUser} instead.
 */
export default function createInitialUser(session: AdminAuthSession) {
  return async function handler(
    this: FastifyInstance<any, any, any, any, any>,
    request: FastifyRequest<{ Body: UserCreateSchema }>,
    reply: FastifyReply,
  ): Promise<AdminLoginResponse> {
    AdminPasswordAuth.validateNewPassword(request.body.password);

    const user = await db.transaction(async (transaction) => {
      if (await isInitialSetupDone(transaction)) {
        throw new InitialSetupAlreadyDone('The initial admin user has already been created.');
      }
      return createUser(request.body, request.logEvent, transaction);
    }, { isolationLevel: 'serializable' });

    const accessToken = session.createSession({ user: user.id, email: user.email });

    // Stop raising errors on requests to event list
    this.initialSetupDone = true;

    reply.status(201);
    return { accessToken };
  };
}
