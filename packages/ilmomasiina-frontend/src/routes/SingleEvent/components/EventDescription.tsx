import React, { useContext } from "react";

import { Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import remarkGfm from "remark-gfm";

import { useSingleEventContext } from "@tietokilta/ilmomasiina-client";
import { AuthContext } from "../../../containers/AuthProvider";
import paths from "../../../paths";
import { useEventDateTimeFormatter } from "../../../utils/dateFormat";

const EventDescription = () => {
  const event = useSingleEventContext().localizedEvent!;
  const { preview } = useSingleEventContext();
  const { loggedIn } = useContext(AuthContext);
  const { t } = useTranslation();
  const eventDateFormat = useEventDateTimeFormatter();

  return (
    <>
      <nav className="ilmo--title-nav">
        <h1>{event.title}</h1>
        {loggedIn && !preview && paths.hasAdmin && (
          <Button as={Link} variant="primary" to={paths.adminEditEvent(event.id)}>
            {t("singleEvent.editEvent")}
          </Button>
        )}
      </nav>
      <div className="ilmo--event-heading">
        {event.category && (
          <p>
            <strong>{t("singleEvent.info.category")}</strong> {event.category}
          </p>
        )}
        {event.date && (
          <p>
            <strong>{event.endDate ? t("singleEvent.info.startDate") : t("singleEvent.info.date")}</strong>{" "}
            {eventDateFormat.format(new Date(event.date))}
          </p>
        )}
        {event.endDate && (
          <p>
            <strong>{t("singleEvent.info.endDate")}</strong> {eventDateFormat.format(new Date(event.endDate))}
          </p>
        )}
        {event.location && (
          <p>
            <strong>{t("singleEvent.info.location")}</strong> {event.location}
          </p>
        )}
        {event.price && (
          <p>
            <strong>{t("singleEvent.info.price")}</strong> {event.price}
          </p>
        )}
        {event.webpageUrl && (
          <p>
            <strong>{t("singleEvent.info.website")}</strong>{" "}
            <a href={event.webpageUrl} title={t("singleEvent.info.website")}>
              {event.webpageUrl}
            </a>
          </p>
        )}
        {event.facebookUrl && (
          <p>
            <strong>{t("singleEvent.info.facebookEvent")}</strong>{" "}
            <a href={event.facebookUrl} title={t("singleEvent.info.facebookEvent")}>
              {event.facebookUrl}
            </a>
          </p>
        )}
      </div>
      <div className="ilmo--event-description">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.description || ""}</ReactMarkdown>
      </div>
    </>
  );
};

export default EventDescription;
