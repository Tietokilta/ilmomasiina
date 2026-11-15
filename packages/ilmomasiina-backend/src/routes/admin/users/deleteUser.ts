import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { NotFound } from "http-errors";

import { AuditEvent, ErrorCode, UserPathParams } from "@tietokilta/ilmomasiina-models";
import { getDb } from "../../../db";
import { userTable } from "../../../db/schema";
import CustomError from "../../../util/customError";

class CannotDeleteSelf extends CustomError {
  constructor(message: string) {
    super(403, ErrorCode.CANNOT_DELETE_SELF, message);
  }
}

export default async function deleteUser(
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
    } else if (request.sessionData!.user === existing.id) {
      throw new CannotDeleteSelf("You can't delete your own user");
    } else {
      // Delete user
      await transaction.delete(userTable).where(eq(userTable.id, existing.id));
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
