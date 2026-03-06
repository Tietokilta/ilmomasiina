import React from "react";

import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import branding from "../../branding";
import paths from "../../paths";

import "./Footer.scss";

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer>
      <Container>
        <Link to={paths.adminEventsList}>{t("footer.admin")}</Link>
        {branding.footerGdprText && (
          <a href={branding.footerGdprLink} target="_blank" rel="noreferrer">
            {branding.footerGdprText}
          </a>
        )}
        {branding.footerHomeText && (
          <a href={branding.footerHomeLink} target="_blank" rel="noreferrer">
            {branding.footerHomeText}
          </a>
        )}
      </Container>
    </footer>
  );
};

export default Footer;
