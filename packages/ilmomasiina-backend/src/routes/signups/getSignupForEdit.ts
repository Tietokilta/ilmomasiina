import { FastifyReply, FastifyRequest } from "fastify";

import { SignupForEditResponse, SignupPathParams } from "@tietokilta/ilmomasiina-models";
import { Answer } from "../../models/answer";
import { Event } from "../../models/event";
import { Payment } from "../../models/payment";
import { Question } from "../../models/question";
import { Quota } from "../../models/quota";
import { Signup } from "../../models/signup";
import { StringifyApi } from "../utils";
import { NoSuchSignup } from "./errors";

/** Requires editTokenVerification */
export default async function getSignupForEdit(
  request: FastifyRequest<{ Params: SignupPathParams }>,
  reply: FastifyReply,
): Promise<SignupForEditResponse> {
  const signup = await Signup.scope("active").findByPk(request.params.id, {
    include: [
      {
        model: Answer,
        required: false,
      },
      {
        model: Quota,
        include: [{ model: Event }],
      },
      {
        model: Payment,
        attributes: ["status"],
        required: false,
      },
    ],
  });
  if (!signup || !signup.quota || !signup.quota.event) {
    // Event not found with id, probably deleted
    throw new NoSuchSignup("Signup expired or already deleted");
  }

  const { event } = signup.quota;

  // Fetch these separately to avoid O(n^3) returned rows.
  event.questions = await Question.findAll({ where: { eventId: event.id }, order: [["order", "ASC"]] });
  event.quotas = await Quota.findAll({ where: { eventId: event.id }, order: [["order", "ASC"]] });

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
      confirmed: signup.confirmed,
      answers: signup.answers!.map((answer) => answer.get({ plain: true })),
      quota: signup.quota!.get({ plain: true }),
      paymentStatus: signup.effectivePaymentStatus,
      confirmableForMillis,
      editableForMillis,
    },
    event: {
      ...event.get({ plain: true }),
      questions: event.questions!.map((question) => question.get({ plain: true })),
      quotas: event.quotas!.map((quota) => quota.get({ plain: true })),
    },
  };

  reply.status(200);

  return response as unknown as StringifyApi<typeof response>;
}
