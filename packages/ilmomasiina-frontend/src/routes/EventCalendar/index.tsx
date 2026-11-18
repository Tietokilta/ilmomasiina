import React, { useMemo } from "react";

import { Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

import { errorDesc, errorTitle, EventListProvider, useEventListContext } from "@tietokilta/ilmomasiina-client";
import { SignupState, signupState } from "@tietokilta/ilmomasiina-client/dist/utils/signupState";
import type { UserEventListItem } from "@tietokilta/ilmomasiina-models";
import { TKey } from "../../i18n";
import paths from "../../paths";
import { buildCategoryColors, categoryStyle } from "../../utils/categoryColor";
import ViewControls from "../EventList/components/ViewControls";

import "../EventList/EventList.scss";
import "./EventCalendar.scss";

/** How many days of past events to load, so that earlier months are not empty. */
const CALENDAR_MAX_AGE_DAYS = 365;
/** Safety cap for events spanning many days. */
const MAX_EVENT_SPAN_DAYS = 62;

const DAY_MS = 86400000;

/** Formats a date as an ISO day key (YYYY-MM-DD) in the event timezone. */
function dayKeyFormatter() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
}

/** Day keys are timezone-independent, so we can step through them using UTC dates. */
function keyToUtc(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

const utcToKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function parseMonth(param: string | null, fallbackKey: string) {
  const match = param?.match(/^(\d{4})-(\d{2})$/);
  const [y, m] = (match ? `${match[1]}-${match[2]}` : fallbackKey).split("-").map(Number);
  return { year: y, month: m - 1 };
}

const monthParam = (year: number, month: number) => utcToKey(Date.UTC(year, month, 1)).slice(0, 7);

const stateClass = (event: UserEventListItem) => {
  switch (signupState(event.registrationStartDate, event.registrationEndDate, event.signupComing).state) {
    case SignupState.open:
      return "ilmo--cal-open";
    case SignupState.not_opened:
    case SignupState.coming:
      return "ilmo--cal-coming";
    case SignupState.closed:
      return "ilmo--cal-closed";
    default:
      return "ilmo--cal-nosignup";
  }
};

const CalendarView = () => {
  const { localizedEvents: events, error, pending } = useEventListContext();
  const { t } = useTranslation();
  const locale = t("dateFormat.locale");
  const [searchParams] = useSearchParams();

  const keyFormat = useMemo(dayKeyFormatter, []);
  const todayKey = keyFormat.format(new Date());
  const { year, month } = parseMonth(searchParams.get("m"), todayKey.slice(0, 7));

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
    [locale],
  );
  const weekdayLong = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }), [locale]);
  const weekdayShort = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }), [locale]);
  const timeFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", hour12: false, timeZone: TIMEZONE }),
    [locale],
  );

  // Events by day. Multi-day events appear on each of their days.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, { event: UserEventListItem; isStart: boolean }[]>();
    (events ?? []).forEach((event) => {
      if (!event.date) return;
      const start = new Date(event.date);
      const startKey = keyFormat.format(start);
      const endKey = event.endDate ? keyFormat.format(new Date(event.endDate)) : startKey;
      const first = keyToUtc(startKey);
      const last = Math.min(Math.max(keyToUtc(endKey), first), first + MAX_EVENT_SPAN_DAYS * DAY_MS);
      for (let day = first; day <= last; day += DAY_MS) {
        const key = utcToKey(day);
        const list = map.get(key) ?? [];
        list.push({ event, isStart: day === first });
        map.set(key, list);
      }
    });
    map.forEach((list) => list.sort((a, b) => (a.event.date ?? "").localeCompare(b.event.date ?? "")));
    return map;
  }, [events, keyFormat]);

  // Weeks start on Monday.
  const cells = useMemo(() => {
    const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const weeks = Math.ceil((offset + daysInMonth) / 7);
    return Array.from({ length: weeks * 7 }, (_, i) => {
      const ms = Date.UTC(year, month, 1 - offset + i);
      const date = new Date(ms);
      return { key: utcToKey(ms), ms, day: date.getUTCDate(), inMonth: date.getUTCMonth() === month };
    });
  }, [year, month]);

  const colorFor = useMemo(() => buildCategoryColors((events ?? []).map((event) => event.category)), [events]);

  const monthHasEvents = cells.some((cell) => cell.inMonth && eventsByDay.has(cell.key));

  // Categories that appear in the visible month, for the legend.
  const monthCategories = useMemo(() => {
    const names = new Set<string>();
    cells.forEach((cell) => {
      if (!cell.inMonth) return;
      eventsByDay.get(cell.key)?.forEach(({ event }) => {
        if (event.category) names.add(event.category);
      });
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, locale));
  }, [cells, eventsByDay, locale]);

  const prev = monthParam(year, month - 1);
  const next = monthParam(year, month + 1);

  if (error) {
    return (
      <>
        <h1>{t(errorTitle<TKey>(error, "events.loadError"))}</h1>
        <p>{t(errorDesc<TKey>(error, "events.loadError"))}</p>
      </>
    );
  }

  return (
    <>
      <header className="ilmo--page-header">
        <h1>{t("events.title")}</h1>
        <ViewControls current="calendar" />
      </header>

      <nav className="ilmo--cal-nav">
        <Link className="btn btn-outline-secondary" to={`${paths.eventsCalendar}?m=${prev}`}>
          <span aria-hidden="true">‹</span>
          <span className="visually-hidden">{t("events.calendar.prev")}</span>
        </Link>
        <h2 className="ilmo--cal-title" aria-live="polite">
          {monthLabel.format(new Date(Date.UTC(year, month, 1)))}
        </h2>
        <Link className="btn btn-outline-secondary" to={`${paths.eventsCalendar}?m=${next}`}>
          <span aria-hidden="true">›</span>
          <span className="visually-hidden">{t("events.calendar.next")}</span>
        </Link>
        <Link className="btn btn-outline-primary ms-auto" to={paths.eventsCalendar}>
          {t("events.calendar.today")}
        </Link>
      </nav>

      {pending ? (
        <Spinner animation="border" />
      ) : (
        <>
          <div className="ilmo--cal-grid" role="grid">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="ilmo--cal-weekday" role="columnheader">
                {weekdayShort.format(new Date(Date.UTC(2024, 0, 1 + i)))}
              </div>
            ))}
            {cells.map((cell) => {
              const items = eventsByDay.get(cell.key) ?? [];
              return (
                <div
                  key={cell.key}
                  role="gridcell"
                  className={[
                    "ilmo--cal-day",
                    cell.inMonth ? "" : "ilmo--cal-outside",
                    cell.key === todayKey ? "ilmo--cal-today" : "",
                    items.length > 0 ? "ilmo--cal-has-events" : "",
                  ].join(" ")}
                >
                  <div className="ilmo--cal-daynum">
                    <span className="ilmo--cal-daylabel">{weekdayLong.format(new Date(cell.ms))} </span>
                    {cell.day}
                  </div>
                  {items.map(({ event, isStart }) => (
                    <Link
                      key={event.id}
                      to={paths.eventDetails(event.slug)}
                      className={`ilmo--cal-event ${stateClass(event)}`}
                      style={categoryStyle(colorFor(event.category))}
                      title={event.title}
                    >
                      {isStart && <span className="ilmo--cal-time">{timeFormat.format(new Date(event.date!))}</span>}
                      {event.title}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
          {!monthHasEvents && <p className="ilmo--cal-empty text-muted">{t("events.calendar.empty")}</p>}
          {monthCategories.length > 0 && (
            <ul className="ilmo--cal-legend">
              {monthCategories.map((name) => (
                <li key={name} style={{ "--cat": colorFor(name).solid } as React.CSSProperties}>
                  {name}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
};

const EventCalendar = () => {
  const {
    i18n: { language },
  } = useTranslation();
  return (
    <EventListProvider language={language} maxAge={CALENDAR_MAX_AGE_DAYS}>
      <CalendarView />
    </EventListProvider>
  );
};

export default EventCalendar;
