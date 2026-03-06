import { FastifyReply, FastifyRequest } from "fastify";

import { PaymentStatus, SignupForEditResponse, SignupPathParams } from "@tietokilta/ilmomasiina-models";
import { Payment } from "../../models/payment";
import getSignupForEdit from "../signups/getSignupForEdit";
import { PaymentNotComplete, PaymentNotFound } from "./errors";
import { refreshCheckoutSession } from "./stripe";

/** Requires editTokenVerification */
export default async function completePayment(
  request: FastifyRequest<{ Params: SignupPathParams }>,
  reply: FastifyReply,
): Promise<SignupForEditResponse> {
  const payment = await Payment.scope("active").findOne({
    where: { signupId: request.params.id },
  });
  if (!payment) {
    throw new PaymentNotFound("No active payment found for signup");
  }

  // If there's an active payment in PENDING state, refresh its status from Stripe.
  if (payment.status === PaymentStatus.PENDING) {
    const session = await refreshCheckoutSession(payment);
    if (session.status !== "complete") {
      throw new PaymentNotComplete("Payment session is not complete");
    }
  }

  // Delegate to getSignupForEdit to return the updated signup info.
  return getSignupForEdit(request, reply);
}
