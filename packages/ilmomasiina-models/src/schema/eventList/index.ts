import { Static, Type } from "@sinclair/typebox";

import { adminEventListAttributes, eventIdentity, userEventListAttributes } from "../event/attributes";
import { quotaWithSignupCount } from "../quotaWithSignups";

/** Schema for an item of an event list from the admin API. */
const adminEventListItemSchema = Type.Composite([
  eventIdentity,
  adminEventListAttributes,
  Type.Object({
    quotas: Type.Array(quotaWithSignupCount, {
      description: "The quotas in this event, with signup counts.",
    }),
  }),
]);

/** Response schema for fetching a list of events from the admin API. */
export const adminEventListResponse = Type.Array(adminEventListItemSchema);

/** Schema for an item of an event list from the public API. */
const userEventListItemSchema = Type.Composite([
  eventIdentity,
  userEventListAttributes,
  Type.Object({
    quotas: Type.Array(quotaWithSignupCount, {
      description: "The quotas in this event, with signup counts.",
    }),
  }),
]);

/** Response schema for fetching a list of events from the public API. */
export const userEventListResponse = Type.Array(userEventListItemSchema);

/** Query parameters applicable to the public event list API. */
export const eventListQuery = Type.Object({
  category: Type.Optional(
    Type.String({
      description: "If set, only events with the provided category are included.",
    }),
  ),
  since: Type.Optional(
    Type.String({
      description: "If set, only events starting after this date are included.",
      format: "date-time",
    }),
  ),
});

/** Query parameters applicable to the public event list API. */
export type EventListQuery = Static<typeof eventListQuery>;

/** Response schema for fetching a list of events from the public API. */
export type UserEventListResponse = Static<typeof userEventListResponse>;
/** Schema for an item of an event list from the public API. */
export type UserEventListItem = Static<typeof userEventListItemSchema>;
/** Response schema for fetching a list of events from the admin API. */
export type AdminEventListResponse = Static<typeof adminEventListResponse>;
/** Schema for an item of an event list from the admin API. */
export type AdminEventListItem = Static<typeof adminEventListItemSchema>;
