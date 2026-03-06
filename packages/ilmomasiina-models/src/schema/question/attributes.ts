import { Type } from "typebox";

import { QuestionType } from "../../enum";
import { Nullable } from "../utils";

export const questionID = Type.String({
  title: "QuestionID",
  description: "Question ID. Randomly generated alphanumeric string.",
});

/** Non-editable identity attributes of a question. */
export const questionIdentity = Type.Object({
  id: questionID,
});

/** Maximum number of options per question. */
// This was a practical limit before an explicit limitation was added, so seems reasonable to set it here.
export const MAX_OPTIONS_PER_QUESTION = 64;

const questionOptions = Nullable(Type.Array(Type.String({ maxLength: 255 }), { maxItems: MAX_OPTIONS_PER_QUESTION }), {
  description: "For select or checkbox questions, the options available.",
});

/** Editable attributes of a question language version. */
export const questionLanguageAttributes = Type.Object({
  // No minLength to allow for fallback.
  question: Type.String({
    description: "The question shown to attendees.",
    maxLength: 255,
  }),
  options: questionOptions,
});

/** Editable attributes of a question. */
export const questionAttributes = Type.Object({
  question: Type.String({
    description: "The question shown to attendees.",
    minLength: 1,
    maxLength: 255,
  }),
  type: Type.Enum(QuestionType, {
    title: "QuestionType",
    description: "The type of answer expected.",
  }),
  options: questionOptions,
  prices: Nullable(
    Type.Array(
      Type.Integer({ minimum: 0 }),
      // Should match questionOptions.
      { maxItems: 64 },
    ),
    { description: "For select or checkbox questions, the prices associated with each option in cents." },
  ),
  required: Type.Boolean({
    description: "Whether to require an answer to this question from all attendees.",
  }),
  public: Type.Boolean({
    description: "Whether to show the answers to this question publicly.",
  }),
});
