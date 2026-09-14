import React, { useEffect } from "react";

import { Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { errorDesc, errorTitle } from "@tietokilta/ilmomasiina-client";
import requireAuth from "../../containers/requireAuth";
import type { TKey } from "../../i18n";
import useStore from "../../modules/store";
import paths from "../../paths";
import BrandingForm from "./BrandingForm";

import "./AdminSettings.scss";

const AdminSettings = () => {
  const { branding, loadError, getBranding, resetState } = useStore((state) => state.adminSettings);
  const { t } = useTranslation();

  useEffect(() => {
    getBranding();
    return () => resetState();
  }, [getBranding, resetState]);

  if (loadError) {
    return (
      <>
        <h1>{t(errorTitle<TKey>(loadError, "adminSettings.loadError"))}</h1>
        <p>{t(errorDesc<TKey>(loadError, "adminSettings.loadError"))}</p>
      </>
    );
  }

  return (
    <>
      <Link to={paths.adminEventsList}>&#8592; {t("adminSettings.returnToEvents")}</Link>
      <h1>{t("adminSettings.title")}</h1>
      <p>{t("adminSettings.branding.info")}</p>
      {branding ? (
        <BrandingForm settings={branding.settings} defaults={branding.defaults} />
      ) : (
        <Spinner animation="border" />
      )}
    </>
  );
};

export default requireAuth(AdminSettings);
