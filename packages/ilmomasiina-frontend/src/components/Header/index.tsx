import React, { lazy, Suspense } from "react";

import { Button, Container, Navbar } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import defaultLogo from "../../assets/logo.svg";
import i18n from "../../i18n";
import { useBranding } from "../../modules/branding";
import paths from "../../paths";

import "./Header.scss";

// Code-split Logout to avoid strong dependency on the store.
const Logout = lazy(() => import("./Logout"));

const Header = () => {
  const {
    i18n: { language },
    t,
  } = useTranslation();
  const { headerTitle, headerTitleShort, logo, showLogo } = useBranding();

  // A custom logo is shown unless explicitly hidden; otherwise the build-time default applies.
  let logoClass = "navbar-logo";
  if (showLogo === false) logoClass += " navbar-logo-hidden";
  else if (showLogo === true || logo) logoClass += " navbar-logo-shown";

  return (
    <Navbar>
      <Container className="gap-sm-2">
        <Link to={paths.eventsList} className="navbar-brand">
          <img className={logoClass} src={logo ?? defaultLogo} alt="Logo" />
          <span className="d-none d-sm-inline">{headerTitle}</span>
          <span className="d-sm-none">{headerTitleShort}</span>
        </Link>
        {language !== "fi" && (
          <Button onClick={() => i18n.changeLanguage("fi")}>{t("header.switchLanguage", { lng: "fi" })}</Button>
        )}
        {language !== "en" && (
          <Button onClick={() => i18n.changeLanguage("en")}>{t("header.switchLanguage", { lng: "en" })}</Button>
        )}
        <Suspense>
          <Logout />
        </Suspense>
      </Container>
    </Navbar>
  );
};

export default Header;
