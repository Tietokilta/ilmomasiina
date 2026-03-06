import { toast } from "react-toastify";

import { ApiError, apiFetch, FetchOptions } from "@tietokilta/ilmomasiina-client";
import { AdminLoginResponse, ErrorCode } from "@tietokilta/ilmomasiina-models";
import i18n from "../../i18n";
import storeSlice from "../../utils/storeSlice";
import type { Root } from "../store";

export interface AccessToken {
  token: string;
  expiresAt: number; // Unix timestamp
}

export interface AuthState {
  accessToken?: AccessToken;
  loggedIn: boolean;
}

const initialState: AuthState = {
  accessToken: undefined,
  loggedIn: false,
};

export type AuthSlice = AuthState & {
  resetAuth: () => void;
  loginSucceeded: (accessToken: string) => void;
  login: (email: string, password: string) => Promise<boolean>;
  createInitialUser: (email: string, password: string) => Promise<boolean>;
  renewLogin: () => Promise<void>;
  adminApiFetch: <T>(url: string, options?: FetchOptions) => Promise<T>;
};

function getTokenExpiry(jwt: string): number {
  const parts = jwt.split(".");

  try {
    const payload = JSON.parse(window.atob(parts[1]));

    if (payload.exp) {
      return payload.exp * 1000;
    }
  } catch {
    // eslint-disable-next-line no-console
    console.error("Invalid jwt token received!");
  }

  return 0;
}

/** ID of latest login/auth related toast shown. Only used by `loginToast`. */
let loginToastId = 0;

export const loginToast = (type: "success" | "error", text: string, autoClose: number) => {
  // If the previous login/auth related toast is still visible, update it instead of spamming a new one.
  // Otherwise, increment the ID and show a new one.
  if (toast.isActive(`loginState${loginToastId}`)) {
    toast.update(`loginState${loginToastId}`, {
      render: text,
      autoClose,
      type,
    });
  } else {
    loginToastId += 1;
    toast(text, { autoClose, type, toastId: `loginState${loginToastId}` });
  }
};

const RENEW_LOGIN_THRESHOLD = 5 * 60 * 1000;

export const authSlice = storeSlice<Root>()("auth", (set, get, store, getSlice, setSlice, resetState) => ({
  ...initialState,
  resetAuth: resetState,

  loginSucceeded: (accessToken: string) =>
    setSlice({
      accessToken: {
        token: accessToken,
        expiresAt: getTokenExpiry(accessToken),
      },
      loggedIn: true,
    }),

  login: async (email: string, password: string) => {
    const sessionResponse = await apiFetch<AdminLoginResponse>("authentication", {
      method: "POST",
      body: {
        email,
        password,
      },
    });
    getSlice().loginSucceeded(sessionResponse.accessToken);
    return true;
  },
  createInitialUser: async (email: string, password: string) => {
    const sessionResponse = await apiFetch<AdminLoginResponse>("users", {
      method: "POST",
      body: {
        email,
        password,
      },
    });
    getSlice().loginSucceeded(sessionResponse.accessToken);
    return true;
  },

  renewLogin: async () => {
    const { accessToken } = getSlice();
    if (
      !accessToken ||
      Date.now() < accessToken.expiresAt - RENEW_LOGIN_THRESHOLD ||
      Date.now() > accessToken.expiresAt
    ) {
      return;
    }

    try {
      const sessionResponse = await apiFetch<AdminLoginResponse>("authentication/renew", {
        method: "POST",
        body: { accessToken },
        headers: { Authorization: accessToken.token },
      });
      if (sessionResponse) {
        getSlice().loginSucceeded(sessionResponse.accessToken);
      }
    } catch (err) {
      // Ignore errors from login renewal - loginExpired() will trigger via requireAuth.
    }
  },

  async adminApiFetch<T = unknown>(uri: string, opts: FetchOptions = {}): Promise<T> {
    try {
      const { accessToken } = getSlice();
      if (!accessToken) {
        throw new ApiError(401, { isUnauthenticated: true });
      }
      return await apiFetch<T>(uri, {
        ...opts,
        headers: { ...opts.headers, Authorization: accessToken.token },
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === ErrorCode.BAD_SESSION) {
        loginToast("error", i18n.t("auth.loginExpired"), 10000);
        getSlice().resetAuth();
      }
      throw err;
    }
  },
}));
