import type {
  AnswerAttributes,
  EventAttributes,
  QuestionAttributes,
  QuotaAttributes,
  SignupAttributes,
} from "../models";

/** Attributes included in GET /api/events/slug for Event instances. */
export const eventGetEventAttrs: (keyof EventAttributes)[] = [
  "id",
  "title",
  "slug",
  "date",
  "endDate",
  "registrationStartDate",
  "registrationEndDate",
  "openQuotaSize",
  "description",
  "price",
  "numPrice",
  "location",
  "webpageUrl",
  "facebookUrl",
  "category",
  "signupsPublic",
  "nameQuestion",
  "emailQuestion",
  "languages",
  "defaultLanguage",
];

/** Attributes included in GET /api/admin/events/ID for Event instances. */
export const adminEventGetEventAttrs: (keyof EventAttributes)[] = [
  ...eventGetEventAttrs,
  "draft",
  "listed",
  "verificationEmail",
  "updatedAt",
];

/** Attributes included in results for Question instances. */
export const eventGetQuestionAttrs: (keyof QuestionAttributes)[] = [
  "id",
  "question",
  "type",
  "options",
  "required",
  "public",
];

/** Attributes included in results for Quota instances. */
export const eventGetQuotaAttrs: (keyof QuotaAttributes)[] = ["id", "title", "size"];

/** Attributes included in GET /api/events/slug for Signup instances. */
export const eventGetSignupAttrs: (keyof SignupAttributes)[] = [
  "firstName",
  "lastName",
  "namePublic",
  "status",
  "position",
  "createdAt",
  "confirmedAt",
];

/** Attributes included in GET /api/admin/events/ID for Signup instances. */
export const adminEventGetSignupAttrs: (keyof SignupAttributes)[] = [...eventGetSignupAttrs, "id", "email"];

/** Attributes included in results for Answer instances. */
export const eventGetAnswerAttrs: (keyof AnswerAttributes)[] = ["questionId", "answer"];

/** Attributes included in GET /api/events for Event instances. */
export const eventListEventAttrs: (keyof EventAttributes)[] = [
  "id",
  "slug",
  "title",
  "date",
  "endDate",
  "registrationStartDate",
  "registrationEndDate",
  "openQuotaSize",
  "description",
  "price",
  "numPrice",
  "location",
  "webpageUrl",
  "facebookUrl",
  "category",
  "signupsPublic",
  "nameQuestion",
  "emailQuestion",
  "languages",
  "defaultLanguage",
];

/** Attributes included in GET /api/events for Quota instances. */
export const eventListQuotaAttrs: (keyof QuotaAttributes)[] = ["id", "title", "size"];

/** Attributes included in GET /api/admin/events for Event instances. */
export const adminEventListEventAttrs: (keyof EventAttributes)[] = [...eventListEventAttrs, "draft", "listed"];
