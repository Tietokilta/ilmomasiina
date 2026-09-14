import { ApiError } from "@tietokilta/ilmomasiina-client";
import type { AdminBrandingResponse, BrandingResponse, BrandingUpdateBody } from "@tietokilta/ilmomasiina-models";
import storeSlice from "../../utils/storeSlice";
import type { Root } from "../store";

export interface AdminSettingsState {
  /** Stored branding settings and server defaults, for editing. */
  branding: AdminBrandingResponse | null;
  loadError?: ApiError;
}

const initialState: AdminSettingsState = {
  branding: null,
};

export type AdminSettingsSlice = AdminSettingsState & {
  resetState: () => void;
  getBranding: () => Promise<void>;
  /** Saves the branding settings and returns the effective branding.
   * The caller is responsible for applying it to the branding store.
   */
  updateBranding: (data: BrandingUpdateBody) => Promise<BrandingResponse>;
};

export const adminSettingsSlice = storeSlice<Root>()(
  "adminSettings",
  (set, get, store, getSlice, setSlice, resetState) => ({
    ...initialState,
    resetState,

    getBranding: async () => {
      try {
        const response = await get().auth.adminApiFetch<AdminBrandingResponse>("admin/branding");
        setSlice({ branding: response, loadError: undefined });
      } catch (e) {
        setSlice({ branding: null, loadError: e as ApiError });
      }
    },

    updateBranding: (data: BrandingUpdateBody) =>
      get().auth.adminApiFetch<BrandingResponse>("admin/branding", {
        method: "PUT",
        body: data,
      }),
  }),
);
