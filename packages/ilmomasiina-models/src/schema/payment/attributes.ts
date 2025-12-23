import { Type } from "@sinclair/typebox";

import { PaymentStatus } from "../../enum";
import { signupID } from "../signup";
import { Nullable } from "../utils";

export const paymentID = Type.String({
  title: "PaymentID",
  description: "Payment ID. Randomly generated alphanumeric string.",
  minLength: 1,
  maxLength: 32,
  pattern: "^[a-z0-9]+$",
});

export const paymentToken = Type.String({
  description: "Token required for altering payment status.",
});

export const paymentSignup = Type.Object({
  signupId: signupID,
  amount: Type.Integer({
    description: "Amount paid in the payment, in cents.",
    minimum: 0,
  }),
});
export const paymentStatus = Nullable(Type.Enum(PaymentStatus), {
  title: "Payment status",
  description: "Status of the payment.",
});

export const dynamicPaymentAttributes = Type.Object({
  createdAt: Type.String({ format: "date-time" }),
  completedAt: Nullable(Type.String({ format: "date-time" })),
});
