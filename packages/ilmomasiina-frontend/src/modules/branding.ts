import { create } from "zustand";

// Import via full path to reduce entry chunk size.
import { apiFetch } from "@tietokilta/ilmomasiina-client/dist/api";
import type { BrandingResponse } from "@tietokilta/ilmomasiina-models";
import defaultBranding from "../branding";

/** Branding values as configured by admins. `null` fields mean "use the build-time default". */
export type BrandingState = {
  /** Saved branding from the server, or `null` if not loaded yet. */
  branding: BrandingResponse | null;
  /** Unsaved branding being previewed by an admin, or `null` if not previewing. Takes precedence over `branding`. */
  preview: BrandingResponse | null;
  /** Fetches the branding from the server. Failures are ignored, keeping the build-time defaults. */
  loadBranding: () => Promise<void>;
  /** Replaces the saved branding, e.g. after an admin saves changes. */
  setBranding: (branding: BrandingResponse) => void;
  /** Shows the given branding on the page without saving it. */
  previewBranding: (preview: BrandingResponse) => void;
  /** Stops previewing and returns to the saved branding. */
  endPreview: () => void;
};

/** Selects the branding to show: the preview if active, otherwise the saved branding. */
export const selectShownBranding = (state: BrandingState) => state.preview ?? state.branding;

/** A separate small store for branding, so that the header doesn't depend on the main (admin) store. */
export const useBrandingStore = create<BrandingState>()((set) => ({
  branding: null,
  preview: null,
  loadBranding: async () => {
    try {
      const branding = await apiFetch<BrandingResponse>("branding");
      set({ branding });
    } catch {
      // Ignore errors: the build-time defaults will be used.
    }
  },
  setBranding: (branding) => set({ branding }),
  previewBranding: (preview) => set({ preview }),
  endPreview: () => set({ preview: null }),
}));

/** Effective branding, combining admin-configured values with build-time defaults. *

/** Returns the effective branding, with build-time defaults filled in for values not set by admins. */
export function useEffectiveBranding() {
  const branding = useBrandingStore(selectShownBranding);
  const headerTitle = branding?.headerTitle ?? defaultBranding.headerTitle;
  return {
    headerTitle,
    // If only a custom full title is set, use it on small screens too.
    headerTitleShort:
      branding?.headerTitleShort ?? (branding?.headerTitle ? headerTitle : defaultBranding.headerTitleShort),
    logo: branding?.logo ?? null,
    showLogo: branding?.showLogo ?? null,
    footerGdprText: branding?.footerGdprText ?? defaultBranding.footerGdprText,
    footerGdprLink: branding?.footerGdprLink ?? defaultBranding.footerGdprLink,
    footerHomeText: branding?.footerHomeText ?? defaultBranding.footerHomeText,
    footerHomeLink: branding?.footerHomeLink ?? defaultBranding.footerHomeLink,
    loginPlaceholderEmail: branding?.loginPlaceholderEmail ?? defaultBranding.loginPlaceholderEmail,
  };
}
