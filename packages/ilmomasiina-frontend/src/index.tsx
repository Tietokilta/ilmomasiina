import React from "react";

import { init as initSentry } from "@sentry/browser";
import { createRoot } from "react-dom/client";

import "./i18n";

// Import via full path to reduce entry chunk size.
import { configureApi } from "@tietokilta/ilmomasiina-client/dist/api";
import AppContainer from "./containers/AppContainer";
import { useBrandingStore } from "./modules/branding";
import { apiUrl } from "./paths";

if (PROD && SENTRY_DSN) {
  initSentry({ dsn: SENTRY_DSN });
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

void Promise.race([brandingLoaded, timeout]).then(() => {
  const root = createRoot(document.getElementById("root")!);
  root.render(<AppContainer />);
});
