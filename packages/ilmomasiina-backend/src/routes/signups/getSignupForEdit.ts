import { FastifyReply, FastifyRequest } from "fastify";
import { omit } from "lodash";

import { SignupForEditResponse, SignupPathParams } from "@tietokilta/ilmomasiina-models";
import { getDb } from "../../db";
import {
  activeSignupFilter,
  confirmableUntil,
  editableAtLeastUntil,
  effectivePaymentStatus,
  isConfirmed,
} from "../../models/signup";
import { StringifyApi } from "../utils";
import { NoSuchSignup } from "./errors";

/** Requires editTokenVerification */
export default async function getSignupForEdit(
  request: FastifyRequest<{ Params: SignupPathParams }>,
  reply: FastifyReply,
): Promise<SignupForEditResponse> {
  const db = getDb();
  const found = await db.query.signup.findFirst({
    where: { AND: [activeSignupFilter(), { id: request.params.id }] },
    with: {
      answers: true,
      quota: { with: { event: true } },
      payments: { columns: { status: true } },
    },
  });
  const event = found?.quota?.event;
  if (!found || !found.quota || !event) {
    // Event not found with id, probably deleted
    throw new NoSuchSignup("Signup expired or already deleted");
  }

  const { answers, payments, quota: quotaWithEvent, ...signup } = found;
  const quota = omit(quotaWithEvent, "event");

  // Fetch these separately to avoid O(n^3) returned rows.
  const [questions, quotas] = await Promise.all([
    db.query.question.findMany({
      where: { eventId: event.id, deletedAt: { isNull: true } },
      orderBy: { order: "asc" },
    }),
    db.query.quota.findMany({
      where: { eventId: event.id, deletedAt: { isNull: true } },
      orderBy: { order: "asc" },
    }),
  ]);

  // Determine how long the signup can be edited for.
  let editableForMillis = 0;
  const now = Date.now();
  if (event.registrationEndDate != null) {
    editableForMillis = Math.max(
      0,
      event.registrationEndDate.getTime() - now,
      editableAtLeastUntil(signup).getTime() - now,
    );
  }
  const confirmableForMillis = signup.confirmedAt ? 0 : Math.max(0, confirmableUntil(signup).getTime() - now);

  const response = {
    signup: {
      ...signup,
      confirmed: isConfirmed(signup),
      answers,
      quota,
      paymentStatus: effectivePaymentStatus(signup, payments),
      confirmableForMillis,
      editableForMillis,
    },
    event: { ...event, questions, quotas },
  };

  reply.status(200);

  return response as unknown as StringifyApi<typeof response>;
}
