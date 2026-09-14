import React from "react";

import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useEffectiveBranding } from "../../modules/branding";
import paths from "../../paths";

import "./Footer.scss";

const Footer = () => {
  const { t } = useTranslation();
  const branding = useEffectiveBranding();
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
