import { create } from "zustand";

// Import via full path to reduce entry chunk size.
import { apiFetch } from "@tietokilta/ilmomasiina-client/dist/api";
import type { BrandingResponse } from "@tietokilta/ilmomasiina-models";

/** Branding before it has been loaded from the server: empty texts, built-in images and colors. */
export const unloadedBranding: BrandingResponse = {
  headerTitle: "",
  headerTitleShort: "",
  footerGdprText: "",
  footerGdprLink: "",
  footerHomeText: "",
  footerHomeLink: "",
  loginPlaceholderEmail: "",
  icalCalendarName: "",
  mailFooterText: "",
  mailFooterLink: "",
  brandColor: null,
  secondaryColor: null,
  successColor: null,
  warningColor: null,
  dangerColor: null,
  mutedColor: null,
  logo: null,
  showLogo: null,
  favicon: null,
};

/** Branding as configured by admins, with text defaults resolved by the server. */
export type BrandingState = {
  /** Saved branding from the server, or `unloadedBranding` until loaded. */
  branding: BrandingResponse;
  /** Whether the branding has been loaded from the server. */
  loaded: boolean;
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

/** Selects whether there is a branding to show, i.e. a preview is active or the branding has loaded. */
export const selectBrandingReady = (state: BrandingState) => state.preview !== null || state.loaded;

/** A separate small store for branding, so that the header doesn't depend on the main (admin) store. */
export const useBrandingStore = create<BrandingState>()((set) => ({
  branding: unloadedBranding,
  loaded: false,
  preview: null,
  loadBranding: async () => {
    try {
      const branding = await apiFetch<BrandingResponse>("branding");
      set({ branding, loaded: true });
    } catch {
      // Ignore errors: the build-time defaults will be used.
    }
  },
  setBranding: (branding) => set({ branding, loaded: true }),
  previewBranding: (preview) => set({ preview }),
  endPreview: () => set({ preview: null }),
}));

/** Returns the branding to show on the page. */
export function useBranding(): BrandingResponse {
  return useBrandingStore(selectShownBranding);
}
