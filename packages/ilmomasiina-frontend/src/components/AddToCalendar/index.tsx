import React from "react";

import { Dropdown } from "react-bootstrap";
import { useTranslation } from "react-i18next";

import paths from "../../paths";
import { eventIcalUrl, googleEventUrl } from "../../utils/calendarLinks";
import Icon from "../Icon";

type Props = {
  slug: string;
  title: string;
  start: Date;
  end: Date | null;
  location?: string | null;
  /** Show only an icon instead of a labelled button. */
  compact?: boolean;
};

/** Dropdown for adding a single event to the user's own calendar. */
const AddToCalendar = ({ slug, title, start, end, location, compact }: Props) => {
  const { t } = useTranslation();
  const label = t("events.card.addToCalendar");

  return (
    <Dropdown align="end">
      <Dropdown.Toggle
        variant="outline-secondary"
        className={compact ? "ilmo--add-to-calendar ilmo--add-to-calendar-compact" : "ilmo--add-to-calendar"}
        aria-label={label}
        title={label}
      >
        <Icon name="calendar" />
        {!compact && <span>{label}</span>}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Item
          href={googleEventUrl({
            title,
            start,
            end,
            location,
            details: `${window.location.origin}${paths.eventDetails(slug)}`,
          })}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("events.card.google")}
        </Dropdown.Item>
        <Dropdown.Item href={eventIcalUrl(slug)} download>
          {t("events.card.download")}
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default AddToCalendar;
