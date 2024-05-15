import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { NotFound } from 'http-errors';

import { AuditEvent, ErrorCode, UserChangePasswordSchema } from '@tietokilta/ilmomasiina-models';
import AdminPasswordAuth from '../../../authentication/adminPasswordAuth';
import { db } from '../../../drizzle/db';
import { userTable } from '../../../drizzle/schema';
import CustomError from '../../../util/customError';

class WrongOldPassword extends CustomError {
  constructor(message: string) {
    super(401, ErrorCode.WRONG_OLD_PASSWORD, message);
  }
}

export default async function changePassword(
  request: FastifyRequest<{ Body: UserChangePasswordSchema }>,
  reply: FastifyReply,
): Promise<void> {
  AdminPasswordAuth.validateNewPassword(request.body.newPassword);

  await db.transaction(async (db) => {
    // Try to fetch existing user
    const existing = await db.select().from(userTable).where(eq(userTable.id, request.sessionData.user)).then((rows) => (rows.length > 0 ? rows[0] : 0));

    if (!existing) {
      throw new NotFound('User does not exist');
    } else {
      // Verify old password
      if (!AdminPasswordAuth.verifyHash(request.body.oldPassword, existing.password)) {
        throw new WrongOldPassword('Incorrect password');
      }
      // Update user with a new password
      await db.update(
        userTable,
      ).set({ password: AdminPasswordAuth.createHash(request.body.newPassword) }).where(eq(userTable.id, existing.id)).execute();

      await request.logEvent(AuditEvent.CHANGE_PASSWORD, {
        extra: {
          id: existing.id,
          email: existing.email,
        },
      });
    }
  }, { isolationLevel: 'serializable' });

  reply.status(204);
}
