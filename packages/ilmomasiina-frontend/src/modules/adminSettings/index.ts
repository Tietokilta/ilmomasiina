import type { BrandingResponse, BrandingUpdateBody } from "@tietokilta/ilmomasiina-models";
import storeSlice from "../../utils/storeSlice";
import type { Root } from "../store";

export type AdminSettingsSlice = {
  /** Saves the branding. The caller is responsible for applying the response to the branding store. */
  updateBranding: (data: BrandingUpdateBody) => Promise<BrandingResponse>;
};

export const adminSettingsSlice = storeSlice<Root>()("adminSettings", (set, get) => ({
  updateBranding: (data: BrandingUpdateBody) =>
    get().auth.adminApiFetch<BrandingResponse>("admin/branding", {
      method: "PUT",
      body: data,
    }),
}));
