import debug from "debug";
import { FastifyReply, FastifyRequest } from "fastify";
import { Transaction } from "sequelize";

import { AuditEvent, SignupCreateBody, SignupCreateResponse } from "@tietokilta/ilmomasiina-models";
import { getSequelize } from "../../models";
import { Event } from "../../models/event";
import { Quota } from "../../models/quota";
import { Signup } from "../../models/signup";
import { refreshSignupPositions } from "./computeSignupPosition";
import { generateToken } from "./editTokens";
import { NoSuchQuota, SignupsClosed } from "./errors";

const perfLog = debug("app:perf:signups");

/** Checks whether signups can still be created. */
export const signupsAllowed = (event: Event) => {
  if (event.registrationStartDate === null || event.registrationEndDate === null) {
    return false;
  }

  const now = new Date();
  return now >= event.registrationStartDate && now <= event.registrationEndDate;
};

/** Checks whether a signup is still editable. */
export const signupEditable = (event: Event, signup: Signup) =>
  signupsAllowed(event) || new Date() <= signup.editableAtLeastUntil;

export default async function createSignup(
  request: FastifyRequest<{ Body: SignupCreateBody }>,
  response: FastifyReply,
): Promise<SignupCreateResponse> {
  const { newSignup, event } = await getSequelize().transaction(async (transaction) => {
    // Get a shared lock to ensure uncommitted signups never exist during computeSignupPositions,
    // which could bump other signups to the queue.
    // On Postgres, use pg_advisory_xact_lock_shared to only affect necessary queries.
    // On MySQL, there are only session-level locks, which are a pain with transactions;
    // use a lock on the event row - this will have a performance impact, but we're phasing
    // out MySQL support anyway.
    const lock = getSequelize().getDialect() === "postgres" ? undefined : Transaction.LOCK.SHARE;

    if (lock) perfLog(`${request.id}: Acquiring lock on quota ${request.body.quotaId} for signup creation`);

    // Find the given quota and event.
    const quota = await Quota.findByPk(request.body.quotaId, {
      attributes: [],
      include: [
        {
          model: Event.scope("user"),
          required: true,
          attributes: ["id", "registrationStartDate", "registrationEndDate", "openQuotaSize"],
        },
      ],
      transaction,
      lock,
    });

    // Do some validation.
    if (!quota || !quota.event) {
      throw new NoSuchQuota("Quota doesn't exist.");
    }

    if (!signupsAllowed(quota.event)) {
      throw new SignupsClosed("Signups closed for this event.");
    }

    // Lock for Postgres now that we know the event ID.
    if (!lock) {
      perfLog(`${request.id}: Acquiring advisory lock on event ${quota.event.id} for signup creation`);
      await getSequelize().query(`SELECT pg_advisory_xact_lock_shared(hashtext(:lockId))`, {
        // Name must match computeSignupPosition.ts
        replacements: { lockId: `ilmo-csp-${quota.event.id}` },
        transaction,
      });
    }

    // Create the signup.
    const signup = await Signup.create({ quotaId: request.body.quotaId }, { transaction });

    // Create an audit log event
    await request.logEvent(AuditEvent.CREATE_SIGNUP, { signup, transaction });

    return { newSignup: signup, event: quota.event };
  });

  perfLog(`${request.id}: Created signup ${newSignup.id}, refreshing positions`);

  // Refresh signup positions. Ignore errors, but wait for this to complete, so that the user
  // gets a status on their signup before it being returned.
  await refreshSignupPositions(event).catch((error) => console.error(error));

  const editToken = generateToken(newSignup.id);

  response.status(201);
  return {
    id: newSignup.id,
    editToken,
  };
}
