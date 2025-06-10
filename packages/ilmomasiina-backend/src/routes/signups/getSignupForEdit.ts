import { FastifyReply, FastifyRequest } from "fastify";

import type { EventID, SignupForEditResponse, SignupPathParams } from "@tietokilta/ilmomasiina-models";
import { eventGetEventAttrs, eventGetQuestionAttrs } from "@tietokilta/ilmomasiina-models/dist/attrs/event";
import { Answer } from "../../models/answer";
import { Event } from "../../models/event";
import { Question } from "../../models/question";
import { Quota } from "../../models/quota";
import { Signup } from "../../models/signup";
import createCache from "../../util/cache";
import { StringifyApi } from "../utils";
import { NoSuchSignup } from "./errors";

/** Fetches event information for the signup GET endpoint.
 *
 * This only returns information that does not change without admin intervention.
 */
export const eventDetailsForEditSignupCached = createCache({
  maxAgeMs: 5000,
  maxPendingAgeMs: 5000,
  logName: "eventDetailsForEditSignupCached",
  async get(eventId: EventID) {
    const event = await Event.scope("user").findByPk(eventId, {
      attributes: eventGetEventAttrs,
      include: {
        model: Question,
        attributes: eventGetQuestionAttrs,
      },
      order: [[Question, "order", "ASC"]],
    });

    if (event === null) {
      throw new NoSuchSignup("No signup found with given id");
    }

    return {
      ...event.get({ plain: true }),
      questions: event.questions!.map((question) => question.get({ plain: true })),
    };
  },
});

/** Requires editTokenVerification */
export default async function getSignupForEdit(
  request: FastifyRequest<{ Params: SignupPathParams }>,
  reply: FastifyReply,
): Promise<SignupForEditResponse> {
  // First, fetch the signup and answers. This is fast, since signups are not locked.
  const signup = await Signup.scope("active").findByPk(request.params.id, {
    include: [
      {
        model: Answer,
        required: false,
      },
      {
        model: Quota,
        required: true,
      },
    ],
  });
  if (signup === null) {
    // Event not found with id, probably deleted
    throw new NoSuchSignup("No signup found with given id");
  }

  // Then, fetch the event, potentially with cache.
  const event = await eventDetailsForEditSignupCached(signup.quota!.eventId);

  // Determine how long the signup can be edited for.
  let editableForMillis = 0;
  const now = Date.now();
  if (event.registrationEndDate != null) {
    editableForMillis = Math.max(
      0,
      event.registrationEndDate.getTime() - now,
      signup.editableAtLeastUntil.getTime() - now,
    );
  }
  const confirmableForMillis = signup.confirmedAt ? 0 : Math.max(0, signup.confirmableUntil.getTime() - now);

  const response = {
    signup: {
      ...signup.get({ plain: true }),
      confirmed: Boolean(signup.confirmedAt),
      status: signup.status,
      answers: signup.answers!,
      quota: signup.quota!,
      confirmableForMillis,
      editableForMillis,
    },
    event,
  };

  reply.status(200);

  return response as unknown as StringifyApi<typeof response>;
}
