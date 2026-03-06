import { Static, Type } from "typebox";

/** Response schema for starting a payment. */
export const startPaymentResponse = Type.Object({
  paymentUrl: Type.String({
    format: "uri",
    description: "The URL where the user can complete the payment.",
  }),
});

/** Response schema for starting a payment. */
export type StartPaymentResponse = Static<typeof startPaymentResponse>;
