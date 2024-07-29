import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

import type { CheckSlugParams, CheckSlugResponse } from '@tietokilta/ilmomasiina-models';
import { db } from '../../../drizzle/db';
import { eventTable } from '../../../drizzle/schema';

export default async function checkSlugAvailability(
  request: FastifyRequest<{ Params: CheckSlugParams }>,
  response: FastifyReply,
): Promise<CheckSlugResponse> {
  const res = await db.select({ id: eventTable.id, title: eventTable.title }).from(eventTable).where(eq(eventTable.slug, request.params.slug)).execute();

  response.status(200);
  return {
    id: res[0]?.id ?? null,
    title: res[0]?.title ?? null,
  };
}
