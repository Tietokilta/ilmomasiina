import React, { lazy, Suspense } from "react";

import { Button, Container, Navbar } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import logo from "../../assets/logo.svg";
import branding from "../../branding";
import i18n from "../../i18n";
import paths from "../../paths";

import "./Header.scss";

// Code-split Logout to avoid strong dependency on the store.
const Logout = lazy(() => import("./Logout"));

const Header = () => {
  const {
    i18n: { language },
    t,
  } = useTranslation();

  return (
    <Navbar>
      <Container className="gap-sm-2">
        <Link to={paths.eventsList} className="navbar-brand">
          <img className="navbar-logo" src={logo} alt="Logo" />
          <span className="d-none d-sm-inline">{branding.headerTitle}</span>
          <span className="d-sm-none">{branding.headerTitleShort}</span>
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
