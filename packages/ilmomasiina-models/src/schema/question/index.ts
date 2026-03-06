import { Static, Type } from "typebox";

import { questionAttributes, questionID, questionIdentity, questionLanguageAttributes } from "./attributes";

export { MAX_OPTIONS_PER_QUESTION, questionID } from "./attributes";

/** Schema for a question. */
export const question = Type.Interface([questionIdentity, questionAttributes], {});

/** Schema for a question language version. */
export const questionLanguage = questionLanguageAttributes;

/** Schema for creating a question. */
export const questionCreate = questionAttributes;

/** Schema for updating a question. */
export const questionUpdate = Type.Interface(
  [Type.Partial(questionIdentity), questionCreate],
  {},
  { description: "Set id to reuse an existing question, or leave it empty to create a new one." },
);

/** Question ID type. Randomly generated alphanumeric string. */
export type QuestionID = Static<typeof questionID>;

/** Schema for a question. */
export type Question = Static<typeof question>;

/** Schema for a question language version. */
export type QuestionLanguage = Static<typeof questionLanguage>;

/** Schema for updating a question. */
export type QuestionCreate = Static<typeof questionCreate>;

/** Schema for updating a question. */
export type QuestionUpdate = Static<typeof questionUpdate>;
