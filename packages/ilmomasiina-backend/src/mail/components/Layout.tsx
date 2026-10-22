import type { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";

import config from "../../config";

export default function Layout({ children }: PropsWithChildren) {
  const {
    i18n: { language },
  } = useTranslation();
  return (
    <html lang={language}>
      <head>
        <meta name="viewport" content="width=device-width" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Ilmomasiina</title>
        <link href="styles.css" rel="stylesheet" type="text/css" data-inline />
      </head>
      <body itemScope itemType="http://schema.org/EmailMessage">
        <table className="body-wrap">
          <tbody>
            <tr>
              <td className="container" width={600}>
                <div className="content">
                  <table className="header" width="100%" cellPadding={0} cellSpacing={0}>
                    <tbody>
                      <tr>
                        <td className="align-center content-block">
                          <h1 className="headerTitle">Ilmomasiina</h1>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="content">
                  <table className="main" width="100%" cellPadding={0} cellSpacing={0}>
                    <tbody>
                      <tr>
                        {/* Janky, but this is what it's looked like for the last 8 years :D */}
                        {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
                        <td className="alert alert-neutral">
                          <p className="alertText" />
                        </td>
                      </tr>
                      <tr>
                        <td className="content-wrap">{children}</td>
                      </tr>
                    </tbody>
                  </table>
                  {(config.brandingMailFooterText || config.brandingMailFooterLink) && (
                    <div className="footer">
                      <table width="100%">
                        <tbody>
                          <tr>
                            <td className="align-center content-block">
                              {config.brandingMailFooterText && (
                                <p className="footerText">{config.brandingMailFooterText}</p>
                              )}
                              {config.brandingMailFooterLink && (
                                <p className="footerText">
                                  <a className="footerLink" href={config.brandingMailFooterLink}>
                                    {config.brandingMailFooterLink.replace(/^https?:\/\//, "")}
                                  </a>
                                </p>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
