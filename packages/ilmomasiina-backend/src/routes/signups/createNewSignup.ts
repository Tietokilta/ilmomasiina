import { FastifyReply, FastifyRequest } from "fastify";

import type { SignupCreateBody, SignupCreateResponse } from "@tietokilta/ilmomasiina-models";
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
  // Find the given quota and event.
  const quota = await Quota.findByPk(request.body.quotaId, {
    attributes: [],
    include: [
      {
        model: Event.scope("user"),
        attributes: ["id", "registrationStartDate", "registrationEndDate", "openQuotaSize"],
      },
    ],
  });

  // Do some validation.
  if (!quota || !quota.event) {
    throw new NoSuchQuota("Quota doesn't exist.");
  }

  if (!signupsAllowed(quota.event)) {
    throw new SignupsClosed("Signups closed for this event.");
  }

  // Create the signup.
  const newSignup = await Signup.create({ quotaId: request.body.quotaId });

  // Refresh signup positions. Ignore errors, but wait for this to complete, so that the user
  // gets a status on their signup before it being returned.
  await refreshSignupPositions(quota.event).catch((error) => console.error(error));

  const editToken = generateToken(newSignup.id);

  response.status(201);
  return {
    id: newSignup.id,
    editToken,
  };
}
