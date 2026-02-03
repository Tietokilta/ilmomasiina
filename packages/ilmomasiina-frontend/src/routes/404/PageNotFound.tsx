import React from "react";

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import branding from "../../branding";
import paths from "../../paths";
import useDocumentTitle from "../../utils/useDocumentTitle";

const PageNotFound = () => {
  const { t } = useTranslation();

  useDocumentTitle(`${t("errors.404.title")} - ${branding.headerTitleShort}`);

  return (
    <div className="ilmo--status-container">
      <h1>{t("errors.404.title")}</h1>
      <p>{t("errors.404.description")}</p>
      <p>
        <Link to={paths.eventsList}>{t("errors.returnToEvents")}</Link>
      </p>
    </div>
  );
};

export default PageNotFound;
