import { Static, Type } from "typebox";

import { userEventForSignup } from "../event";
import { quota } from "../quota";
import { ownerDynamicSignupAttributes, ownerEditableSignupAttributes, signupIdentity } from "../signup/attributes";

// This is here because it depends on quota, causing an import cycle.
/** Schema for fetching a signup for editing. */
export const signupForEdit = Type.Interface(
  [signupIdentity, ownerEditableSignupAttributes, ownerDynamicSignupAttributes],
  {
    quota,
    confirmableForMillis: Type.Integer({
      description: "Time in ms remaining to confirm the signup until it expires. Zero for confirmed signups.",
    }),
    editableForMillis: Type.Integer({
      description: "Time in ms the signup can be edited for. If zero, the signup cannot be edited.",
    }),
  },
);

/** Response schema for fetching a signup for editing. */
export const signupForEditResponse = Type.Object({
  signup: signupForEdit,
  event: userEventForSignup,
});

/** Schema for fetching a signup for editing. */
export type SignupForEdit = Static<typeof signupForEdit>;

/** Response schema for fetching a signup for editing. */
export type SignupForEditResponse = Static<typeof signupForEditResponse>;
