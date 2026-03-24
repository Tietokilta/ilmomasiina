import ics from "ics";
import { remark } from "remark";
import stripMarkdown from "strip-markdown";

import config, { eventDetailsUrl } from "../config";
import { Event } from "../models/event";

type DateArray = [number, number, number, number, number];

function dateToArray(date: Date): DateArray {
	return [
		date.getUTCFullYear(),
		date.getUTCMonth() + 1,
		date.getUTCDate(),
		date.getUTCHours(),
		date.getUTCMinutes(),
	];
}

/** Domain name for generating iCalendar UIDs.
 * @see https://datatracker.ietf.org/doc/html/rfc5545#section-3.8.4.7
 */
const uidDomain = config.icalUidDomain || new URL(config.baseUrl).hostname;

export default function createIcalEventAttrs(event: Event): ics.EventAttributes | undefined {
	if (!event.date || !event.endDate) {
		return undefined;
	}

	const description = (
		remark().use(stripMarkdown).processSync(event.description || "")
	).toString();

	return {
		calName: config.icalCalendarName,
		uid: `${event.id}@${uidDomain}`,
		start: dateToArray(new Date(event.date)),
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

