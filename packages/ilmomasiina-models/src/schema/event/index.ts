import { Static, Type } from "typebox";

import { question, questionCreate, questionUpdate } from "../question";
import { quota, quotaCreate, quotaUpdate } from "../quota";
import { adminQuotaWithSignups, userQuotaWithSignups } from "../quotaWithSignups";
import { Nullable } from "../utils";
import {
  adminDetailsOnlyCommonAttributes,
  adminDetailsOnlyEventAttributes,
  adminEventLanguage,
  adminEventLanguages,
  adminOnlyEventAttributes,
  eventID,
  eventIdentity,
  eventSlug,
  publicCommonAttributes,
  publicEventAttributes,
  userEventLanguage,
  userEventLanguages,
} from "./attributes";

/** Non-relation attributes for the public API. */
const publicAttributes = Type.Interface([publicEventAttributes, publicCommonAttributes, userEventLanguages], {});

/** Response schema for fetching an event from the public API. */
export const userEventResponse = Type.Interface([eventIdentity, publicAttributes], {
  questions: Type.Array(question),
  quotas: Type.Array(userQuotaWithSignups),
  millisTillOpening: Nullable(Type.Integer(), {
    description: "Time in ms until signup opens. If null, the signup will not open in the future.",
  }),
  registrationClosed: Type.Boolean({
    description: "Whether the signup has closed.",
  }),
});

/** Response schema when an event is fetched as part of an editable signup. */
export const userEventForSignup = Type.Interface([eventIdentity, publicAttributes], {
  questions: Type.Array(question),
  quotas: Type.Array(quota),
});

/** Non-relation attributes for the admin API. */
const adminAttributes = Type.Interface(
  [
    publicEventAttributes,
    publicCommonAttributes,
    adminOnlyEventAttributes,
    adminDetailsOnlyEventAttributes,
    adminDetailsOnlyCommonAttributes,
    adminEventLanguages,
  ],
  {},
);

/** Response schema for fetching or modifying an event in the admin API. */
export const adminEventResponse = Type.Interface([eventIdentity, adminAttributes], {
  questions: Type.Array(question),
  quotas: Type.Array(adminQuotaWithSignups),
  updatedAt: Type.String({
    description: "Last update time of the event. Used for edit conflict handling.",
    format: "date-time",
  }),
});

/** Request body for creating an event. */
export const eventCreateBody = Type.Interface([adminAttributes], {
  quotas: Type.Array(quotaCreate),
  questions: Type.Array(questionCreate),
});

/** Request body for editing an existing event. */
export const eventUpdateBody = Type.Partial(
  Type.Interface([adminAttributes], {
    quotas: Type.Array(quotaUpdate),
    questions: Type.Array(questionUpdate),
    moveSignupsToQueue: Type.Boolean({
      default: false,
      description: "Whether to allow moving signups to the queue, if caused by quota changes.",
    }),
    updatedAt: Type.String({
      format: "date-time",
      description:
        "Last update time of the event. An edit conflict is detected if this does not match the update " +
        "date on the server.",
    }),
  }),
);

/** Path parameters necessary to fetch an event from the public API. */
export const userEventPathParams = Type.Object({
  slug: eventSlug,
});

/** Path parameters necessary to fetch an event from the admin API. */
export const adminEventPathParams = Type.Object({
  id: eventID,
});

/** Event ID type. Randomly generated alphanumeric string. */
export type EventID = Static<typeof eventID>;
/** Event slug type. */
export type EventSlug = Static<typeof eventSlug>;

/** Path parameters necessary to fetch an event from the admin API. */
export type AdminEventPathParams = Static<typeof adminEventPathParams>;
/** Path parameters necessary to fetch an event from the public API. */
export type UserEventPathParams = Static<typeof userEventPathParams>;

/** Request body for creating an event. */
export type EventCreateBody = Static<typeof eventCreateBody>;
/** Request body for editing an existing event. */
export type EventUpdateBody = Static<typeof eventUpdateBody>;

/** Response schema for fetching or modifying an event in the admin API. */
export type AdminEventResponse = Static<typeof adminEventResponse>;
/** Response schema for fetching an event from the public API. */
export type UserEventResponse = Static<typeof userEventResponse>;

/** Schema for an event language version for admins. */
export type AdminEventLanguage = Static<typeof adminEventLanguage>;
/** Schema for an event language version. */
export type UserEventLanguage = Static<typeof userEventLanguage>;
