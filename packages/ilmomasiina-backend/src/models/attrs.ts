import type { AnswerAttributes } from "./answer";
import type { EventAttributes } from "./event";
import type { QuestionAttributes } from "./question";
import type { QuotaAttributes } from "./quota";
import type { SignupAttributes } from "./signup";

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
  "location",
  "webpageUrl",
  "facebookUrl",
  "category",
  "signupsPublic",
  "nameQuestion",
  "emailQuestion",
  "payments",
  "languages",
  "defaultLanguage",
];

/** Attributes included in GET /api/admin/events/ID for Event instances. */
export const adminEventGetEventAttrs: (keyof EventAttributes)[] = [
  ...eventGetEventAttrs,
  "draft",
  "listed",
  "preferredFrontend",
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
  "prices",
];

/** Attributes included in results for Quota instances. */
export const eventGetQuotaAttrs: (keyof QuotaAttributes)[] = ["id", "title", "size", "price"];

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
export const adminEventGetSignupAttrs: (keyof SignupAttributes)[] = [
  ...eventGetSignupAttrs,
  "id",
  "email",
  "price",
  "currency",
  "manualPaymentStatus",
  "deletedAt",
];

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
  "location",
  "webpageUrl",
  "facebookUrl",
  "category",
  "signupsPublic",
  "nameQuestion",
  "emailQuestion",
  "payments",
  "languages",
  "defaultLanguage",
];

/** Attributes included in GET /api/events for Quota instances. */
export const eventListQuotaAttrs: (keyof QuotaAttributes)[] = ["id", "title", "size", "price"];

/** Attributes included in GET /api/admin/events for Event instances. */
export const adminEventListEventAttrs: (keyof EventAttributes)[] = [...eventListEventAttrs, "draft", "listed"];
