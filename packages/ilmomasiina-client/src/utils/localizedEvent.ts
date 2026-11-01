import type {
  SignupForEdit,
  SignupForEditResponse,
  UserEventListItem,
  UserEventResponse,
} from "@tietokilta/ilmomasiina-models";

type EventForEditSignup = SignupForEditResponse["event"];

/** Overrides localized properties in the event and quotas with localized versions.
 *
 * If the language version is not found (including invalid languages), falls back to the default language.
 */
export function getLocalizedEventListItem(event: UserEventListItem, language: string): UserEventListItem {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- support servers without languages
  const locale = event.languages?.[language] ?? event;
  return {
    ...event,
    title: locale.title || event.title,
    location: locale.location || event.location,
    price: locale.price || event.price,
    webpageUrl: locale.webpageUrl || event.webpageUrl,
    facebookUrl: locale.facebookUrl || event.facebookUrl,
    description: locale.description || event.description,
    quotas: event.quotas.map((quota, index) => ({
      ...quota,
      title: locale.quotas[index]?.title || quota.title,
    })),
  };
}

/** Overrides localized properties in the event, quotas and questions with localized versions.
 *
 * If the language version is not found (including invalid languages), falls back to the default language.
 */
export function getLocalizedEvent<E extends UserEventResponse | EventForEditSignup>(event: E, language: string): E {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- support servers without languages
  const locale = event.languages?.[language] ?? event;
  return {
    ...event,
    title: locale.title || event.title,
    location: locale.location || event.location,
    price: locale.price || event.price,
    webpageUrl: locale.webpageUrl || event.webpageUrl,
    facebookUrl: locale.facebookUrl || event.facebookUrl,
    description: locale.description || event.description,
    questions: event.questions.map((question, index) => ({
      ...question,
      question: locale.questions[index]?.question || question.question,
      options:
        question.options?.map((option, optIndex) => locale.questions[index]?.options?.[optIndex] || option) ?? null,
    })),
    quotas:
      // Servers prior to 2.0.0-alpha42 do not return quotas in EventForEditSignup.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      event.quotas?.map((quota, index) => ({
        ...quota,
        title: locale.quotas[index]?.title || quota.title,
      })) ?? [],
    // TypeScript isn't able to typecheck generics like E, so sanity-check at least slightly better.
  } satisfies UserEventResponse | EventForEditSignup as E;
}

/** Overrides localized properties in the quota of the edited signup with localized versions.
 *
 * If the language version is not found (including invalid languages), falls back to the default language.
 */
export function getLocalizedSignup({ event, signup }: SignupForEditResponse, language: string): SignupForEdit {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- support servers without languages
  const locale = event.languages?.[language];
  // Short circuit: don't attempt anything if we don't have the locale.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- indexing may fail
  if (!locale) return signup;
  // This is a bit unfortunate, but we have to find the quota manually.
  const quotaIndex = event.quotas.findIndex((q) => q.id === signup.quota.id);
  return {
    ...signup,
    quota: {
      ...signup.quota,
      title: locale.quotas[quotaIndex]?.title ?? signup.quota.title,
    },
  };
}
