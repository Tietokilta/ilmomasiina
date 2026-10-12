import { createContext, useContext } from "react";

import type { BrandingResponse } from "@tietokilta/ilmomasiina-models";

/** Effective branding, provided when rendering emails. */
export const BrandingContext = createContext<BrandingResponse | null>(null);

export function useBranding(): BrandingResponse {
  const branding = useContext(BrandingContext);
  if (!branding) throw new Error("BrandingContext is not provided");
  return branding;
}
