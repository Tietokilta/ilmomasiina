import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";

import type { AdminEventPathParams } from "@tietokilta/ilmomasiina-models";
import { AuditEvent } from "@tietokilta/ilmomasiina-models";
import { getDb } from "../../../db";
import { eventTable } from "../../../db/schema";
import { basicEventInfoCached, eventDetailsForUserCached } from "../../events/getEventDetails";
import { eventsListForUserCached } from "../../events/getEventsList";

export default async function deleteEvent(
  request: FastifyRequest<{ Params: AdminEventPathParams }>,
  response: FastifyReply,
): Promise<void> {
  await getDb().transaction(async (transaction) => {
    const event = await transaction.query.event.findFirst({
      where: { id: request.params.id, deletedAt: { isNull: true } },
      columns: { id: true, title: true, slug: true },
    });
    if (!event) {
      response.notFound("No event found with id");
      return;
    }

    // Soft delete the event. Also change the slug, so that it isn't reserved after deletion.
    await transaction
      .update(eventTable)
      .set({
        deletedAt: new Date(),
        slug: `${event.slug.substring(0, 100)}-deleted-${Date.now()}`,
      })
      .where(eq(eventTable.id, event.id));

    await request.logEvent(AuditEvent.DELETE_EVENT, { event, transaction });
  });

  eventsListForUserCached.invalidate();
  basicEventInfoCached.invalidate();
  eventDetailsForUserCached.invalidate();

  response.status(204);
}
