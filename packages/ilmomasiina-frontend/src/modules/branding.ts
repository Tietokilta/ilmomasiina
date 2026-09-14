import { create } from "zustand";

// Import via full path to reduce entry chunk size.
import { apiFetch } from "@tietokilta/ilmomasiina-client/dist/api";
import type { BrandingResponse } from "@tietokilta/ilmomasiina-models";

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

/** Branding shown by the frontend. The server resolves text defaults; images and colors are null for built-in. */
export type EffectiveBranding = {
  headerTitle: string;
  headerTitleShort: string;
  /** Custom logo data URL, or `null` for the built-in logo. */
  logo: string | null;
  /** Whether to show the header logo, or `null` for the build-time default. */
  showLogo: boolean | null;
  footerGdprText: string;
  footerGdprLink: string;
  footerHomeText: string;
  footerHomeLink: string;
  loginPlaceholderEmail: string;
};

/** Returns the branding to show. Before the branding has loaded, texts are empty and images and colors default. */
export function useEffectiveBranding(): EffectiveBranding {
  const branding = useBrandingStore(selectShownBranding);
  return {
    headerTitle: branding?.headerTitle ?? "",
    headerTitleShort: branding?.headerTitleShort ?? "",
    logo: branding?.logo ?? null,
    showLogo: branding?.showLogo ?? null,
    footerGdprText: branding?.footerGdprText ?? "",
    footerGdprLink: branding?.footerGdprLink ?? "",
    footerHomeText: branding?.footerHomeText ?? "",
    footerHomeLink: branding?.footerHomeLink ?? "",
    loginPlaceholderEmail: branding?.loginPlaceholderEmail ?? "",
  };
}
