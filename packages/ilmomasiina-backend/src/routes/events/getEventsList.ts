import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { BadRequest } from "http-errors";
import moment from "moment";
import { col, fn, Op, Order, WhereOptions } from "sequelize";

import type { AdminEventListResponse, EventListQuery, UserEventListResponse } from "@tietokilta/ilmomasiina-models";
import {
  adminEventListEventAttrs,
  eventListEventAttrs,
  eventListQuotaAttrs,
} from "@tietokilta/ilmomasiina-models/dist/attrs/event";
import { Event } from "../../models/event";
import { Quota } from "../../models/quota";
import { Signup } from "../../models/signup";
import { ascNullsFirst } from "../../models/util/ascNullsFirst";
import createCache from "../../util/cache";
import { InitialSetupNeeded, isInitialSetupDone } from "../admin/users/createInitialUser";
import { StringifyApi } from "../utils";

function eventOrder(): Order {
  return [
    // events without signup (date=NULL) come first
    ["date", ascNullsFirst()],
    ["registrationEndDate", "ASC"],
    ["title", "ASC"],
    [Quota, "order", "ASC"],
  ];
}

type EventsListArgs = { category?: string; maxAge?: number };

const DEFAULT_MAX_AGE_DAYS = 7; // days

export const eventsListForUserCached = createCache({
  maxAgeMs: 1000,
  maxPendingAgeMs: 2000,
  logName: "eventsListForUserCached",
  formatKey: ({ category, maxAge = DEFAULT_MAX_AGE_DAYS }: EventsListArgs) => `${category} ${maxAge}`,
  async get({ category, maxAge = DEFAULT_MAX_AGE_DAYS }: EventsListArgs) {
    const where: WhereOptions & unknown[] = [{ listed: true }];

    if (category) {
      where.push({ category });
    }

    if (!Number.isFinite(maxAge) || maxAge < 0) throw new BadRequest("invalid maxAge");
    const since = moment().subtract(Math.round(maxAge), "days").toDate();
    where.push({
      [Op.or]: {
        // closed recently enough
        registrationEndDate: { [Op.gt]: since },
        // or happened recently enough
        date: { [Op.gt]: since },
        endDate: { [Op.gt]: since },
      },
    });

    const events = await Event.scope("user").findAll({
      attributes: eventListEventAttrs,
      where,
      // Include quotas of event and count of signups
      include: [
        {
          model: Quota,
          attributes: [...eventListQuotaAttrs, [fn("COUNT", col("quotas->signups.id")), "signupCount"]],
          include: [
            {
              model: Signup.scope("active"),
              required: false,
              attributes: [],
            },
          ],
        },
      ],
      group: [col("event.id"), col("quotas.id")],
      order: eventOrder(),
    });

    return events.map((event) => ({
      ...event.get({ plain: true }),
      quotas: event.quotas!.map((quota) => ({
        ...quota.get({ plain: true }),
        signupCount: Number(quota.signupCount),
      })),
    }));
  },
});

export async function getEventsListForUser(
  this: FastifyInstance<any, any, any, any, any>,
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

  const events = await Event.findAll({
    attributes: adminEventListEventAttrs,
    where: request.query,
    // Include quotas of event and count of signups
    include: [
      {
        model: Quota,
        attributes: [...eventListQuotaAttrs, [fn("COUNT", col("quotas->signups.id")), "signupCount"]],
        include: [
          {
            model: Signup.scope("active"),
            required: false,
            attributes: [],
          },
        ],
      },
    ],
    group: [col("event.id"), col("quotas.id")],
    order: eventOrder(),
  });

  const res = events.map((event) => ({
    ...event.get({ plain: true }),
    quotas: event.quotas!.map((quota) => ({
      ...quota.get({ plain: true }),
      signupCount: Number(quota.signupCount!),
    })),
  }));

  reply.status(200);
  return res as StringifyApi<typeof res>;
}
