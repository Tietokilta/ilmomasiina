import React from "react";

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import paths from "../../../paths";
import CalendarSubscribe from "./CalendarSubscribe";

type Props = {
  /** Which view is currently shown. */
  current: "events" | "list" | "calendar";
  category?: string;
};

/** Switch between the events, list and calendar views, plus the calendar subscription menu. */
const ViewControls = ({ current, category }: Props) => {
  const { t } = useTranslation();

  const views = [
    { key: "events", to: paths.eventsList, label: t("events.view.events") },
    { key: "list", to: paths.eventsListing, label: t("events.view.list") },
    { key: "calendar", to: paths.eventsCalendar, label: t("events.view.calendar") },
  ] as const;

  return (
    <div className="ilmo--view-controls">
      <nav className="ilmo--view-toggle" aria-label={t("events.view.label")}>
        {views.map((view) => (
          <Link key={view.key} to={view.to} aria-current={current === view.key ? "page" : undefined}>
            {view.label}
          </Link>
        ))}
      </nav>
      <CalendarSubscribe category={category} />
    </div>
  );
};

export default ViewControls;
