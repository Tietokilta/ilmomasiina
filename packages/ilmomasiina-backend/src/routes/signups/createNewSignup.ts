import { FastifyReply, FastifyRequest } from "fastify";

import { AuditEvent, type SignupCreateBody, type SignupCreateResponse } from "@tietokilta/ilmomasiina-models";
import { getSequelize } from "../../models";
import { Event } from "../../models/event";
import { Quota } from "../../models/quota";
import { Signup } from "../../models/signup";
import { refreshSignupPositions } from "./computeSignupPosition";
import { generateToken } from "./editTokens";
import { NoSuchQuota, SignupsClosed } from "./errors";

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
    // Find the given quota and event.
    const quota = await Quota.findByPk(request.body.quotaId, {
      attributes: [],
      include: [
        {
          model: Event.scope("user"),
          attributes: ["id", "title", "registrationStartDate", "registrationEndDate", "openQuotaSize"],
        },
      ],
      transaction,
    });

    // Do some validation.
    if (!quota || !quota.event) {
      throw new NoSuchQuota("Quota doesn't exist.");
    }

    if (!signupsAllowed(quota.event)) {
      throw new SignupsClosed("Signups closed for this event.");
    }

    // Create the signup.
    const signup = await Signup.create({ quotaId: request.body.quotaId }, { transaction });

    // Create an audit log event
    await request.logEvent(AuditEvent.CREATE_SIGNUP, { signup, event: quota.event, transaction });

    return { newSignup: signup, event: quota.event };
  });

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
