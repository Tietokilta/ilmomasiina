import { create } from "zustand";

// Import via full path to reduce entry chunk size.
import { apiFetch } from "@tietokilta/ilmomasiina-client/dist/api";
import type { BrandingResponse } from "@tietokilta/ilmomasiina-models";
import defaultBranding from "../branding";

/** Branding values as configured by admins. `null` fields mean "use the build-time default". */
export type BrandingState = {
  /** Branding from the server, or `null` if not loaded yet. */
  branding: BrandingResponse | null;
  /** Fetches the branding from the server. Failures are ignored, keeping the build-time defaults. */
  loadBranding: () => Promise<void>;
  /** Replaces the current branding, e.g. after an admin saves changes. */
  setBranding: (branding: BrandingResponse) => void;
};

/** A separate small store for branding, so that the header doesn't depend on the main (admin) store. */
export const useBrandingStore = create<BrandingState>()((set) => ({
  branding: null,
  loadBranding: async () => {
    try {
      const branding = await apiFetch<BrandingResponse>("branding");
      set({ branding });
    } catch {
      // Ignore errors: the build-time defaults will be used.
    }
  },
  setBranding: (branding) => set({ branding }),
}));

/** Effective branding, combining admin-configured values with build-time defaults. */
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

/** Returns the effective branding, with build-time defaults filled in for values not set by admins. */
export function useEffectiveBranding(): EffectiveBranding {
  const branding = useBrandingStore((state) => state.branding);
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
