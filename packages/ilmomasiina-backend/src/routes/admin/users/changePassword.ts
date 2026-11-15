import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { NotFound } from "http-errors";

import { AuditEvent, ErrorCode, UserChangePasswordSchema } from "@tietokilta/ilmomasiina-models";
import AdminPasswordAuth from "../../../authentication/adminPasswordAuth";
import { getDb } from "../../../db";
import { userTable } from "../../../db/schema";
import CustomError from "../../../util/customError";

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

  await getDb().transaction(async (transaction) => {
    // Try to fetch existing user
    const existing = await transaction.query.user.findFirst({
      where: { id: request.sessionData!.user },
      columns: { id: true, email: true, password: true },
    });

    if (!existing) {
      throw new NotFound("User does not exist");
    } else {
      // Verify old password
      if (!AdminPasswordAuth.verifyHash(request.body.oldPassword, existing.password)) {
        throw new WrongOldPassword("Incorrect password");
      }
      // Update user with a new password
      await transaction
        .update(userTable)
        .set({ password: AdminPasswordAuth.createHash(request.body.newPassword) })
        .where(eq(userTable.id, existing.id));

      await request.logEvent(AuditEvent.CHANGE_PASSWORD, {
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
