import { Type } from "@sinclair/typebox";

import { questionLanguage } from "../question";
import { quotaLanguage } from "../quota";
import { Nullable } from "../utils";

export const eventSlug = Type.String({
  description: "Event slug, used for accessing the event by URL.",
  minLength: 1,
  maxLength: 255,
  pattern: "^[A-Za-z0-9_-]+$",
});

/** Event ID type. Randomly generated alphanumeric string. */
export const eventID = Type.String({
  title: "EventID",
  description: "Event ID. Randomly generated alphanumeric string.",
  minLength: 1,
  maxLength: 32,
  pattern: "^[a-z0-9]+$",
});

/** Non-editable identity attributes for events. */
export const eventIdentity = Type.Object({
  id: eventID,
});

/** Event attributes that are public. */
export const publicEventAttributes = Type.Object({
  title: Type.String({
    description: "Event title.",
    minLength: 1,
    maxLength: 255,
  }),
  // Not per language as it's used for fetching events.
  slug: eventSlug,
  date: Nullable(Type.String({ format: "date-time" }), {
    description:
      "Event start date. Considered to be the start date if endDate is also set. If null, " +
      "the event is signup-only.",
  }),
  endDate: Nullable(Type.String({ format: "date-time" }), {
    description: "Event end date. If null, the event will not appear in iCalendar exports.",
  }),
  registrationStartDate: Nullable(Type.String({ format: "date-time" }), {
    description: "Event signup opening date. If null, the event does not have a signup.",
  }),
  registrationEndDate: Nullable(Type.String({ format: "date-time" }), {
    description: "Event signup closing date.",
  }),
  openQuotaSize: Type.Integer({
    description: "The size of the open quota, which will be filled with signups overflowing their dedicated quota.",
    minimum: 0,
  }),
  // Not per language as it's used for filtering events.
  category: Type.String({
    description: "Category tag for the event. Can be used for filtering.",
    maxLength: 255,
  }),
  signupsPublic: Type.Boolean({
    description: "Whether signups should be shown to all users.",
  }),
  nameQuestion: Type.Boolean({
    description: "Whether signups should contain a name field.",
  }),
  emailQuestion: Type.Boolean({
    description: "Whether signups should contain an email field. Also enables confirmation emails.",
  }),
  defaultLanguage: Type.String({
    maxLength: 8,
    description: "The language of fields contained directly in the event body.",
  }),
});

/** Event attributes that are only for admins. */
export const adminOnlyEventAttributes = Type.Object({
  draft: Type.Boolean({
    description: "Whether the event is a draft, shown only to signed-in admins.",
  }),
  listed: Type.Boolean({
    description:
      "Whether the event is publicly visible on the front page of Ilmomasiina." +
      " Unlisted events are only accessible with a direct link",
  }),
});

/** Attributes shared between events/languages that are public. */
export const publicCommonAttributes = Type.Object({
  description: Nullable(Type.String(), {
    description: "Description for the event. Supports Markdown.",
  }),
  price: Nullable(Type.String({ maxLength: 255 }), {
    description: "Free-form pricing information for the event.",
  }),
  location: Nullable(Type.String({ maxLength: 255 }), {
    description: "Free-form location information for the event.",
  }),
  webpageUrl: Nullable(Type.String({ maxLength: 255 }), {
    description: "Link to an external event webpage.",
  }),
  facebookUrl: Nullable(Type.String({ maxLength: 255 }), {
    description: "Link to a Facebook page for the event.",
  }),
});

/** Attributes shared between events/languages that are only for admins, only in event details. */
export const adminDetailsOnlyCommonAttributes = Type.Object({
  verificationEmail: Nullable(Type.String(), {
    description: "Custom message for the signup confirmation email.",
  }),
});

/** Language version attributes that are public. */
export const publicLanguageAttributes = Type.Object({
  // No minLength to allow for fallback.
  title: Type.String({
    description: "Event title.",
    maxLength: 255,
  }),
  quotas: Type.Array(quotaLanguage),
  questions: Type.Array(questionLanguage),
});

/** Schema for an event language version. */
export const userEventLanguage = Type.Composite([publicCommonAttributes, publicLanguageAttributes]);

/** Schema for an event language version for admins. */
export const adminEventLanguage = Type.Composite([
  publicCommonAttributes,
  publicLanguageAttributes,
  adminDetailsOnlyCommonAttributes,
]);

/** Schema for the array of event language versions. */
export const userEventLanguages = Type.Object({
  languages: Type.Record(Type.String({ maxLength: 8 }), userEventLanguage),
});

/** Schema for the array of event language versions for admins. */
export const adminEventLanguages = Type.Object({
  languages: Type.Record(Type.String({ maxLength: 8 }), adminEventLanguage),
});
