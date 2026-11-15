import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { NotFound } from "http-errors";

import type { UserPathParams } from "@tietokilta/ilmomasiina-models";
import { AuditEvent } from "@tietokilta/ilmomasiina-models";
import AdminPasswordAuth from "../../../authentication/adminPasswordAuth";
import { getDb } from "../../../db";
import { userTable } from "../../../db/schema";
import EmailService from "../../../mail";
import generatePassword from "./generatePassword";

export default async function resetPassword(
  request: FastifyRequest<{ Params: UserPathParams }>,
  reply: FastifyReply,
): Promise<void> {
  await getDb().transaction(async (transaction) => {
    // Try to fetch existing user
    const existing = await transaction.query.user.findFirst({
      where: { id: request.params.id },
      columns: { id: true, email: true },
    });

    if (!existing) {
      throw new NotFound("User does not exist");
    } else {
      // Update user with a new password
      const newPassword = generatePassword();
      await transaction
        .update(userTable)
        .set({ password: AdminPasswordAuth.createHash(newPassword) })
        .where(eq(userTable.id, existing.id));

      await request.logEvent(AuditEvent.RESET_PASSWORD, {
        extra: {
          id: existing.id,
          email: existing.email,
        },
        transaction,
      });

      await EmailService.sendResetPasswordMail(existing.email, null, {
        email: existing.email,
        password: newPassword,
      });
    }
  });

  reply.status(204);
}
