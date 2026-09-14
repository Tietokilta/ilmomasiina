import { createContext, useContext } from "react";

import type { BrandingSchema } from "@tietokilta/ilmomasiina-models";
import { defaultBranding } from "@tietokilta/ilmomasiina-models";

/** Admin-configured branding, provided when rendering emails. */
export const BrandingContext = createContext<BrandingSchema>(defaultBranding);

export function useBranding() {
  return useContext(BrandingContext);
}
