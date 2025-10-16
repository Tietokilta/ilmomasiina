import { Type } from "@sinclair/typebox";

import { PaymentStatus } from "../../enum";
import { signupID } from "../signup/attributes";
import { Nullable } from "../utils";

export const paymentID = Type.String({
  title: "PaymentID",
  description: "Payment ID. Randomly generated alphanumeric string.",
  minLength: 1,
  maxLength: 32,
  pattern: "^[a-z0-9]+$",
});

export const paymentSignup = Type.Object({
  signupId: signupID,
  amount: Type.Integer({
    description: "Amount paid in the payment, in cents.",
    minimum: 0,
  }),
})

export const dynamicPaymentAttributes = Type.Object({
  startedAt: Type.String({ format: "date-time" }),
  completedAt: Type.String({ format: "date-time" }),
  status: Nullable(Type.Enum(PaymentStatus), {
    title: "Payment status",
    description: "Status of the payment.",
  }),
});
