import { Static, Type } from "@sinclair/typebox";
import Stripe from "stripe";

import { userEventForSignup } from "../event";
import { signupID } from "../signup";
import { editToken } from "../signup/attributes";
import { signupForEdit } from "../signupForEdit";

/** Request body for creating a payment. */
export const paymentCreateParams = Type.Object({
  id: signupID,
  editToken,
});
export const paymentPathParams = Type.Object({
  id: signupID,
});

export type PaymentCreateParams = Static<typeof paymentCreateParams>;
export type PaymentPathParams = Static<typeof paymentPathParams>;
export type PaymentResponse = Stripe.Checkout.Session;

export const signupPaymentResponse = Type.Object({
  signup: signupForEdit,
  event: userEventForSignup,
  payment: Type.Unknown(),
});

export interface SignupPaymentResponse {
  signup: Static<typeof signupForEdit>;
  event: Static<typeof userEventForSignup>;
  payment: PaymentResponse;
}
