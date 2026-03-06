import React, { BaseSyntheticEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Button, Spinner } from "react-bootstrap";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { errorDesc, errorTitle } from "@tietokilta/ilmomasiina-client";
import LinkButton from "../../components/LinkButton";
import requireAuth from "../../containers/requireAuth";
import type { TKey } from "../../i18n";
import useStore from "../../modules/store";
import paths from "../../paths";
import { isEventInPast } from "../../utils/eventState";
import AdminEventListItem from "./AdminEventListItem";

const AdminEventsList = () => {
  const { events, loadError, getAdminEvents, resetState } = useStore((state) => state.adminEvents);
  const [showPast, setShowPast] = useState(false);
  const { t } = useTranslation();

  const togglePast = useCallback((evt: BaseSyntheticEvent) => {
    evt.preventDefault();
    setShowPast((prev) => !prev);
  }, []);

  useEffect(() => {
    getAdminEvents();
    return () => resetState();
  }, [getAdminEvents, resetState]);

  const shownEvents = useMemo(() => {
    const filtered = events?.filter((event) => isEventInPast(event) === showPast);
    // Additionally, reverse events when viewing past events, so the newest event comes first.
    return showPast ? filtered?.reverse() : filtered;
  }, [events, showPast]);

  if (loadError) {
    return (
      <>
        <h1>{t(errorTitle<TKey>(loadError, "adminEvents.loadError"))}</h1>
        <p>{t(errorDesc<TKey>(loadError, "adminEvents.loadError"))}</p>
      </>
    );
  }

  if (!shownEvents) {
    return (
      <>
        <h1>{t("adminEvents.title")}</h1>
        <Spinner animation="border" />
      </>
    );
  }

  return (
    <>
      <nav className="ilmo--title-nav">
        <h1>{showPast ? t("adminEvents.title.past") : t("adminEvents.title")}</h1>
        <nav className="ilmo--title-nav-buttons">
          <Button variant="secondary" onClick={togglePast}>
            {showPast ? t("adminEvents.nav.upcoming") : t("adminEvents.nav.past")}
          </Button>
          <LinkButton variant="secondary" to={paths.adminUsersList}>
            {t("adminEvents.nav.users")}
          </LinkButton>
          <LinkButton variant="secondary" to={paths.adminAuditLog}>
            {t("adminEvents.nav.auditLog")}
          </LinkButton>
          <LinkButton variant="primary" to={paths.adminEditEvent("new")}>
            {t("adminEvents.nav.newEvent")}
          </LinkButton>
        </nav>
      </nav>
      <table className="table ilmo--admin-event-list">
        <thead>
          <tr>
            <th>{t("adminEvents.column.name")}</th>
            <th>{t("adminEvents.column.date")}</th>
            <th>{t("adminEvents.column.status")}</th>
            <th>{t("adminEvents.column.signups")}</th>
            <th>{t("adminEvents.column.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {shownEvents.map((event) => (
            <AdminEventListItem key={event.id} event={event} />
          ))}
          {!shownEvents.length && (
            <tr>
              <td colSpan={5}>
                <Trans t={t} i18nKey={showPast ? "adminEvents.noEvents.past" : "adminEvents.noEvents.upcoming"}>
                  No (type) events to show. Would you like to
                  {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                  <a href="#" onClick={togglePast} role="button">
                    view (other type) events
                  </a>
                  or
                  <Link to={paths.adminEditEvent("new")}>create a new event</Link>?
                </Trans>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
};

export default requireAuth(AdminEventsList);
