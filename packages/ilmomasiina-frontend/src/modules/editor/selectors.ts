import { createSelector } from "reselect";

import { AdminEventResponse } from "@tietokilta/ilmomasiina-models";
import i18n from "../../i18n";
import type { AppState } from "../../store/types";
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

  updatedAt: "",
});

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
  eventType: eventType(event),
  date: event.date ? new Date(event.date) : null,
  endDate: event.endDate ? new Date(event.endDate) : null,
  registrationStartDate: event.registrationStartDate ? new Date(event.registrationStartDate) : null,
  registrationEndDate: event.registrationEndDate ? new Date(event.registrationEndDate) : null,
  quotas: event.quotas.map((quota) => ({
    ...quota,
    key: quota.id,
  })),
  useOpenQuota: event.openQuotaSize > 0,
  questions: event.questions.map((question) => ({
    ...question,
    key: question.id,
    options: question.options || [""],
    prices: question.prices || [0],
  })),
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
});

export const editorEventToServer = (form: EditorEvent): ConvertedEditorEvent => ({
  ...form,
  date: form.eventType === EditorEventType.ONLY_SIGNUP ? null : (form.date?.toISOString() ?? null),
  endDate: form.eventType === EditorEventType.ONLY_SIGNUP ? null : (form.endDate?.toISOString() ?? null),
  registrationStartDate:
    form.eventType === EditorEventType.ONLY_EVENT ? null : (form.registrationStartDate?.toISOString() ?? null),
  registrationEndDate:
    form.eventType === EditorEventType.ONLY_EVENT ? null : (form.registrationEndDate?.toISOString() ?? null),
  openQuotaSize: form.useOpenQuota && form.openQuotaSize ? form.openQuotaSize : 0,
});

export const selectFormData = createSelector(
  (state: AppState) => state.editor.isNew,
  (state: AppState) => state.editor.event,
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
