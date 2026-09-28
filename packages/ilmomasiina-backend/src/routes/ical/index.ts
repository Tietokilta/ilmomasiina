import { FastifyReply, FastifyRequest } from "fastify";
import { createEvents, DateArray, EventAttributes } from "ics";
import { Op } from "sequelize";

import config, { eventDetailsUrl } from "../../config";
import { Event } from "../../models/event";
import { getStripMarkdownProcessor } from "../../util/stripMarkdown";

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

/** An event that has both a start and an end date, and can thus be exported to iCalendar. */
export type ICalExportableEvent = Event & { date: Date; endDate: Date };

/** Checks whether an event can be exported to iCalendar, i.e. has both start and end dates. */
export function isICalExportable(event: Event): event is ICalExportableEvent {
  return event.date != null && event.endDate != null;
}

export function icsAttrsFromEvent(event: ICalExportableEvent, description: string): EventAttributes {
  return {
    calName: config.icalCalendarName,
    uid: `${event.id}@${uidDomain}`,
    start: dateToArray(event.date),
    startInputType: "utc",
    end: dateToArray(new Date(event.endDate)),
    endInputType: "utc",
    title: event.title,
    description,
    location: event.location || undefined,
    categories: event.category ? [event.category] : undefined,
    url: eventDetailsUrl({ slug: event.slug, lang: config.defaultLanguage, frontend: event.preferredFrontend }),
  };
}

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

  const stripMarkdown = await getStripMarkdownProcessor();

  const { error, value } = createEvents(
    events.filter(isICalExportable).map((event) => {
      const description = stripMarkdown(event.description || "");
      return icsAttrsFromEvent(event, description);
    }),
  );

  if (error != null) throw new Error(`Failed to generate iCalendar: ${error}`);
  return value;
}

export async function sendICalFeed(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Generate iCal content (as a string)
  const cal = await eventsAsICal();

  reply.status(200);
  reply.type("text/calendar"); // Set proper content type header
  reply.send(cal);
}
