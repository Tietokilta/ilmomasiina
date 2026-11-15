import { FastifyReply, FastifyRequest } from "fastify";

import { AuditEvent, type SignupCreateBody, type SignupCreateResponse } from "@tietokilta/ilmomasiina-models";
import { getDb } from "../../db";
import { signupTable } from "../../db/schema";
import { Event, userEventFilter } from "../../models/event";
import { editableAtLeastUntil, Signup } from "../../models/signup";
import { refreshSignupPositions } from "./computeSignupPosition";
import { generateToken } from "./editTokens";
import { NoSuchQuota, SignupsClosed } from "./errors";

/** Checks whether signups can still be created. */
export const signupsAllowed = (event: Pick<Event, "registrationStartDate" | "registrationEndDate">) => {
  if (event.registrationStartDate === null || event.registrationEndDate === null) {
    return false;
  }

  const now = new Date();
  return now >= event.registrationStartDate && now <= event.registrationEndDate;
};

/** Checks whether a signup is still editable. */
export const signupEditable = (
  event: Pick<Event, "registrationStartDate" | "registrationEndDate">,
  signup: Pick<Signup, "createdAt">,
) => signupsAllowed(event) || new Date() <= editableAtLeastUntil(signup);

export default async function createSignup(
  request: FastifyRequest<{ Body: SignupCreateBody }>,
  response: FastifyReply,
): Promise<SignupCreateResponse> {
  const { newSignup, event } = await getDb().transaction(async (transaction) => {
    // Find the given quota and event.
    const quota = await transaction.query.quota.findFirst({
      where: { id: request.body.quotaId, deletedAt: { isNull: true }, event: userEventFilter() },
      columns: { id: true },
      with: {
        event: {
          columns: { id: true, title: true, registrationStartDate: true, registrationEndDate: true },
        },
      },
    });

    // Do some validation.
    if (!quota || !quota.event) {
      throw new NoSuchQuota("Quota doesn't exist.");
    }

    if (!signupsAllowed(quota.event)) {
      throw new SignupsClosed("Signups closed for this event.");
    }

    // Create the signup.
    const [signup] = await transaction.insert(signupTable).values({ quotaId: quota.id }).returning();

    // Create an audit log event
    await request.logEvent(AuditEvent.CREATE_SIGNUP, { signup, event: quota.event, transaction });

    return { newSignup: signup, event: quota.event };
  });

  // Refresh signup positions. Ignore errors, but wait for this to complete, so that the user
  // gets a status on their signup before it being returned.
  await refreshSignupPositions(event).catch((error: unknown) => console.error(error));

  const editToken = generateToken(newSignup.id);

  response.status(201);
  return {
    id: newSignup.id,
    editToken,
  };
}
