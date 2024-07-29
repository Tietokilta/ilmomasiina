import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

import type { AdminEventResponse, EventCreateBody } from '@tietokilta/ilmomasiina-models';
import { AuditEvent } from '@tietokilta/ilmomasiina-models';
import { db } from '../../../drizzle/db';
import { eventTable, questionTable, quotaTable } from '../../../drizzle/schema';
import { eventDetailsForAdmin } from '../../events/getEventDetails';
import { toDate } from '../../utils';

export default async function createEvent(
  request: FastifyRequest<{ Body: EventCreateBody }>,
  response: FastifyReply,
): Promise<AdminEventResponse> {
  const { body } = request;
  const createdEventId = await db.transaction(async (db) => {
    // Prepare questions and quotas with order
    const questions = body.questions ? body.questions.map((q, order) => ({
      ...q,
      order,
      options: q.options?.length ? q.options : null,
    })) : [];

    const quotas = body.quotas ? body.quotas.map((q, order) => ({ ...q, order })) : [];
    // Insert event
    const eventToCreate = {
      ...body,
      updatedAt: undefined,
      date: toDate(body.date),
      endDate: toDate(body.endDate),
      registrationStartDate: toDate(body.registrationStartDate),
      registrationEndDate: toDate(body.registrationEndDate),
    };
    const [createdEvent] = await db.insert(eventTable).values(eventToCreate).returning();
    console.log('createdEvent', createdEvent);
    const events = await db.select().from(eventTable).where(eq(eventTable.id, createdEvent.id));
    console.log('events', events);
    // Insert related questions and quotas
    if (questions.length > 0) {
      await db.insert(questionTable).values(questions.map((q) => ({ ...q, eventId: createdEvent.id })));
    }

    if (quotas.length > 0) {
      await db.insert(quotaTable).values(quotas.map((q) => ({ ...q, eventId: createdEvent.id })));
    }

    // Log the event creation
    await request.logEvent(AuditEvent.CREATE_EVENT, { event: createdEvent, transaction: db });
    return createdEvent.id;
  });// Fetch and return the event details for admin
  console.log('createdEventId', createdEventId);
  const eventDetails = await eventDetailsForAdmin(createdEventId);

  response.status(201);
  return eventDetails;
}
