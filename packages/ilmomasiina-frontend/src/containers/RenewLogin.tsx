import { useEffect } from "react";

import useStore from "../modules/store";

const LOGIN_RENEW_INTERVAL = 60 * 1000;

/** Auto-renews the auth token periodically while the page is active. */
export default function RenewLogin() {
  const renewLogin = useStore((state) => state.auth.renewLogin);
  useEffect(() => {
    // Renew login immediately on page load if necessary.
    renewLogin();
    // Then, check every minute and renew if necessary.
    const timer = window.setInterval(() => renewLogin(), LOGIN_RENEW_INTERVAL);
    return () => window.clearInterval(timer);
  }, [renewLogin]);

  return null;
}
