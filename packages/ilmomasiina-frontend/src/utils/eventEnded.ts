import type { UserEventListItem } from "@tietokilta/ilmomasiina-models";

const dayKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    date,
  );

/** Whether the event has already ended.
 *
 * An event with an end time ends then. One with only a start time lasts until the end of that day, so it doesn't count
 * as past while it's still going on. A signup without an event ends when its signup closes.
 */
export default function eventEnded(
  event: Pick<UserEventListItem, "date" | "endDate" | "registrationEndDate">,
  now = new Date(),
) {
  if (event.endDate) return new Date(event.endDate) < now;
  if (event.date) return dayKey(new Date(event.date)) < dayKey(now);
  if (event.registrationEndDate) return new Date(event.registrationEndDate) < now;
  return false;
}
