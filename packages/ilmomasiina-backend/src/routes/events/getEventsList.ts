import { eq, sql } from 'drizzle-orm';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  type AdminEventListResponse, type EventListQuery, type UserEventListResponse,
} from '@tietokilta/ilmomasiina-models';
import { db } from '../../drizzle/db';
import { EVENT_USER_VISIBLE, SIGNUP_IS_ACTIVE } from '../../drizzle/helpers';
import { eventTable, quotaTable } from '../../drizzle/schema';
import { InitialSetupNeeded, isInitialSetupDone } from '../admin/users/createInitialUser';
import { StringifyApi } from '../utils';

const eventOrder = [
  // events without signup (date=NULL) come first
  sql`${eventTable.date} ASC NULLS FIRST`,
  eventTable.registrationEndDate,
  eventTable.title,
];

export async function getEventsListForUser(
  this: FastifyInstance<any, any, any, any, any>,
  request: FastifyRequest<{ Querystring: EventListQuery }>,
  reply: FastifyReply,
): Promise<UserEventListResponse> {
  // When the application hasn't been set up for the first time, throw an error.
  if (!this.initialSetupDone && !(await isInitialSetupDone())) {
    throw new InitialSetupNeeded('Initial setup of Ilmomasiina is needed.');
  }
  const events = await db.query.eventTable.findMany({
    where: EVENT_USER_VISIBLE,
    with: {
      quotas: {
        with: {
          signups: {
            columns: { id: true },
            where: SIGNUP_IS_ACTIVE,
          },
        },
        orderBy: [quotaTable.order],
      },
    },
    orderBy: eventOrder,
  });
  const res = events.map((event) => {
    const { quotas, ...rest } = event;

    return ({
      ...(rest),
      quotas: quotas.map((quota) => ({
        ...quota,
        signupCount: quota.signups.length,
        signups: undefined,
      })),
    });
  });

  reply.status(200);
  return res as unknown as StringifyApi<typeof res>;
}
export async function getEventsListForAdmin(
  request: FastifyRequest<{ Querystring: EventListQuery }>,
  reply: FastifyReply,
): Promise<AdminEventListResponse> {
  // Admin view also shows id, draft and listed fields.
  const events = await db.query.eventTable.findMany({
    where: request.query.category ? eq(eventTable.category, request.query.category) : undefined,
    with: {
      quotas: {
        with: {
          signups: {
            columns: { id: true },
            where: SIGNUP_IS_ACTIVE,
          },
        },
        orderBy: [quotaTable.order],
      },
    },
    orderBy: eventOrder,
  });

  const res = events.map((event) => {
    const { quotas, ...rest } = event;

    return ({
      ...rest,
      quotas: quotas.map((quota) => ({
        ...quota,
        signupCount: quota.signups.length,
        signups: undefined,
      })),
    });
  });

  reply.status(200);
  return res as unknown as StringifyApi<typeof res>;
}
