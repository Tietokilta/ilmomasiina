import { apiUrl } from "../paths";

/** API base URL as an absolute URL, since calendar apps can't resolve relative URLs. */
function absoluteApiUrl() {
  return new URL(apiUrl, window.location.href).href.replace(/\/$/, "");
}

/** HTTP(S) URL of the iCalendar subscription feed, optionally limited to a category. */
export function icalFeedUrl(category?: string) {
  const url = `${absoluteApiUrl()}/ical`;
  return category ? `${url}?${new URLSearchParams({ category })}` : url;
}

/** webcal:// variant of a feed URL, which makes Apple Calendar and Outlook offer to subscribe. */
export function webcalUrl(feedUrl: string) {
  return feedUrl.replace(/^https?:/, "webcal:");
}

/** Link that makes Google Calendar offer to subscribe to a feed. */
export function googleSubscribeUrl(feedUrl: string) {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl(feedUrl))}`;
}

/** URL for downloading a single event as an .ics file. */
export function eventIcalUrl(slug: string) {
  return `${absoluteApiUrl()}/ical/${encodeURIComponent(slug)}`;
}

/** Formats a date like 20261117T180000Z, as expected by Google Calendar. */
function googleDate(date: Date) {
  return date.toISOString().replace(/[-:]|\.\d{3}/g, "");
}

type GoogleEventParams = {
  title: string;
  start: Date;
  end: Date | null;
  location?: string | null;
  details?: string;
};

/** Link that opens the "new event" form of Google Calendar, prefilled with the event. */
export function googleEventUrl({ title, start, end, location, details }: GoogleEventParams) {
  // Fall back to a one-hour event if there is no end date.
  const endDate = end ?? new Date(start.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${googleDate(start)}/${googleDate(endDate)}`,
  });
  if (location) params.set("location", location);
  if (details) params.set("details", details);
  return `https://calendar.google.com/calendar/render?${params}`;
}
