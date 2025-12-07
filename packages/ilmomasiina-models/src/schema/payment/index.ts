import { Static, Type } from "@sinclair/typebox";
import Stripe from "stripe";

import { userEventForSignup } from "../event";
import { signupID } from "../signup";
import { editToken } from "../signup/attributes";
import { signupForEdit } from "../signupForEdit";
import { paymentID, paymentStatus } from "./attributes";

/** Request body for creating a payment. */
export const paymentCreateParams = Type.Object({
  id: signupID,
  editToken,
});
export const paymentPathParams = Type.Object({
  id: signupID,
})

export const paymentSuccessResponse = Type.Object({
  success: Type.Boolean({
    description: "Whether the payment was successful.",
  }),
  paymentID,
  signupID,
  amount: Type.Integer({
    description: "Amount paid in the payment, in cents.",
    minimum: 0,
  }),
  paymentStatus,
});

export type PaymentCreateParams = Static<typeof paymentCreateParams>;
export type PaymentPathParams = Static<typeof paymentPathParams>;
export type PaymentResponse = Stripe.Checkout.Session

export interface SignupPaymentResponse {
  signup: Static<typeof signupForEdit>,
  event: Static<typeof userEventForSignup>,
  payment: PaymentResponse
}
