import { FastifyReply, FastifyRequest } from "fastify";
import { NotFound } from "http-errors";

import { AuditEvent, ErrorCode, UserPathParams } from "@tietokilta/ilmomasiina-models";
import { getSequelize } from "../../../models";
import { User } from "../../../models/user";
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
  await getSequelize().transaction(async (transaction) => {
    // Try to fetch existing user
    const existing = await User.findByPk(request.params.id, {
      attributes: ["id", "email"],
      transaction,
    });

    if (!existing) {
      throw new NotFound("User does not exist");
    } else if (request.sessionData!.user === existing.id) {
      throw new CannotDeleteSelf("You can't delete your own user");
    } else {
      // Delete user
      await existing.destroy({ transaction });
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
