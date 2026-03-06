import { FastifyReply, FastifyRequest } from "fastify";

import type { SignupID, SignupPathParams } from "@tietokilta/ilmomasiina-models";
import { AuditEvent } from "@tietokilta/ilmomasiina-models";
import { AuditLogger } from "../../auditlog";
import { getSequelize } from "../../models";
import { Event } from "../../models/event";
import { Signup } from "../../models/signup";
import { checkForConflictingPaymentsForSignupUpdate, expireExistingPaymentsForSignupUpdate } from "../payment/stripe";
import { refreshSignupPositions } from "./computeSignupPosition";
import { signupEditable } from "./createNewSignup";
import { NoSuchSignup, SignupsClosed } from "./errors";

/** Requires admin authentication OR editTokenVerification */
async function deleteSignup(id: SignupID, auditLogger: AuditLogger, admin: boolean = false): Promise<void> {
  await expireExistingPaymentsForSignupUpdate(id);

  const event = await getSequelize().transaction(async (transaction) => {
    const signup = await Signup.scope("active").findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (signup === null) {
      throw new NoSuchSignup("No signup found with id");
    }

    // Ensure there are no payments that could be paid with stale data.
    // This needs to also be done for deletion, since we use soft delete and thus aren't
    // firing ON DELETE RESTRICT constraints.
    await checkForConflictingPaymentsForSignupUpdate(signup, transaction, admin);

    signup.quota = await signup.getQuota({
      attributes: ["id"],
      include: [
        {
          model: Event,
          attributes: ["id", "title", "registrationStartDate", "registrationEndDate", "openQuotaSize"],
        },
      ],
      transaction,
    });
    if (!signup.quota || !signup.quota.event) {
      // Quota or event soft deleted
      throw new NoSuchSignup("Signup expired or already deleted");
    }

    if (!admin && !signupEditable(signup.quota!.event!, signup)) {
      throw new SignupsClosed("Signups closed for this event.");
    }

    // Soft delete the signup by setting deletedAt
    await signup.update({ deletedAt: new Date() }, { transaction });

    // Create an audit log event
    await auditLogger(AuditEvent.DELETE_SIGNUP, { signup, transaction });

    return signup.quota!.event!;
  });

  // Advance the queue and send emails to people that were accepted.
  // Do this outside the transaction, as this shouldn't affect the user deleting the signup.
  refreshSignupPositions(event).catch((error) => console.error(error));
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
