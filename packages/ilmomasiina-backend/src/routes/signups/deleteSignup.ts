import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";

import type { SignupID, SignupPathParams } from "@tietokilta/ilmomasiina-models";
import { AuditEvent } from "@tietokilta/ilmomasiina-models";
import { AuditLogger } from "../../auditlog";
import { getDb } from "../../db";
import { signupTable } from "../../db/schema";
import { activeSignupCondition, Signup } from "../../models/signup";
import { checkForConflictingPaymentsForSignupUpdate, expireExistingPaymentsForSignupUpdate } from "../payment/stripe";
import { refreshSignupPositions } from "./computeSignupPosition";
import { signupEditable } from "./createNewSignup";
import { NoSuchSignup, SignupsClosed } from "./errors";

/** Requires admin authentication OR editTokenVerification */
async function deleteSignup(id: SignupID, auditLogger: AuditLogger, admin = false): Promise<void> {
  await expireExistingPaymentsForSignupUpdate(id);

  const event = await getDb().transaction(async (transaction) => {
    const [signup] = await transaction
      .select()
      .from(signupTable)
      .where(and(eq(signupTable.id, id), activeSignupCondition()))
      .for("update");
    if (!(signup as Signup | undefined)) {
      throw new NoSuchSignup("No signup found with id");
    }

    // Ensure there are no payments that could be paid with stale data.
    // This needs to also be done for deletion, since we use soft delete and thus aren't
    // firing ON DELETE RESTRICT constraints.
    await checkForConflictingPaymentsForSignupUpdate(signup, transaction, admin);

    const quota = await transaction.query.quota.findFirst({
      where: { id: signup.quotaId, deletedAt: { isNull: true } },
      columns: { id: true },
      with: {
        event: {
          columns: { id: true, title: true, registrationStartDate: true, registrationEndDate: true },
        },
      },
    });
    if (!quota || !quota.event) {
      // Quota or event soft deleted
      throw new NoSuchSignup("Signup expired or already deleted");
    }

    if (!admin && !signupEditable(quota.event, signup)) {
      throw new SignupsClosed("Signups closed for this event.");
    }

    // Soft delete the signup by setting deletedAt
    await transaction.update(signupTable).set({ deletedAt: new Date() }).where(eq(signupTable.id, signup.id));

    // Create an audit log event
    await auditLogger(AuditEvent.DELETE_SIGNUP, { signup, event: quota.event, transaction });

    return quota.event;
  });

  // Advance the queue and send emails to people that were accepted.
  // Do this outside the transaction, as this shouldn't affect the user deleting the signup.
  refreshSignupPositions(event).catch((error: unknown) => console.error(error));
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
