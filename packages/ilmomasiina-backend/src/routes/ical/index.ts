import { FastifyReply, FastifyRequest } from "fastify";
import { NotFound } from "http-errors";
import { createEvents, DateArray, EventAttributes } from "ics";
import { Op, WhereOptions } from "sequelize";

import config, { eventDetailsUrl } from "../../config";
import { Event } from "../../models/event";

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

/** Calendar apps poll subscribed feeds on their own schedule, so a short cache is plenty. */
const CACHE_CONTROL = "public, max-age=300";

/** Assumed length for legacy events that have no end date, when downloading a single event. */
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

function eventToICal(event: Event): EventAttributes {
  const end = event.endDate ? new Date(event.endDate) : new Date(event.date!.getTime() + DEFAULT_DURATION_MS);
  return {
    calName: config.icalCalendarName,
    uid: `${event.id}@${uidDomain}`,
    start: dateToArray(event.date!),
    startInputType: "utc",
    end: dateToArray(end),
    endInputType: "utc",
    title: event.title,
    description: event.description || undefined, // TODO convert markdown
    location: event.location || undefined,
    categories: event.category ? [event.category] : undefined,
    url: eventDetailsUrl({ slug: event.slug, lang: config.defaultLanguage, frontend: event.preferredFrontend }),
  };
}

function renderICal(events: Event[]) {
  const { error, value } = createEvents(events.map(eventToICal));
  if (error !== null && error !== undefined) throw new Error(`Failed to generate iCalendar: ${error}`);
  return value!;
}

export async function eventsAsICal({ category }: { category?: string } = {}) {
  const where: WhereOptions & unknown[] = [
    {
      listed: true,
      // only events, not signup-only
      date: { [Op.ne]: null },
      // ignore legacy events with no end date
      endDate: { [Op.ne]: null },
    },
  ];
  if (category) where.push({ category });

  const events = await Event.scope("user").findAll({
    where,
    order: [
      ["date", "ASC"],
      ["registrationEndDate", "ASC"],
      ["title", "ASC"],
    ],
  });

  return renderICal(events);
}

/** Calendar subscription feed. Supports an optional `category` filter. */
export async function sendICalFeed(
  request: FastifyRequest<{ Querystring: { category?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const category = typeof request.query?.category === "string" ? request.query.category : undefined;
  const cal = await eventsAsICal({ category });

  reply.status(200);
  reply.type("text/calendar; charset=utf-8");
  reply.header("Cache-Control", CACHE_CONTROL);
  reply.send(cal);
}

/** Download a single event as an .ics file, for "Add to calendar" buttons. */
export async function sendEventICal(
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { slug } = request.params;
  // Unlisted events are accessible by direct link, just like on the event page. The "user" scope hides drafts.
  const event = await Event.scope("user").findOne({
    where: { slug, date: { [Op.ne]: null } },
  });
  if (!event) throw new NotFound("No event with a date found with slug");

  reply.status(200);
  reply.type("text/calendar; charset=utf-8");
  reply.header("Content-Disposition", `attachment; filename="${event.slug}.ics"`);
  reply.header("Cache-Control", CACHE_CONTROL);
  reply.send(renderICal([event]));
}
