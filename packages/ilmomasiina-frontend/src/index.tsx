import React from "react";

import Sentry from "@sentry/browser";
import { createRoot } from "react-dom/client";

import "./i18n";

// Import via full path to reduce entry chunk size.
import { configureApi } from "@tietokilta/ilmomasiina-client/dist/api";
import AppContainer from "./containers/AppContainer";
import { apiUrl } from "./paths";

if (PROD && SENTRY_DSN) {
  Sentry.init({ dsn: SENTRY_DSN });
}

configureApi(apiUrl);

const root = createRoot(document.getElementById("root")!);
root.render(<AppContainer />);
