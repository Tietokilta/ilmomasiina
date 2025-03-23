import { Static, Type } from "@sinclair/typebox";

import { quotaID } from "../quota/attributes";
import { Nullable } from "../utils";
import {
  dynamicSignupAttributes,
  editableSignupAttributes,
  editToken,
  publicEditableSignupAttributes,
  signupID,
  signupIdentity,
} from "./attributes";

/** Request body for creating a signup. */
export const signupCreateBody = Type.Object({
  quotaId: quotaID,
});

/** Response schema for successfully creating a signup. */
export const signupCreateResponse = Type.Object({
  id: signupID,
  editToken,
});

const signupLanguage = Type.Object({
  language: Nullable(Type.String({ maxLength: 8 }), {
    description: "The language code used for emails related to this signup",
  }),
});

const adminSignupUpdateOptions = Type.Object({
  sendEmail: Type.Boolean({
    description: "Whether to send an edit confirmation for the edit",
  }),
});

/** Request body for editing an existing signup. */
export const signupUpdateBody = Type.Partial(Type.Composite([editableSignupAttributes, signupLanguage]));

/** Request body for editing an existing signup as an admin. */
export const adminSignupUpdateBody = Type.Partial(
  Type.Composite([editableSignupAttributes, signupLanguage, adminSignupUpdateOptions]),
);

/** Request body for creating a signup as an admin. */
export const adminSignupCreateBody = Type.Composite([
  signupCreateBody,
  Type.Partial(Type.Composite([editableSignupAttributes, signupLanguage, adminSignupUpdateOptions])),
]);

/** Response schema for successfully editing a signup. */
export const signupUpdateResponse = signupIdentity;

/** Schema for signups in event details from the public API. */
export const publicSignupSchema = Type.Composite([publicEditableSignupAttributes, dynamicSignupAttributes]);

/** Schema for signups in event details from the admin API. */
export const adminSignupSchema = Type.Composite([signupIdentity, editableSignupAttributes, dynamicSignupAttributes]);

/** Path parameters necessary to fetch and manipulate signups. */
export const signupPathParams = Type.Object({
  id: signupID,
});

/** Signup ID type. Randomly generated alphanumeric string. */
export type SignupID = Static<typeof signupID>;
/** Signup edit token type. */
export type SignupEditToken = Static<typeof editToken>;

/** Path parameters necessary to fetch and manipulate signups. */
export type SignupPathParams = Static<typeof signupPathParams>;

/** Request body for creating a signup as a regular user. */
export type SignupCreateBody = Static<typeof signupCreateBody>;
/** Response schema for successfully creating a signup. */
export type SignupCreateResponse = Static<typeof signupCreateResponse>;

/** Request body for editing an existing signup as a regular user. */
export type SignupUpdateBody = Static<typeof signupUpdateBody>;
/** Request body for editing an existing signup as an admin. */
export type AdminSignupUpdateBody = Static<typeof adminSignupUpdateBody>;
/** Request body for creating a signup as an admin. */
export type AdminSignupCreateBody = Static<typeof adminSignupCreateBody>;
/** Response schema for successfully editing a signup. */
export type SignupUpdateResponse = Static<typeof signupUpdateResponse>;

/** Schema for signups in event details from the public API. */
export type PublicSignupSchema = Static<typeof publicSignupSchema>;
/** Schema for signups in event details from the admin API. */
export type AdminSignupSchema = Static<typeof adminSignupSchema>;
