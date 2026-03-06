import { Type } from "typebox";

import { ManualPaymentStatus, SignupPaymentStatus, SignupStatus } from "../../enum";
import { productSchema } from "../product";
import { questionID } from "../question/attributes";
import { Nullable } from "../utils";

export const signupID = Type.String({
  title: "SignupID",
  description: "Signup ID. Randomly generated alphanumeric string.",
  minLength: 1,
  maxLength: 32,
  pattern: "^[a-z0-9]+$",
});

export const signupIdentity = Type.Object({
  id: signupID,
});

const namePublic = Type.Boolean({
  description: "Whether to show `firstName` and `lastName` publicly.",
});

export const editToken = Type.String({
  description: "Token required for editing or deleting the signup.",
});

/** Answer to a single signup question */
export const signupAnswer = Type.Object({
  questionId: questionID,
  answer: Type.Union(
    [
      Type.String({ maxLength: 255 }),
      Type.Array(
        Type.String({ maxLength: 255 }),
        // This was a practical limit before an explicit limitation was added, so seems reasonable to set it here.
        { maxItems: 64 },
      ),
    ],
    {
      description: "Answer to the question.",
    },
  ),
});

/** Editable attributes of a signup with non-public information removed. */
export const publicEditableSignupAttributes = Type.Object({
  firstName: Nullable(Type.String({ maxLength: 255 }), {
    description: "First name of the attendee. Null if not set yet or not public.",
  }),
  lastName: Nullable(Type.String({ maxLength: 255 }), {
    description: "Last name of the attendee. Null if not set yet or not public.",
  }),
  namePublic,
  answers: Type.Array(signupAnswer, {
    description: "Answers to the questions in the event.",
  }),
});

/** Editable attributes of a signup. */
export const ownerEditableSignupAttributes = Type.Interface([publicEditableSignupAttributes], {
  // This does not have format: "email", as we validate it within updateSignup instead.
  // If it was added, it would have to be unioned with Type.Literal("") to account for events without an email field.
  // (Ideally, clients would send null instead of "" in those cases, but we don't want to break existing uses.)
  email: Nullable(Type.String({ maxLength: 255 }), {
    description: "Email of the attendee. Null if not set yet.",
  }),
});

/** Editable attributes of a signup for admins. */
export const adminEditableSignupAttributes = Type.Interface([ownerEditableSignupAttributes], {
  manualPaymentStatus: Nullable(Type.Enum(ManualPaymentStatus), {
    description: "Payment status set manually by an admin, without creating a Payment record.",
  }),
});

/** Non-editable, automatically updated signup attributes with non-public information removed. */
export const publicDynamicSignupAttributes = Type.Object({
  status: Nullable(Type.Enum(SignupStatus, { title: "SignupStatus" }), {
    description: "Status of the signup. If null, the status has not been computed yet.",
  }),
  position: Nullable(Type.Integer(), {
    description: "Position of the signup in its current quota. If null, the status has not been computed yet.",
  }),
  createdAt: Type.String({
    format: "date-time",
    description: "The creation date of the signup.",
  }),
  confirmed: Type.Boolean({
    description: "Whether the signup has been confirmed (saved).",
  }),
});

/** Non-editable, automatically updated signup attributes only returned for admins and the signup owner. */
export const adminDynamicSignupAttributes = Type.Interface([publicDynamicSignupAttributes], {
  price: Nullable(Type.Integer({ minimum: 0 }), {
    description: "Total price of the signup in cents, calculated when it was last updated.",
  }),
  currency: Nullable(Type.String({ maxLength: 8 }), {
    description: "The currency in which the price is denominated.",
  }),
  paymentStatus: Nullable(Type.Enum(SignupPaymentStatus), {
    description: "Status of the payment for the signup, if applicable.",
  }),
  deletedAt: Nullable(Type.String({ format: "date-time" }), {
    description: "The deletion date of the signup, if deleted.",
  }),
});

/** Non-editable, automatically updated signup attributes only returned for the signup owner. */
export const ownerDynamicSignupAttributes = Type.Interface(
  [adminDynamicSignupAttributes],
  // products is excluded for admins, because the JSON size would blow up unnecessarily.
  {
    products: Nullable(Type.Array(productSchema), {
      description: "The product lines used to calculate the price.",
    }),
  },
);
