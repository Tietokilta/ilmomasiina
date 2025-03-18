import { Static, Type } from "@sinclair/typebox";

/** Request body for login. */
export const adminLoginBody = Type.Object({
  provider: Type.String(),
  email: Type.Optional(
    Type.String({
      description: "Email address for local auth.",
    }),
  ),
  password: Type.Optional(
    Type.String({
      description: "Plaintext password for local auth.",
    }),
  ),
  oauthCode: Type.Optional(Type.String()),
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
