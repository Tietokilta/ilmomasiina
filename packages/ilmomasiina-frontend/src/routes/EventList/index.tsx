import React, { useMemo } from "react";

import { Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

import {
  errorDesc,
  errorTitle,
  EventListProps,
  EventListProvider,
  useEventListContext,
} from "@tietokilta/ilmomasiina-client";
import { SignupState, signupState } from "@tietokilta/ilmomasiina-client/dist/utils/signupState";
import { ErrorCode, UserEventListItem } from "@tietokilta/ilmomasiina-models";
import { TKey } from "../../i18n";
import paths from "../../paths";
import { buildCategoryColors } from "../../utils/categoryColor";
import EventCard from "./components/EventCard";
import ViewControls from "./components/ViewControls";

import "./EventList.scss";

type Section = { key: string; title: TKey; events: UserEventListItem[] };

const EventListView = ({ category }: EventListProps) => {
  const { localizedEvents: events, error, pending } = useEventListContext();
  const { t } = useTranslation();

  // Colors are assigned across all events so that different categories look different.
  const colorFor = useMemo(() => buildCategoryColors((events ?? []).map((event) => event.category)), [events]);

  // Group events by signup state. Events keep the order given by the server within each group.
  const sections = useMemo<Section[]>(() => {
    const groups: Record<"open" | "coming" | "closed" | "noSignup", UserEventListItem[]> = {
      open: [],
      coming: [],
      closed: [],
      noSignup: [],
    };
    (events ?? []).forEach((event) => {
      switch (signupState(event.registrationStartDate, event.registrationEndDate, event.signupComing).state) {
        case SignupState.open:
          groups.open.push(event);
          break;
        case SignupState.not_opened:
        case SignupState.coming:
          groups.coming.push(event);
          break;
        case SignupState.closed:
          groups.closed.push(event);
          break;
        default:
          groups.noSignup.push(event);
      }
    });
    const all: Section[] = [
      { key: "open", title: "events.section.open", events: groups.open },
      { key: "coming", title: "events.section.coming", events: groups.coming },
      // Events that have no signup at all don't fit the three signup states, so they get a section of their own.
      { key: "noSignup", title: "events.section.noSignup", events: groups.noSignup },
      // Closed signups are the least relevant, so they go last.
      { key: "closed", title: "events.section.closed", events: groups.closed },
    ];
    return all.filter((section) => section.events.length > 0);
  }, [events]);

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
        <Spinner animation="border" size="sm" />
      </>
    );
  }

  return (
    <>
      <header className="ilmo--page-header">
        <h1>{t("events.title")}</h1>
        <ViewControls current="events" category={category} />
      </header>
      {sections.map((section) => (
        <section key={section.key} className="ilmo--event-section">
          <h2 className="ilmo--section-label">
            {t(section.title)}
            <span className="ilmo--section-count">{section.events.length}</span>
          </h2>
          <div className="ilmo--event-grid">
            {section.events.map((event) => (
              <EventCard key={event.id} event={event} color={colorFor(event.category)} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
};

const EventList = ({ category }: EventListProps) => {
  const {
    i18n: { language },
  } = useTranslation();
  return (
    <EventListProvider category={category} language={language}>
      <EventListView category={category} />
    </EventListProvider>
  );
};

export default EventList;
