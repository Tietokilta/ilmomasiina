import { and, count, inArray, sql } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { BadRequest } from "http-errors";
import moment from "moment";

import type { AdminEventListResponse, EventListQuery, UserEventListResponse } from "@tietokilta/ilmomasiina-models";
import { getDb } from "../../db";
import { eventTable, signupTable } from "../../db/schema";
import { adminEventListEventColumns, eventListEventColumns, eventListQuotaColumns } from "../../models/attrs";
import { userEventFilter } from "../../models/event";
import type { Quota } from "../../models/quota";
import { activeSignupCondition } from "../../models/signup";
import createCache from "../../util/cache";
import { InitialSetupNeeded, isInitialSetupDone } from "../admin/users/createInitialUser";
import { StringifyApi } from "../utils";

/** Adds the number of active signups to each quota of the given events. */
async function withSignupCounts<E extends { quotas: Pick<Quota, "id">[] }>(events: E[]) {
  const quotaIds = events.flatMap((event) => event.quotas.map((quota) => quota.id));
  const counts = quotaIds.length
    ? await getDb()
        .select({ quotaId: signupTable.quotaId, count: count() })
        .from(signupTable)
        .where(and(activeSignupCondition(), inArray(signupTable.quotaId, quotaIds)))
        .groupBy(signupTable.quotaId)
    : [];
  const signupCounts = new Map(counts.map((row) => [row.quotaId, row.count]));
  return events.map((event) => ({
    ...event,
    quotas: event.quotas.map((quota: E["quotas"][number]) => ({
      ...quota,
      signupCount: signupCounts.get(quota.id) ?? 0,
    })),
  }));
}

/** Sorts events for the event lists. */
const eventOrder = (event: typeof eventTable) => [
  // events without signup (date=NULL) come first
  sql`${event.date} ASC NULLS FIRST`,
  sql`${event.registrationEndDate} ASC`,
  sql`${event.title} ASC`,
];

const quotasInOrder = { columns: eventListQuotaColumns, orderBy: { order: "asc" } } as const;

type EventsListArgs = { category?: string; maxAge?: number };

const DEFAULT_MAX_AGE_DAYS = 7; // days

export const eventsListForUserCached = createCache({
  maxAgeMs: 1000,
  maxPendingAgeMs: 2000,
  logName: "eventsListForUserCached",
  formatKey: ({ category, maxAge = DEFAULT_MAX_AGE_DAYS }: EventsListArgs) => `${category} ${maxAge}`,
  async get({ category, maxAge = DEFAULT_MAX_AGE_DAYS }: EventsListArgs) {
    if (!Number.isFinite(maxAge) || maxAge < 0) throw new BadRequest("invalid maxAge");
    const since = moment().subtract(Math.round(maxAge), "days").toDate();

    const events = await getDb().query.event.findMany({
      columns: eventListEventColumns,
      where: {
        AND: [
          userEventFilter(),
          { listed: true },
          category ? { category } : {},
          {
            OR: [
              // closed recently enough
              { registrationEndDate: { gt: since } },
              // or happened recently enough
              { date: { gt: since } },
              { endDate: { gt: since } },
            ],
          },
        ],
      },
      // Include quotas of event and count of signups
      with: { quotas: quotasInOrder },
      orderBy: eventOrder,
    });

    return withSignupCounts(events);
  },
});

export async function getEventsListForUser(
  this: FastifyInstance,
  request: FastifyRequest<{ Querystring: EventListQuery }>,
  reply: FastifyReply,
): Promise<UserEventListResponse> {
  // When the application hasn't been set up for the first time, throw an error.
  if (!this.initialSetupDone && !(await isInitialSetupDone())) {
    throw new InitialSetupNeeded("Initial setup of Ilmomasiina is needed.");
  }

  const res = await eventsListForUserCached({ category: request.query.category, maxAge: request.query.maxAge });
  reply.status(200);
  return res as StringifyApi<typeof res>;
}

export async function getEventsListForAdmin(
  request: FastifyRequest<{ Querystring: EventListQuery }>,
  reply: FastifyReply,
): Promise<AdminEventListResponse> {
  // Admin view also shows id, draft and listed fields.
  const { category } = request.query;

  const events = await getDb().query.event.findMany({
    columns: adminEventListEventColumns,
    where: { deletedAt: { isNull: true }, ...(category ? { category } : {}) },
    with: { quotas: quotasInOrder },
    orderBy: eventOrder,
  });

  const res = await withSignupCounts(events);

  reply.status(200);
  return res as StringifyApi<typeof res>;
}
