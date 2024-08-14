import { FastifyReply, FastifyRequest } from "fastify";

import type { AdminEventPathParams } from "@tietokilta/ilmomasiina-models";
import { AuditEvent } from "@tietokilta/ilmomasiina-models";
import { getSequelize } from "../../../models";
import { Event } from "../../../models/event";
import { basicEventInfoCached, eventDetailsForUserCached } from "../../events/getEventDetails";
import { eventsListForUserCached } from "../../events/getEventsList";

export default async function deleteEvent(
  request: FastifyRequest<{ Params: AdminEventPathParams }>,
  response: FastifyReply,
): Promise<void> {
  await getSequelize().transaction(async (transaction) => {
    const event = await Event.findByPk(request.params.id);
    if (event === null) {
      response.notFound("No event found with id");
      return;
    }

    // Delete the DB object
    await event?.destroy({ transaction });

    if (event) {
      await request.logEvent(AuditEvent.DELETE_EVENT, { event, transaction });
    }
  });

  eventsListForUserCached.invalidate();
  basicEventInfoCached.invalidate();
  eventDetailsForUserCached.invalidate();

  response.status(204);
}
