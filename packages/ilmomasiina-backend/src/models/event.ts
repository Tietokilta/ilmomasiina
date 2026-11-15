import moment from "moment";

import { PaymentMode, QuestionCreate, QuotaCreate } from "@tietokilta/ilmomasiina-models";
import config from "../config";
import type { Filter } from "../db";
import { EventLanguage, eventTable } from "../db/schema";
import { EventValidationError } from "./errors";

export type { EventLanguage };

export type Event = typeof eventTable.$inferSelect;
export type EventInsert = typeof eventTable.$inferInsert;

/**
 * The columns of an event that can be set through the API. Request bodies may contain other fields
 * (the editor sends its whole form state), which must not reach the database.
 */
export const EVENT_EDITABLE_COLUMNS = [
  "title",
  "slug",
  "date",
  "endDate",
  "registrationStartDate",
  "registrationEndDate",
  "openQuotaSize",
  "description",
  "price",
  "location",
  "facebookUrl",
  "webpageUrl",
  "category",
  "draft",
  "listed",
  "signupsPublic",
  "nameQuestion",
  "emailQuestion",
  "verificationEmail",
  "languages",
  "defaultLanguage",
  "payments",
  "preferredFrontend",
] as const satisfies readonly (keyof Event)[];

/** Determines the effective end date of the event, matching the logic of `userEventFilter`. */
export function effectiveEndDate(event: Pick<Event, "date" | "endDate" | "registrationEndDate">) {
  const endDates = [event.endDate, event.date, event.registrationEndDate]
    .filter((date): date is Date => date != null)
    .map((date) => date.getTime());
  if (!endDates.length) return null;
  return endDates.reduce((lhs, rhs) => Math.max(lhs, rhs));
}

export function paymentsEnabled(event: Pick<Event, "payments">): boolean {
  return event.payments !== PaymentMode.DISABLED;
}

const hideEventsBefore = () => moment().subtract(config.hideEventAfterDays, "days").toDate();

/** Relational query filter for the events that users can see. */
export function userEventFilter(): Filter<"event"> {
  const since = hideEventsBefore();
  return {
    // not deleted,
    deletedAt: { isNull: true },
    // not drafts,
    draft: false,
    // and either:
    OR: [
      // closed recently enough
      { registrationEndDate: { gt: since } },
      // or happened recently enough
      { date: { gt: since } },
      { endDate: { gt: since } },
    ],
  };
}

type EventDates = Pick<Event, "date" | "endDate" | "registrationStartDate" | "registrationEndDate">;

/** Validates the event's own fields. Throws an `EventValidationError` if they are invalid. */
export function validateEvent(event: EventDates & Pick<Event, "languages" | "defaultLanguage">) {
  if (event.date != null && event.endDate != null && event.date > event.endDate) {
    throw new EventValidationError("endDate must be after or equal to date");
  }
  if (
    event.registrationStartDate != null &&
    event.registrationEndDate != null &&
    event.registrationStartDate > event.registrationEndDate
  ) {
    throw new EventValidationError("registrationEndDate must be after or equal to registrationStartDate");
  }
  if (event.date === null && event.registrationStartDate === null) {
    throw new EventValidationError("either date or registrationStartDate/registrationEndDate must be set");
  }
  if (event.date === null && event.endDate !== null) {
    throw new EventValidationError("endDate may only be set with date");
  }
  if ((event.registrationStartDate === null) !== (event.registrationEndDate === null)) {
    throw new EventValidationError("only neither or both of registrationStartDate and registrationEndDate may be set");
  }
  if (Object.hasOwn(event.languages, event.defaultLanguage)) {
    throw new EventValidationError("defaultLanguage may not be present in languages");
  }
}

/** Validates that the languages for the event match the given questions and quotas.
 *
 * Removes answer options from questions that do not have them defined in the default language.
 * This expects that options have already been removed from questions that don't support options.
 */
export function validateLanguages(
  languages: Record<string, EventLanguage>,
  questions: QuestionCreate[],
  quotas: QuotaCreate[],
) {
  for (const [langKey, language] of Object.entries(languages)) {
    // All array types have to be kept in sync or the editor experience will be very wonky.
    // We cannot check by ID, because new questions/quotas do not have IDs at this point.

    // Check that quota counts match.
    if (language.quotas.length !== quotas.length)
      throw new EventValidationError(`language ${langKey} has wrong number of quotas`);

    // Check that question counts match.
    if (language.questions.length !== questions.length)
      throw new EventValidationError(`language ${langKey} has wrong number of questions`);

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const localizedQuestion = language.questions[i];
      // Check that option counts match if present on both.
      // Options being unnecessarily set for a language has no effect.
      // Options being unset on a language just falls back to the default language.
      if (
        question.options &&
        localizedQuestion.options &&
        question.options.length !== localizedQuestion.options.length
      ) {
        throw new EventValidationError(`question ${i} in language ${langKey} has wrong number of options`);
      }
      // Remove options if the question does not have them.
      // We expect normalizeOptions() to remove unnecessary options before this is called.
      if (!question.options) {
        localizedQuestion.options = null;
      }
    }
  }
}
