import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { NotFound } from 'http-errors';

import type { UserPathParams } from '@tietokilta/ilmomasiina-models';
import { AuditEvent } from '@tietokilta/ilmomasiina-models';
import AdminPasswordAuth from '../../../authentication/adminPasswordAuth';
import { db } from '../../../drizzle/db';
import { userTable } from '../../../drizzle/schema';
import EmailService from '../../../mail';
import generatePassword from './generatePassword';

export default async function resetPassword(
  request: FastifyRequest<{ Params: UserPathParams }>,
  reply: FastifyReply,
): Promise<void> {
  await db.transaction(async (tx) => {
    // Try to fetch existing user
    const existing = await tx.select({ id: userTable.id, email: userTable.email }).from(userTable).where(eq(userTable.id, request.params.id)).execute()
      .then((res) => (res.length > 0 ? res[0] : null));

    if (!existing) {
      throw new NotFound('User does not exist');
    } else {
      // Update user with a new password
      const newPassword = generatePassword();
      await tx.update(userTable).set({ password: AdminPasswordAuth.createHash(newPassword) }).where(eq(userTable.id, existing.id)).execute();

      await request.logEvent(AuditEvent.RESET_PASSWORD, {
        extra: {
          id: existing.id,
          email: existing.email,
        },
        transaction: tx,
      });

      await EmailService.sendResetPasswordMail(existing.email, null, {
        email: existing.email,
        password: newPassword,
      });
    }
  });

  reply.status(204);
}
