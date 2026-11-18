import React, { useMemo } from "react";

import { Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { errorDesc, errorTitle, EventListProvider, useEventListContext } from "@tietokilta/ilmomasiina-client";
import { EventRow, eventToRows } from "@tietokilta/ilmomasiina-client/dist/utils/eventListUtils";
import { SignupState } from "@tietokilta/ilmomasiina-client/dist/utils/signupState";
import type { UserEventListItem } from "@tietokilta/ilmomasiina-models";
import Icon from "../../components/Icon";
import { TKey } from "../../i18n";
import paths from "../../paths";
import { buildCategoryColors, categoryStyle } from "../../utils/categoryColor";
import { useEventRangeFormatter } from "../../utils/dateFormat";
import { useSignupStateText } from "../../utils/signupStateText";
import ViewControls from "../EventList/components/ViewControls";

import "../EventList/EventList.scss";
import "./EventListing.scss";

type MonthGroup = { key: string; label: string | null; events: UserEventListItem[] };

/** One row of the plain list: when, what, where, and the signup state. */
const ListingRow = ({ event, categoryColor }: { event: UserEventListItem; categoryColor: React.CSSProperties }) => {
  const { t } = useTranslation();
  const formatRange = useEventRangeFormatter();
  const row = useMemo(() => eventToRows(event, { compact: true })[0] as EventRow, [event]);
  const stateText = useSignupStateText(row.signupState);
  const signupEnabled = row.signupState.state !== SignupState.disabled;
  const showCount = signupEnabled && row.signupState.state !== SignupState.coming;

  const start = event.date ? new Date(event.date) : null;
  const end = event.endDate ? new Date(event.endDate) : null;

  return (
    <li className={`ilmo--listing-row ${stateText.class}`} style={categoryColor}>
      <div className="ilmo--listing-when">{start ? formatRange(start, end) : t("events.list.signupOnly")}</div>

      <div className="ilmo--listing-what">
        <Link to={paths.eventDetails(event.slug)} className="ilmo--listing-title">
          {event.title}
        </Link>
        {event.category && <span className="ilmo--event-card-category">{event.category}</span>}
      </div>

      <div className="ilmo--listing-where">
        {event.location && (
          <>
            <Icon name="pin" />
            <span>{event.location}</span>
          </>
        )}
      </div>

      <div className="ilmo--listing-signup">
        {signupEnabled && (
          <>
            <span className="ilmo--listing-state">{stateText.shortLabel}</span>
            {showCount && (
              <span className="ilmo--listing-count">
                {row.totalSignupCount}
                {row.totalQuotaSize ? ` / ${row.totalQuotaSize}` : ""}
              </span>
            )}
          </>
        )}
      </div>
    </li>
  );
};

const ListingView = () => {
  const { localizedEvents: events, error, pending } = useEventListContext();
  const { t } = useTranslation();
  const locale = t("dateFormat.locale");

  const colorFor = useMemo(() => buildCategoryColors((events ?? []).map((event) => event.category)), [events]);

  // All events in date order, grouped by month. Signup-only events have no date and go last.
  const groups = useMemo<MonthGroup[]>(() => {
    const monthFormat = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: TIMEZONE });
    const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit" });
    const dated = (events ?? [])
      .filter((event) => event.date)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
    const undated = (events ?? []).filter((event) => !event.date);

    const result: MonthGroup[] = [];
    dated.forEach((event) => {
      const date = new Date(event.date!);
      const key = dayKey.format(date);
      const last = result[result.length - 1];
      if (last && last.key === key) {
        last.events.push(event);
      } else {
        result.push({ key, label: monthFormat.format(date), events: [event] });
      }
    });
    if (undated.length > 0) result.push({ key: "undated", label: null, events: undated });
    return result;
  }, [events, locale]);

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
        <ViewControls current="list" />
      </header>

      {pending ? (
        <Spinner animation="border" size="sm" />
      ) : (
        groups.map((group) => (
          <section key={group.key} className="ilmo--listing-group">
            <h2 className="ilmo--section-label">{group.label ?? t("events.list.signupOnly")}</h2>
            <ul className="ilmo--listing">
              {group.events.map((event) => (
                <ListingRow key={event.id} event={event} categoryColor={categoryStyle(colorFor(event.category))} />
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
};

const EventListing = () => {
  const {
    i18n: { language },
  } = useTranslation();
  return (
    <EventListProvider language={language}>
      <ListingView />
    </EventListProvider>
  );
};

export default EventListing;
