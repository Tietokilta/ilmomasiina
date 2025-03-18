import { Unauthorized } from "http-errors";
import { authorizationCodeGrant, buildAuthorizationUrl, Configuration, discovery } from "openid-client";

import config from "../config";

export default class AdminGoogleAuth {
  static config?: Configuration;

  static async init() {
    if (!config.googleAuthClientId || !config.googleAuthClientSecret) return;

    AdminGoogleAuth.config = await discovery(
      new URL("https://accounts.google.com"),
      config.googleAuthClientId,
      config.googleAuthClientSecret,
    );
  }

  static redirect(state: string) {
    if (!AdminGoogleAuth.config) throw new Error("Google authentication is not configured");

    const params: Record<string, string> = {
      redirect_uri: "",
      scope: "openid profile email",
      state,
    };
    if (config.googleAuthAllowedDomains?.length === 1) params.hd = config.googleAuthAllowedDomains[0];
    return buildAuthorizationUrl(AdminGoogleAuth.config, params);
  }

  static async authenticate(code: string) {
    if (!AdminGoogleAuth.config) throw new Error("Google authentication is not configured");

    // openid-client requires params as an URL, as it's intended for backend.
    // We're sending the code to the frontend, so we need to reconstruct an URL.
    const currentUrl = new URL(`http://x/?${new URLSearchParams({ code })}`);
    // The state check is performed by the frontend.
    const tokens = await authorizationCodeGrant(AdminGoogleAuth.config, currentUrl, { idTokenExpected: true });

    console.log(tokens);

    if (!tokens.id_token) throw new Unauthorized("Missing identity token");

    return tokens.id_token;
  }
}
