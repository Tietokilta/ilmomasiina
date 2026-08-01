import { FastifyReply, FastifyRequest } from "fastify";
import * as ics from "ics";
import { Op } from "sequelize";

import { Event } from "../../models/event";
import createIcalEventAttrs from "../../util/ical";

export async function eventsAsICal() {
  const events = await Event.scope("user").findAll({
    where: [
      {
        listed: true,
        // only events, not signup-only
        date: { [Op.ne]: null },
        // ignore legacy events with no end date
        endDate: { [Op.ne]: null },
      },
    ],
    order: [
      ["date", "ASC"],
      ["registrationEndDate", "ASC"],
      ["title", "ASC"],
    ],
  });

  const { error, value } = ics.createEvents(events
    .map(createIcalEventAttrs)
    .filter(attrs => attrs !== undefined)
  );

  if (error !== null) throw new Error(`Failed to generate iCalendar: ${error}`);
  return value;
}

export async function sendICalFeed(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Generate iCal content (as a string)
  const cal = await eventsAsICal();

  reply.status(200);
  reply.type("text/calendar"); // Set proper content type header
  reply.send(cal);
}
