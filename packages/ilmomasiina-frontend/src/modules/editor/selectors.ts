import { createSelector } from "reselect";

import { AdminEventResponse, PaymentMode } from "@tietokilta/ilmomasiina-models";
import i18n from "../../i18n";
import type { Root } from "../store";
import { ConvertedEditorEvent, EditorEvent, EditorEventType } from "./types";

export const defaultEvent = (): EditorEvent => ({
  eventType: EditorEventType.EVENT_WITH_SIGNUP,
  title: "",
  slug: "",
  date: null,
  endDate: null,
  webpageUrl: "",
  facebookUrl: "",
  category: "",
  location: "",
  description: "",
  price: "",
  signupsPublic: false,
  languages: {},
  payments: PaymentMode.DISABLED,
  defaultLanguage: DEFAULT_LANGUAGE,

  registrationStartDate: null,
  registrationEndDate: null,

  openQuotaSize: 0,
  useOpenQuota: false,
  quotas: [],

  nameQuestion: true,
  emailQuestion: true,
  questions: [],

  verificationEmail: "",

  draft: true,
  listed: true,
  preferredFrontend: "default",

  updatedAt: "",
  moveSignupsToQueue: false,
});

/** Determines the event type, which is only a thing in the frontend. */
export function eventType(event: AdminEventResponse): EditorEventType {
  if (event.date === null) {
    return EditorEventType.ONLY_SIGNUP;
  }
  if (event.registrationStartDate === null) {
    return EditorEventType.ONLY_EVENT;
  }
  return EditorEventType.EVENT_WITH_SIGNUP;
}

export const serverEventToEditor = (event: AdminEventResponse): EditorEvent => ({
  ...event,
  // Determine event/signup type based on presence of dates.
  eventType: eventType(event),
  // Parse dates.
  date: event.date ? new Date(event.date) : null,
  endDate: event.endDate ? new Date(event.endDate) : null,
  registrationStartDate: event.registrationStartDate ? new Date(event.registrationStartDate) : null,
  registrationEndDate: event.registrationEndDate ? new Date(event.registrationEndDate) : null,
  // Add keys to quotas for rendering.
  quotas: event.quotas.map((quota) => ({
    ...quota,
    key: quota.id,
  })),
  // Determine the status of the open quota checkbox.
  useOpenQuota: event.openQuotaSize > 0,
  // Add keys to questions and ensure options/prices are non-null.
  questions: event.questions.map((question) => ({
    ...question,
    key: question.id,
    options: question.options || [""],
    // Prices may be null even if options are present, so ensure the length matches options.
    prices: question.prices || Array(question.options?.length || 1).fill(0),
    // Determine if the question has any prices set.
    hasPrices: question.prices?.some((price) => price > 0) ?? false,
  })),
  // Ensure localized question options are non-null.
  languages: Object.fromEntries(
    Object.entries(event.languages).map(([language, locale]) => [
      language,
      {
        ...locale,
        questions: locale.questions.map((question) => ({
          ...question,
          options: question.options || [""],
        })),
      },
    ]),
  ),
  // Add defaults for write-only fields.
  moveSignupsToQueue: false,
});

export const editorEventToServer = (form: EditorEvent): ConvertedEditorEvent => ({
  ...form,
  // Drop dates if the chosen event type doesn't involve them.
  date: form.eventType === EditorEventType.ONLY_SIGNUP ? null : (form.date?.toISOString() ?? null),
  endDate: form.eventType === EditorEventType.ONLY_SIGNUP ? null : (form.endDate?.toISOString() ?? null),
  registrationStartDate:
    form.eventType === EditorEventType.ONLY_EVENT ? null : (form.registrationStartDate?.toISOString() ?? null),
  registrationEndDate:
    form.eventType === EditorEventType.ONLY_EVENT ? null : (form.registrationEndDate?.toISOString() ?? null),
  // Set open quota size to zero if an open quota is not used.
  openQuotaSize: form.useOpenQuota && form.openQuotaSize ? form.openQuotaSize : 0,
  // Drop prices from quotas and questions if payments are not used, and replace null prices with 0.
  quotas: form.quotas.map((quota) => ({
    ...quota,
    price: form.payments !== PaymentMode.DISABLED ? quota.price : 0,
  })),
  questions: form.questions.map((question) => ({
    ...question,
    prices: form.payments !== PaymentMode.DISABLED && question.hasPrices ? question.prices : null,
  })),
});

export const selectFormData = createSelector(
  (state: Root) => state.editor.isNew,
  (state: Root) => state.editor.event,
  (isNew, event) => {
    if (!event) return defaultEvent();
    const converted = serverEventToEditor(event);

    // For copying events, change the title/slug and remove IDs
    if (isNew) {
      converted.slug = `copy-of-${converted.slug}`;
      converted.title = i18n.t("editor.basic.name.copyPrefix", { lng: converted.defaultLanguage }) + converted.title;
      for (const [lang, languageVersion] of Object.entries(converted.languages)) {
        languageVersion.title = i18n.t("editor.basic.name.copyPrefix", { lng: lang }) + languageVersion.title;
      }
      for (const quota of converted.quotas) {
        quota.id = undefined;
      }
      for (const question of converted.questions) {
        question.id = undefined;
      }
    }

    return converted;
  },
);
