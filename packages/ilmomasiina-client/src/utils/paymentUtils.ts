import { Question, SignupForEditResponse, UserEventResponse } from "@tietokilta/ilmomasiina-models";

type AnyEvent = UserEventResponse | SignupForEditResponse["event"];

/** Checks whether the given question has options with non-zero prices. */
export function questionHasPrices(question: Question): boolean {
  return question.prices?.some((price) => price > 0) ?? false;
}

/** Checks whether the given event has any quotas with non-zero prices. */
export function eventHasPaidQuotas(event: Pick<AnyEvent, "quotas">): boolean {
  return event.quotas.some((quota) => quota.price > 0);
}

/** Checks whether the given event has any quotas or question options with non-zero prices. */
export function eventHasPayments(event: Pick<AnyEvent, "quotas" | "questions">): boolean {
  return eventHasPaidQuotas(event) || event.questions.some(questionHasPrices);
}
