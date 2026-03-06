import { Type } from "typebox";

export const userID = Type.Integer({
  title: "UserID",
});

/** Non-editable identity attributes of a user. */
export const userIdentity = Type.Object({
  id: userID,
});

/** Email address of a user, used as username. */
export const userEmail = Type.String({
  format: "email",
  description: "Email address, used as username.",
  minLength: 1,
  maxLength: 255,
});

/** Current password of a user. */
export const password = Type.String({
  minLength: 1,
  maxLength: 255,
});

/** Creation attributes of a user. */
export const userAttributes = Type.Object({
  email: userEmail,
});
