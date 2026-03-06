import React from "react";

import { Col, Row, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { errorDesc, errorTitle, SingleEventProvider, useSingleEventContext } from "@tietokilta/ilmomasiina-client";
import { TKey } from "../../i18n";
import paths from "../../paths";
import EventDescription from "./components/EventDescription";
import QuotaStatus from "./components/QuotaStatus";
import SignupCountdown from "./components/SignupCountdown";
import SignupList from "./components/SignupList";

import "./SingleEvent.scss";

const SingleEventView = () => {
  const { localizedEvent: event, signupsByQuota, pending, error } = useSingleEventContext();
  const { t } = useTranslation();

  if (error) {
    return (
      <div className="ilmo--loading-container">
        <h1>{t(errorTitle<TKey>(error, "singleEvent.loadError"))}</h1>
        <p>{t(errorDesc<TKey>(error, "singleEvent.loadError"))}</p>
        <Link to={paths.eventsList}>{t("errors.returnToEvents")}</Link>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="ilmo--loading-container">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <>
      <Link to={paths.eventsList} style={{ margin: 0 }}>
        {`\u2190 ${t("singleEvent.returnToEvents")}`}
      </Link>
      <Row>
        <Col sm={12} md={8}>
          <EventDescription />
        </Col>
        <Col sm={12} md={4}>
          <SignupCountdown />
          <QuotaStatus />
        </Col>
      </Row>
      {event!.signupsPublic && (
        <>
          <h2>{t("singleEvent.signups.title")}</h2>
          {signupsByQuota!.map((quota) => (
            <SignupList key={quota.id} quota={quota} isSingleQuota={event!.quotas.length === 1} />
          ))}
        </>
      )}
    </>
  );
};

const SingleEvent = () => {
  const slug = useParams<"slug">().slug!;
  const {
    i18n: { language },
  } = useTranslation();
  return (
    <SingleEventProvider slug={slug} language={language}>
      <SingleEventView />
    </SingleEventProvider>
  );
};

export default SingleEvent;
