import React from "react";

import { Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { EditSignupProvider, errorDesc, errorTitle, useEditSignupContext } from "@tietokilta/ilmomasiina-client";
import branding from "../../branding";
import type { TKey } from "../../i18n";
import useDocumentTitle from "../../utils/useDocumentTitle";
import EditForm from "./components/EditForm";
import NarrowContainer from "./components/NarrowContainer";

import "./EditSignup.scss";

const EditSignupView = () => {
  const { error, pending, event, signup, editToken } = useEditSignupContext();
  const { t } = useTranslation();

  // Determine the appropriate title based on the context
  const getTitle = () => {
    if (editToken && signup) {
      return t("editSignup.title.edit");
    }
    if (event) {
      return t("editSignup.title.signup");
    }
    return t("events.title");
  };

  useDocumentTitle(`${getTitle()} - ${branding.headerTitleShort}`);

  if (error) {
    return (
      <NarrowContainer className="ilmo--status-container">
        <h1>{t(errorTitle<TKey>(error, "editSignup.loadError"))}</h1>
        <p>{t(errorDesc<TKey>(error, "editSignup.loadError"))}</p>
      </NarrowContainer>
    );
  }

  if (pending) {
    return (
      <div className="ilmo--loading-container">
        <Spinner animation="border" />
      </div>
    );
  }

  return <EditForm />;
};

const EditSignup = ({ paid = false }: { paid?: boolean }) => {
  const { id, editToken } = useParams<"id" | "editToken">();
  const {
    i18n: { language },
  } = useTranslation();
  return (
    <EditSignupProvider id={id!} editToken={editToken!} paid={paid} language={language}>
      <EditSignupView />
    </EditSignupProvider>
  );
};

export default EditSignup;
