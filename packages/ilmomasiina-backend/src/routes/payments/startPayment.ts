import { FastifyReply, FastifyRequest } from "fastify";
import Stripe from "stripe";

import { PaymentPathParams, SignupPaymentResponse } from "@tietokilta/ilmomasiina-models";
import { getSignupDetails } from "../utils";

export default async function startPayment(
  request: FastifyRequest<{ Params: PaymentPathParams }>,
  reply: FastifyReply,
): Promise<SignupPaymentResponse> {

  const { signup, event } = await getSignupDetails(request.params.id);

  const stripe = new Stripe(process.env.STRIPE_API_KEY ?? "");
  const amount = signup.quota!.price;
  const session = await stripe.checkout.sessions.create(
    {
    line_items: [
      {
        price_data: {
          currency: "EUR",
          product_data: {
            name: `${signup.firstName} ${signup.lastName} `,
            description: `${event?.title}\n
            ${signup.firstName} ${signup.lastName}\n
            ${signup.quota?.price}\n
            ${signup.email}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: "https://www.tietokilta.fi/fi",
    cancel_url: "https://www.tietokilta.fi/en",
  });

  const response: SignupPaymentResponse = {
    signup,
    event,
    payment: session,
  }
  console.log("Requested")

  reply.status(200);
  return response;

}
