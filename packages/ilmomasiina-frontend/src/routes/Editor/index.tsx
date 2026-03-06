import React, { useEffect } from "react";

import { Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { errorDesc, errorTitle } from "@tietokilta/ilmomasiina-client";
import requireAuth from "../../containers/requireAuth";
import type { TKey } from "../../i18n";
import useStore from "../../modules/store";
import paths from "../../paths";
import EditForm from "./components/EditForm";

import "./Editor.scss";

interface Props {
  copy?: boolean;
}

const Editor = ({ copy = false }: Props) => {
  const loaded = useStore((state) => state.editor.event != null);
  const { loadError, newEvent, getEvent, resetState } = useStore((state) => state.editor);
  const { t } = useTranslation();

  const urlEventId = useParams<"id">().id!;
  const urlIsNew = urlEventId === "new";

  useEffect(() => {
    if (urlIsNew) {
      newEvent();
    } else if (copy) {
      getEvent(urlEventId, true);
    } else {
      getEvent(urlEventId);
    }
    return () => {
      resetState();
    };
  }, [urlIsNew, copy, urlEventId, newEvent, getEvent, resetState]);

  if (loadError) {
    return (
      <div className="ilmo--loading-container">
        <h1>{t(errorTitle<TKey>(loadError, "editor.loadError"))}</h1>
        <p>{t(errorDesc<TKey>(loadError, "editor.loadError"), { eventId: urlEventId })}</p>
        <Link to={paths.adminEventsList}>{t("errors.returnToEvents")}</Link>
      </div>
    );
  }

  if (!urlIsNew && !loaded) {
    return (
      <>
        <h1>{t("editor.title.edit")}</h1>
        <Link to={paths.adminEventsList}>&#8592; {t("editor.action.goBack")}</Link>
        <div className="ilmo--loading-container">
          <Spinner animation="border" />
        </div>
      </>
    );
  }

  return <EditForm />;
};

export default requireAuth(Editor);
