import { Type } from "@sinclair/typebox";

import { signupID } from "../signup";

const paymentCreateBody = Type.Object({
  signupId: signupID,
});

/** Request body for creating a payment. */
export default paymentCreateBody;
