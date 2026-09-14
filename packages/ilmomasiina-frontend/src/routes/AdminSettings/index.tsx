import React, { useEffect } from "react";

import { Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import requireAuth from "../../containers/requireAuth";
import { useBrandingStore } from "../../modules/branding";
import paths from "../../paths";
import BrandingForm from "./BrandingForm";

import "./AdminSettings.scss";

const AdminSettings = () => {
  const { branding, loadBranding } = useBrandingStore();
  const { t } = useTranslation();

  // Reload on entering the page, in case the branding was changed by another admin.
  useEffect(() => {
    loadBranding();
  }, [loadBranding]);

  return (
    <>
      <Link to={paths.adminEventsList}>&#8592; {t("adminSettings.returnToEvents")}</Link>
      <h1>{t("adminSettings.title")}</h1>
      <p>{t("adminSettings.branding.info")}</p>
      {branding ? <BrandingForm branding={branding} /> : <Spinner animation="border" />}
    </>
  );
};

export default requireAuth(AdminSettings);
