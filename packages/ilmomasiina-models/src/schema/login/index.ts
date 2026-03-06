import { Static, Type } from "typebox";

import { password, userEmail } from "../user/attributes";

/** Request body for login. */
export const adminLoginBody = Type.Object({
  email: userEmail,
  password,
});
/** Response schema for a successful login. */
export const adminLoginResponse = Type.Object({
  accessToken: Type.String({
    description: "JWT access token. Used in `Authorization` header to authorize requests.",
  }),
});

/** Request body for login. */
export type AdminLoginBody = Static<typeof adminLoginBody>;
/** Response schema for a successful login. */
export type AdminLoginResponse = Static<typeof adminLoginResponse>;
