import { Static, Type } from "typebox";

import {
  adminOnlyEventAttributes,
  eventIdentity,
  publicCommonAttributes,
  publicEventAttributes,
  userEventLanguages,
} from "../event/attributes";
import { quotaWithSignupCount } from "../quotaWithSignups";

/** Schema for an item of an event list from the public API. */
const userEventListItem = Type.Interface(
  [eventIdentity, publicEventAttributes, publicCommonAttributes, userEventLanguages],
  {
    quotas: Type.Array(quotaWithSignupCount, {
      description: "The quotas in this event, with signup counts.",
    }),
  },
);

/** Response schema for fetching a list of events from the public API. */
export const userEventListResponse = Type.Array(userEventListItem);

/** Schema for an item of an event list from the admin API. */
const adminEventListItem = Type.Interface(
  [eventIdentity, publicEventAttributes, publicCommonAttributes, adminOnlyEventAttributes],
  {
    quotas: Type.Array(quotaWithSignupCount, {
      description: "The quotas in this event, with signup counts.",
    }),
  },
);

/** Response schema for fetching a list of events from the admin API. */
export const adminEventListResponse = Type.Array(adminEventListItem);

/** Query parameters applicable to the public event list API. */
export const eventListQuery = Type.Object({
  category: Type.Optional(
    Type.String({
      description: "If set, only events with the provided category are included.",
    }),
  ),
  maxAge: Type.Optional(
    Type.Integer({
      description: "If set to a number, only events at most that many days old are included.",
    }),
  ),
});

/** Query parameters applicable to the public event list API. */
export type EventListQuery = Static<typeof eventListQuery>;

/** Response schema for fetching a list of events from the public API. */
export type UserEventListResponse = Static<typeof userEventListResponse>;
/** Schema for an item of an event list from the public API. */
export type UserEventListItem = Static<typeof userEventListItem>;
/** Response schema for fetching a list of events from the admin API. */
export type AdminEventListResponse = Static<typeof adminEventListResponse>;
/** Schema for an item of an event list from the admin API. */
export type AdminEventListItem = Static<typeof adminEventListItem>;
