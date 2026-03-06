import { Static, Type } from "typebox";

import { ErrorCode, SignupFieldError } from "../../enum";
import { questionID } from "../question/attributes";
import { quotaID } from "../quota/attributes";

/** Response schema for a generic error. */
export const errorResponse = Type.Object({
  statusCode: Type.Number(),
  code: Type.Optional(Type.Enum(ErrorCode)),
  message: Type.String(),
});

/** Response schema for an edit conflicting with another edit on the server. */
export const editConflictError = Type.Interface([errorResponse], {
  updatedAt: Type.String({
    format: "date-time",
    description: "Last update time of the event on the server.",
  }),
  deletedQuotas: Type.Array(quotaID, {
    description: "IDs of quotas that are already deleted on the server.",
  }),
  deletedQuestions: Type.Array(questionID, {
    description: "IDs of questions that are already deleted on the server.",
  }),
});

/** Response schema for an edit that would move some signups back to the queue. */
export const wouldMoveSignupsToQueueError = Type.Interface([errorResponse], {
  count: Type.Integer({
    description: "Number of signups that would end up back in the queue if the action is executed.",
  }),
});

/** Schema for validation errors on a signup. */
const signupValidationErrors = Type.Object({
  firstName: Type.Optional(Type.Enum(SignupFieldError)),
  lastName: Type.Optional(Type.Enum(SignupFieldError)),
  email: Type.Optional(Type.Enum(SignupFieldError)),
  answers: Type.Optional(
    Type.Record(questionID, Type.Enum(SignupFieldError), {
      description: "The errors for answers, indexed by question ID.",
    }),
  ),
});

/** Schema for validation errors on a signup. */
export type SignupValidationErrors = Static<typeof signupValidationErrors>;

/** Response schema for an invalid signup edit. */
export const signupValidationError = Type.Interface([errorResponse], {
  errors: signupValidationErrors,
});

/** Response schema for a generic error. */
export type ErrorResponse = Static<typeof errorResponse>;
/** Response schema for an edit conflicting with another edit on the server. */
export type EditConflictError = Static<typeof editConflictError>;
/** Response schema for an edit that would move some signups back to the queue. */
export type WouldMoveSignupsToQueueError = Static<typeof wouldMoveSignupsToQueueError>;
/** Response schema for an invalid signup edit. */
export type SignupValidationError = Static<typeof signupValidationError>;
