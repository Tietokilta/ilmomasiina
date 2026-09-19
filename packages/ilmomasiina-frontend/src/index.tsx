import React from "react";

import * as Sentry from "@sentry/browser";
import ReactDOM from "react-dom/client";

import "./i18n";

// Import via full path to reduce entry chunk size.
import { configureApi } from "@tietokilta/ilmomasiina-client/dist/api";
import AppContainer from "./containers/AppContainer";
import { useBrandingStore } from "./modules/branding";
import { apiUrl } from "./paths";

if (PROD && SENTRY_DSN) {
  Sentry.init({ dsn: SENTRY_DSN });
}

configureApi(apiUrl);

/** How long to wait for the branding before rendering anyway, to not block the app on a slow or failing API. */
const BRANDING_LOAD_TIMEOUT = 3000;

// Start loading the branding immediately and render only once it's available, to avoid flashing the default
// branding at the user. Failures are ignored by loadBranding, so this only waits for the timeout in that case.
const brandingLoaded = useBrandingStore.getState().loadBranding();
const timeout = new Promise<void>((resolve) => {
  setTimeout(resolve, BRANDING_LOAD_TIMEOUT);
});

Promise.race([brandingLoaded, timeout]).then(() => {
  const root = ReactDOM.createRoot(document.getElementById("root")!);
  root.render(<AppContainer />);
});
