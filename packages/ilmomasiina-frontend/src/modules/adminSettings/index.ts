import type { BrandingResponse, BrandingUpdateBody } from "@tietokilta/ilmomasiina-models";
import storeSlice from "../../utils/storeSlice";
import { useBrandingStore } from "../branding";
import type { Root } from "../store";

export type AdminSettingsSlice = {
  updateBranding: (data: BrandingUpdateBody) => Promise<BrandingResponse>;
};

export const adminSettingsSlice = storeSlice<Root>()("adminSettings", (set, get) => ({
  updateBranding: async (data: BrandingUpdateBody) => {
    const response = await get().auth.adminApiFetch<BrandingResponse>("admin/branding", {
      method: "PUT",
      body: data,
    });
    // Apply the new branding immediately to the header etc.
    useBrandingStore.getState().setBranding(response);
    return response;
  },
}));
