import { FastifyReply, FastifyRequest } from "fastify";
import { createEvents, DateArray } from "ics";
import { Op } from "sequelize";

import config, { eventDetailsUrl } from "../../config";
import { Event } from "../../models/event";
import createCache from "../../util/cache";

function dateToArray(date: Date) {
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  ] as DateArray;
}

/** Domain name for generating iCalendar UIDs.
 * @see https://datatracker.ietf.org/doc/html/rfc5545#section-3.8.4.7
 */
const uidDomain = config.icalUidDomain || new URL(config.baseUrl).hostname;

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

  const { error, value } = createEvents(
    events.map((event) => ({
      calName: config.icalCalendarName,
      uid: `${event.id}@${uidDomain}`,
      start: dateToArray(event.date!),
      startInputType: "utc",
      end: dateToArray(new Date(event.endDate!)),
      endInputType: "utc",
      title: event.title,
      description: event.description || undefined, // TODO convert markdown
      location: event.location || undefined,
      categories: event.category ? [event.category] : undefined,
      url: eventDetailsUrl({ slug: event.slug, lang: config.defaultLanguage, frontend: event.preferredFrontend }),
    })),
  );

  if (error != null) throw new Error(`Failed to generate iCalendar: ${error}`);
  if (value == null) throw new Error("Failed to generate iCalendar");
  return value;
}

const eventsAsICalCached = createCache({
  maxAgeMs: 60 * 1000,
  logName: "eventsAsICalCached",
  get: eventsAsICal,
});

export async function sendICalFeed(request: FastifyRequest, reply: FastifyReply): Promise<string> {
  // Generate iCal content (as a string)
  const cal = await eventsAsICalCached(undefined);

  reply.status(200);
  reply.type("text/calendar"); // Set proper content type header
  return cal;
}
