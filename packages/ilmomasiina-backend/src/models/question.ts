import { OPTION_QUESTION_TYPES, QuestionCreate } from "@tietokilta/ilmomasiina-models";
import { questionTable } from "../db/schema";
import { EventValidationError } from "./errors";

export type Question = typeof questionTable.$inferSelect;
export type QuestionInsert = typeof questionTable.$inferInsert;

/** The columns of a question that can be set through the API. */
export const QUESTION_EDITABLE_COLUMNS = [
  "question",
  "type",
  "options",
  "prices",
  "required",
  "public",
] as const satisfies readonly (keyof Question)[];

/**
 * Returns override values to normalize `options` and/or `prices` to null in cases such as:
 *
 * - options are not supported for the question type
 * - options are null or empty
 * - prices are all zero
 *
 * This needs to run before validateLanguages(), which checks `question.options == null`
 * to scrub unneeded localized options.
 */
export function normalizeOptions(attrs: Partial<QuestionCreate>) {
  const output: Partial<QuestionCreate> = {};
  // Unset prices and options for non-option question types, or if options are null or empty
  if (!OPTION_QUESTION_TYPES.includes(attrs.type!) || !attrs.options || attrs.options.length === 0) {
    output.options = null;
    output.prices = null;
  }
  // Unset prices if all prices are zero
  if (attrs.prices?.every((price) => price === 0)) {
    output.prices = null;
  }
  // Zero-length prices is an incorrect input and will be caught by validation, ignore it here
  return output;
}

/** Validates a question's own fields. Throws an `EventValidationError` if they are invalid. */
export function validateQuestion(question: Pick<QuestionCreate, "options" | "prices">) {
  if (question.prices && question.options && question.prices.length !== question.options.length) {
    throw new EventValidationError("Prices length must match options length");
  }
}
