import { FastifyReply, FastifyRequest } from "fastify";
import { MethodNotAllowed, NotFound } from "http-errors";

import type { UserPathParams } from "@tietokilta/ilmomasiina-models";
import { AuditEvent } from "@tietokilta/ilmomasiina-models";
import AdminPasswordAuth from "../../../authentication/adminPasswordAuth";
import config from "../../../config";
import EmailService from "../../../mail";
import { getSequelize } from "../../../models";
import { User } from "../../../models/user";
import generatePassword from "./generatePassword";

export default async function resetPassword(
  request: FastifyRequest<{ Params: UserPathParams }>,
  reply: FastifyReply,
): Promise<void> {
  if (!config.enableLocalAuth) throw new MethodNotAllowed("Local auth is disabled");

  await getSequelize().transaction(async (transaction) => {
    // Try to fetch existing user
    const existing = await User.findByPk(request.params.id, {
      attributes: ["id", "email"],
      transaction,
    });

    if (!existing) {
      throw new NotFound("User does not exist");
    } else {
      // Update user with a new password
      const newPassword = generatePassword();
      await existing.update({ password: AdminPasswordAuth.createHash(newPassword) }, { transaction });

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
