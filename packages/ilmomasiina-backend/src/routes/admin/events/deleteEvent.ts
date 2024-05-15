import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

import type { AdminEventPathParams } from '@tietokilta/ilmomasiina-models';
import { AuditEvent } from '@tietokilta/ilmomasiina-models';
import { db } from '../../../drizzle/db';
import { eventTable } from '../../../drizzle/schema';

export default async function deleteEvent(
  request: FastifyRequest<{ Params: AdminEventPathParams }>,
  response: FastifyReply,
): Promise<void> {
  const res = await db.delete(eventTable).where(eq(eventTable.id, request.params.id)).returning({ id: eventTable.id, title: eventTable.title }).execute();
  if (!res.length) {
    response.notFound('No event found with id');
    return;
  }

  await request.logEvent(AuditEvent.DELETE_EVENT, { event: res[0] });

  response.status(204);
}
