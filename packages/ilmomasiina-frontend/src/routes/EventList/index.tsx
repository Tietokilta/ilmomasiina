import React, { useMemo } from "react";

import { Spinner, Table } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router-dom";

import {
  errorDesc,
  errorTitle,
  EventListProps,
  EventListProvider,
  useEventListContext,
} from "@tietokilta/ilmomasiina-client";
import { EventRow, eventsToRows, QuotaRow } from "@tietokilta/ilmomasiina-client/dist/utils/eventListUtils";
import { ErrorCode } from "@tietokilta/ilmomasiina-models";
import { TKey } from "../../i18n";
import paths from "../../paths";
import { useEventDateFormatter } from "../../utils/dateFormat";
import { useSignupStateText } from "../../utils/signupStateText";
import TableRow from "./components/TableRow";

import "./EventList.scss";

const ListEventRow = ({ row: { slug, title, date, signupState, signupCount, quotaSize } }: { row: EventRow }) => {
  const stateText = useSignupStateText(signupState);
  const eventDateFormat = useEventDateFormatter();
  return (
    <TableRow
      className={stateText.class}
      title={<Link to={paths.eventDetails(slug)}>{title}</Link>}
      date={date ? eventDateFormat.format(date) : ""}
      signupStatus={stateText}
      signupCount={signupCount}
      quotaSize={quotaSize}
    />
  );
};

const ListQuotaRow = ({ row: { type, title, signupCount, quotaSize } }: { row: QuotaRow }) => {
  const { t } = useTranslation();
  return (
    <TableRow
      className="ilmo--quota-row"
      title={type === "openquota" ? t("events.openQuota") : title}
      signupCount={signupCount}
      quotaSize={quotaSize}
    />
  );
};

const EventListView = () => {
  const { localizedEvents: events, error, pending } = useEventListContext();
  const { t } = useTranslation();

  const tableRows = useMemo(() => eventsToRows(events ?? []).filter((row) => row.type !== "waitlist"), [events]);

  // If initial setup is needed and is possible on this frontend, redirect to that page.
  if (error && error.code === ErrorCode.INITIAL_SETUP_NEEDED && paths.hasAdmin) {
    return <Navigate to={paths.adminInitialSetup} />;
  }

  if (error) {
    return (
      <>
        <h1>{t(errorTitle<TKey>(error, "events.loadError"))}</h1>
        <p>{t(errorDesc<TKey>(error, "events.loadError"))}</p>
      </>
    );
  }

  if (pending) {
    return (
      <>
        <h1>{t("events.title")}</h1>
        <Spinner animation="border" />
      </>
    );
  }

  return (
    <>
      <h1>{t("events.title")}</h1>
      <Table className="ilmo--event-list">
        <thead>
          <tr>
            <th>{t("events.column.name")}</th>
            <th>{t("events.column.date")}</th>
            <th>{t("events.column.signupStatus")}</th>
            <th>{t("events.column.signupCount")}</th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row) =>
            row.type === "event" ? <ListEventRow key={row.id} row={row} /> : <ListQuotaRow key={row.id} row={row} />,
          )}
        </tbody>
      </Table>
    </>
  );
};

const EventList = ({ category }: EventListProps) => {
  const {
    i18n: { language },
  } = useTranslation();
  return (
    <EventListProvider category={category} language={language}>
      <EventListView />
    </EventListProvider>
  );
};

export default EventList;
