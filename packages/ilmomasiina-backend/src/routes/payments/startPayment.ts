import { FastifyReply, FastifyRequest } from "fastify";
import Stripe from "stripe";

import { PaymentPathParams, PaymentStatus, SignupPaymentResponse } from "@tietokilta/ilmomasiina-models";
import { getSignupDetails } from "../utils";
import { Payment } from "../../models/payment";

export default async function startPayment(
  request: FastifyRequest<{ Params: PaymentPathParams }>,
  reply: FastifyReply,
): Promise<SignupPaymentResponse> {

  const { signup, event } = await getSignupDetails(request.params.id);
  const editToken = request.headers["x-edit-token"] as string | undefined;

  const stripe = new Stripe(process.env.STRIPE_API_KEY ?? "");
  const amount = signup.price;
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "EUR",
          product_data: {
            name: `${event?.title} ${signup.firstName} ${signup.lastName} `,
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
    success_url: `${process.env.BASE_URL}/payment/success/${signup.id}/${editToken}?success=true`,
    cancel_url: `${process.env.BASE_URL}/payment/failure/${signup.id}/${editToken}?success=false`,
  });
  await Payment.create({
    stripeId: session.id,
    signupId: signup.id,
    editToken: editToken ?? "",
    status: PaymentStatus.PENDING,
    expiresAt: new Date(session.expires_at),
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
