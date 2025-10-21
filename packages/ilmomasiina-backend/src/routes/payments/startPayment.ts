import { FastifyReply, FastifyRequest } from "fastify";

// import Stripe from 'stripe';
import { PaymentPathParams, PaymentStatus, PaymentSuccessResponse } from "@tietokilta/ilmomasiina-models";
import { Answer } from "../../models/answer";
import { Event } from "../../models/event";
import { Quota } from "../../models/quota";
import { Signup } from "../../models/signup";
import { NoSuchSignup } from "../signups/errors";
import { StringifyApi } from "../utils";

export default async function startPayment(
  request: FastifyRequest<{ Params: PaymentPathParams }>,
  reply: FastifyReply,
): Promise<PaymentSuccessResponse> {

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
    ],
  });
  if (signup === null) {
    // Event not found with id, probably deleted
    throw new NoSuchSignup("No signup found with given id");
  }

  const amount = signup.quota!.price;
  const response = {
    success: true,
    paymentID: "testi-payment-id",
    signupID: signup.id,
    amount,
    paymentStatus: PaymentStatus.DISABLED,
  };
  reply.status(200);
  return response as unknown as StringifyApi<typeof response>;

}
