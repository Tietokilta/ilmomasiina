import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { NotFound } from 'http-errors';

import { AuditEvent, ErrorCode, UserPathParams } from '@tietokilta/ilmomasiina-models';
import { db } from '../../../drizzle/db';
import { userTable } from '../../../drizzle/schema';
import CustomError from '../../../util/customError';

class CannotDeleteSelf extends CustomError {
  constructor(message: string) {
    super(403, ErrorCode.CANNOT_DELETE_SELF, message);
  }
}

export default async function deleteUser(
  request: FastifyRequest<{ Params: UserPathParams }>,
  reply: FastifyReply,
): Promise<void> {
  await db.transaction(async (transaction) => {
    // Try to fetch existing user
    const existing = await db.select({ id: userTable.id, email: userTable.email }).from(userTable).where(eq(userTable.id, request.params.id)).then((rows) => rows[0]);

    if (!existing) {
      throw new NotFound('User does not exist');
    } else if (request.sessionData.user === existing.id) {
      throw new CannotDeleteSelf('You can\'t delete your own user');
    } else {
      // Delete user
      await transaction.delete(userTable).where(eq(userTable.id, existing.id)).execute();
      await request.logEvent(AuditEvent.DELETE_USER, {
        extra: {
          id: existing.id,
          email: existing.email,
        },
        transaction,
      });
    }
  });

  reply.status(204);
}
