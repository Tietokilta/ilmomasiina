import React from "react";

import { Dropdown } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import Icon from "../../../components/Icon";
import { googleSubscribeUrl, icalFeedUrl, webcalUrl } from "../../../utils/calendarLinks";

type Props = {
  /** Limits the feed to a single category. */
  category?: string;
};

/** Dropdown with links for subscribing to the iCalendar feed in the user's own calendar app. */
const CalendarSubscribe = ({ category }: Props) => {
  const { t } = useTranslation();
  const feedUrl = icalFeedUrl(category);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      toast.success(t("events.calendar.copied"));
    } catch {
      // Clipboard access can be denied; fall back to showing the link.
      toast.info(feedUrl, { autoClose: false });
    }
  };

  return (
    <Dropdown align="end" className="ilmo--calendar-subscribe">
      <Dropdown.Toggle variant="outline-secondary">
        <Icon name="calendar" />
        <span>{t("events.calendar.subscribe")}</span>
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Header>{t("events.calendar.title")}</Dropdown.Header>
        <ol className="ilmo--calendar-subscribe-steps">
          <li>{t("events.calendar.step1")}</li>
          <li>{t("events.calendar.step2")}</li>
        </ol>
        <Dropdown.Item href={googleSubscribeUrl(feedUrl)} target="_blank" rel="noopener noreferrer">
          {t("events.calendar.google")}
        </Dropdown.Item>
        <Dropdown.Item href={webcalUrl(feedUrl)}>{t("events.calendar.apple")}</Dropdown.Item>
        <Dropdown.Item as="button" type="button" onClick={copyLink}>
          {t("events.calendar.copy")}
        </Dropdown.Item>
        <p className="ilmo--calendar-subscribe-hint">{t("events.calendar.hint")}</p>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default CalendarSubscribe;
