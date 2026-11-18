export type Branding = {
  headerTitle: string;
  headerTitleShort: string;
  footerGdprText: string;
  footerGdprLink: string;
  /** English version of the privacy link. Falls back to the default version if empty. */
  footerGdprTextEn: string;
  footerGdprLinkEn: string;
  footerHomeText: string;
  footerHomeLink: string;
  loginPlaceholderEmail: string;
};

// The following strings can be changed here in code, or you can use Docker build args
// (or env variables) to change them at build time.

const branding: Branding = {
  headerTitle: BRANDING_HEADER_TITLE_TEXT,
  headerTitleShort: BRANDING_HEADER_TITLE_TEXT_SHORT,
  footerGdprText: BRANDING_FOOTER_GDPR_TEXT,
  footerGdprLink: BRANDING_FOOTER_GDPR_LINK,
  footerGdprTextEn: BRANDING_FOOTER_GDPR_TEXT_EN,
  footerGdprLinkEn: BRANDING_FOOTER_GDPR_LINK_EN,
  footerHomeText: BRANDING_FOOTER_HOME_TEXT,
  footerHomeLink: BRANDING_FOOTER_HOME_LINK,
  loginPlaceholderEmail: BRANDING_LOGIN_PLACEHOLDER_EMAIL,
};

export default branding;
