import {
  and, asc, eq,
  inArray,
  sql,
} from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { NotFound } from 'http-errors';

import type {
  AdminEventPathParams, AdminEventResponse, EventID, EventSlug, UserEventPathParams, UserEventResponse,
} from '@tietokilta/ilmomasiina-models';
import { db } from '../../drizzle/db';
import { EVENT_USER_VISIBLE, SIGNUP_IS_ACTIVE } from '../../drizzle/helpers';
import {
  answerTable, eventTable, questionTable, quotaTable, signupTable,
} from '../../drizzle/schema';
import { StringifyApi } from '../utils';

export async function eventDetailsForUser(
  eventSlug: EventSlug,
): Promise<UserEventResponse> {
  const event = await db.query.eventTable.findFirst({
    where: and(eq(eventTable.slug, eventSlug), EVENT_USER_VISIBLE),
    with: {
      questions: {
        orderBy: [questionTable.order],
      },
    },
  });
  if (!event) {
    throw new NotFound('No event found with slug');
  }
  const publicQuestionIds = event.questions.filter((q) => q.public).map((q) => (q.id));
  const quotas = await db.query.quotaTable.findMany({
    where: eq(quotaTable.eventId, event.id),
    with: {
      signups: {
        where: (SIGNUP_IS_ACTIVE),
        with: {
          answers: {
            // inArray cannot be empty, so we need to check if there are any public questions
            where: publicQuestionIds.length > 0 ? inArray(answerTable.questionId, publicQuestionIds) : sql`1=0`,
          },
        },
        orderBy: [signupTable.createdAt],
      },
    },
    orderBy: [quotaTable.order],
  });

  let registrationClosed = true;
  let millisTillOpening = null;

  if (event.registrationStartDate !== null && event.registrationEndDate !== null) {
    const startDate = new Date(event.registrationStartDate);
    const now = new Date();
    millisTillOpening = Math.max(0, startDate.getTime() - now.getTime());

    const endDate = new Date(event.registrationEndDate);
    registrationClosed = now > endDate;
  }

  const res = {
    ...(event),
    questions: event.questions,
    quotas: quotas.map((quota) => ({
      ...quota,
      signups: event.signupsPublic
        ? quota.signups.map((signup) => ({
          ...(signup),
          firstName: event.nameQuestion && signup.namePublic ? signup.firstName : null,
          lastName: event.nameQuestion && signup.namePublic ? signup.lastName : null,
          answers: signup.answers,
          status: signup.status,
          confirmed: signup.confirmedAt !== null,
        }))
        : [],
      signupCount: quota.signups.length,
    })),
    millisTillOpening,
    registrationClosed,
  };
  return res as unknown as StringifyApi<typeof res>;
}

export async function eventDetailsForAdmin(
  eventID: EventID,
): Promise<AdminEventResponse> {
  const event = await db.query.eventTable.findFirst({
    where: and(eq(eventTable.id, eventID)),
    with: {
      questions: {
        orderBy: [questionTable.order],
      },
    },
  });

  if (!event) {
    throw new NotFound('No event found with id');
  }

  const quotas = await db.query.quotaTable.findMany({
    where: eq(quotaTable.eventId, event.id),
    with: {
      signups: {
        with: {
          answers: true,
        },
      },
    },
    orderBy: [asc(quotaTable.order), asc(signupTable.createdAt)],
  });
  const res = {
    ...event,
    questions: event.questions,
    updatedAt: event.updatedAt,
    quotas: quotas.map((quota) => ({
      ...quota,
      signups: quota.signups.map((signup) => ({
        ...signup,
        status: signup.status,
        answers: signup.answers,
        confirmed: Boolean(signup.confirmedAt),
      })),
      signupCount: quota.signups.length,
    })),
  };
  return res as unknown as StringifyApi<typeof res>;
}

export async function getEventDetailsForUser(
  request: FastifyRequest<{ Params: UserEventPathParams }>,
  reply: FastifyReply,
): Promise<UserEventResponse> {
  const res = await eventDetailsForUser(request.params.slug);
  reply.status(200);
  return res;
}

export async function getEventDetailsForAdmin(
  request: FastifyRequest<{ Params: AdminEventPathParams }>,
  reply: FastifyReply,
): Promise<AdminEventResponse> {
  const res = await eventDetailsForAdmin(request.params.id);
  reply.status(200);
  return res;
}
