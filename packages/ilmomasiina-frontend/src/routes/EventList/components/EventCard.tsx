import React, { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { EventRow, eventToRows } from "@tietokilta/ilmomasiina-client/dist/utils/eventListUtils";
import { SignupState } from "@tietokilta/ilmomasiina-client/dist/utils/signupState";
import type { UserEventListItem } from "@tietokilta/ilmomasiina-models";
import AddToCalendar from "../../../components/AddToCalendar";
import Icon from "../../../components/Icon";
import paths from "../../../paths";
import { CategoryColor, categoryStyle } from "../../../utils/categoryColor";
import { useEventRangeFormatter } from "../../../utils/dateFormat";
import { useSignupStateText } from "../../../utils/signupStateText";

type Props = {
  event: UserEventListItem;
  color: CategoryColor;
};

/** A card in the event list: image, when and where, signup progress, and the next action. */
const EventCard = ({ event, color }: Props) => {
  const { t } = useTranslation();
  const formatRange = useEventRangeFormatter();
  const [imageFailed, setImageFailed] = useState(false);

  // Compact rows only have the event row, including the signup state and totals over all quotas.
  const row = useMemo(() => eventToRows(event, { compact: true })[0] as EventRow, [event]);
  const stateText = useSignupStateText(row.signupState);
  const signupEnabled = row.signupState.state !== SignupState.disabled;
  const signupOpen = row.signupState.state === SignupState.open;
  // Without dates there are no quotas yet, so there is nothing to count.
  const showCount = signupEnabled && row.signupState.state !== SignupState.coming;

  const start = event.date ? new Date(event.date) : null;
  const end = event.endDate ? new Date(event.endDate) : null;

  const { totalSignupCount, totalQuotaSize } = row;

  const detailsPath = paths.eventDetails(event.slug);
  const showImage = !!event.imageUrl && !imageFailed;

  return (
    <article className={`ilmo--event-card ${stateText.class}`} style={categoryStyle(color)}>
      <Link to={detailsPath} className="ilmo--event-card-media" tabIndex={-1} aria-hidden="true">
        {showImage ? (
          <img src={event.imageUrl!} alt="" loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <div className="ilmo--event-card-placeholder" />
        )}
      </Link>

      <div className="ilmo--event-card-body">
        {/* Always rendered, so cards without a category or signup keep the same height. */}
        <div className="ilmo--event-card-eyebrow">
          <div className="ilmo--event-card-eyebrow-row">
            {event.category ? <span className="ilmo--event-card-category">{event.category}</span> : <span />}
            {showCount && (
              <span className="ilmo--event-card-count">
                {totalSignupCount}
                {totalQuotaSize ? ` / ${totalQuotaSize}` : ""}{" "}
                <span className="ilmo--event-card-count-label">{t("events.card.signedUp")}</span>
              </span>
            )}
          </div>
          {signupEnabled && (
            <span className="ilmo--event-card-state">
              {(stateText.fullLabel ?? stateText.shortLabel).replace(/\.$/, "")}
            </span>
          )}
        </div>

        <h3 className="ilmo--event-card-title">
          <Link to={detailsPath}>{event.title}</Link>
        </h3>

        <dl className="ilmo--event-card-meta">
          {start && (
            <>
              <dt>
                <Icon name="clock" />
              </dt>
              <dd>{formatRange(start, end)}</dd>
            </>
          )}
          {event.location && (
            <>
              <dt>
                <Icon name="pin" />
              </dt>
              <dd>{event.location}</dd>
            </>
          )}
        </dl>

        <div className="ilmo--event-card-actions">
          <Link to={detailsPath} className={`btn ${signupOpen ? "btn-primary" : "btn-outline-primary"}`}>
            {signupOpen ? t("events.card.signUp") : t("events.card.details")}
            <Icon name="arrow" />
          </Link>
          {start && (
            <AddToCalendar
              compact
              slug={event.slug}
              title={event.title}
              start={start}
              end={end}
              location={event.location}
            />
          )}
        </div>
      </div>
    </article>
  );
};

export default EventCard;
