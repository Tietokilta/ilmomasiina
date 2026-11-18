import React from "react";

import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import branding from "../../branding";
import paths from "../../paths";

import "./Footer.scss";

const Footer = () => {
  const {
    t,
    i18n: { language },
  } = useTranslation();
  // Use the English privacy link when the site is in English, if one is configured.
  const english = language.startsWith("en") && !!branding.footerGdprTextEn && !!branding.footerGdprLinkEn;
  const gdprText = english ? branding.footerGdprTextEn : branding.footerGdprText;
  const gdprLink = english ? branding.footerGdprLinkEn : branding.footerGdprLink;
  return (
    <footer>
      <Container>
        <Link to={paths.adminEventsList}>{t("footer.admin")}</Link>
        {gdprText && (
          <a href={gdprLink} target="_blank" rel="noreferrer">
            {gdprText}
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
