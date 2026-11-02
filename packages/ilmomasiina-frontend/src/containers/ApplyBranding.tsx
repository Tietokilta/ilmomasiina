import { useEffect } from "react";

import { selectBrandingReady, selectShownBranding, useBrandingStore } from "../modules/branding";
import { computeThemeColorVariables, ThemeColorName } from "../utils/brandColor";

/** Attribute marking the <link> element for a custom favicon. */
const FAVICON_ATTRIBUTE = "data-ilmo-favicon";
/** Attribute marking the <meta name="theme-color"> element we add. */
const THEME_COLOR_ATTRIBUTE = "data-ilmo-theme-color";

/** The icon <link> elements from index.html, removed from the DOM while a custom favicon is active. */
let defaultIconLinks: HTMLLinkElement[] | null = null;
const appliedColorVariables: Record<ThemeColorName, string[]> = {
  brand: [],
  secondary: [],
  success: [],
  warning: [],
  danger: [],
  muted: [],
};
const defaultTitle = document.title;

/** Applies a theme color by overriding its CSS variables on <html>, or removes the overrides if `color` is
 * null, returning to the compiled defaults declared in `styles/_branding.scss`.
 */
function applyThemeColor(name: ThemeColorName, color: string | null) {
  const root = document.documentElement;
  const variables = color ? computeThemeColorVariables(name, color) : null;
  appliedColorVariables[name].forEach((variable) => root.style.removeProperty(variable));
  appliedColorVariables[name] = [];
  if (variables) {
    Object.entries(variables).forEach(([variable, value]) => root.style.setProperty(variable, value));
    appliedColorVariables[name] = Object.keys(variables);
  }
}

/** Sets the browser UI color (e.g. mobile address bar) to the brand color, or removes it. */
function applyThemeColorMeta(brandColor: string | null) {
  const { head } = document;
  head.querySelectorAll(`meta[${THEME_COLOR_ATTRIBUTE}]`).forEach((meta) => meta.remove());
  if (brandColor) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = brandColor;
    meta.setAttribute(THEME_COLOR_ATTRIBUTE, "");
    head.appendChild(meta);
  }
}

function applyFavicon(favicon: string | null) {
  const { head } = document;
  if (defaultIconLinks === null) {
    defaultIconLinks = Array.from(head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
  }
  head.querySelectorAll(`link[${FAVICON_ATTRIBUTE}]`).forEach((link) => link.remove());
  if (favicon) {
    defaultIconLinks.forEach((link) => link.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = favicon;
    link.setAttribute(FAVICON_ATTRIBUTE, "");
    head.appendChild(link);
  } else {
    defaultIconLinks.forEach((link) => {
      if (!link.isConnected) head.appendChild(link);
    });
  }
}

/** Applies the parts of the branding that live outside React: the theme colors (as CSS variables), the favicon
 * and the document title. The branding itself is loaded in index.tsx before the app is rendered.
 */
export default function ApplyBranding() {
  const branding = useBrandingStore(selectShownBranding);
  const ready = useBrandingStore(selectBrandingReady);

  useEffect(() => {
    if (!ready) return;
    applyThemeColor("brand", branding.brandColor);
    applyThemeColor("secondary", branding.secondaryColor);
    applyThemeColor("success", branding.successColor);
    applyThemeColor("warning", branding.warningColor);
    applyThemeColor("danger", branding.dangerColor);
    applyThemeColor("muted", branding.mutedColor);
    applyThemeColorMeta(branding.brandColor);
    applyFavicon(branding.favicon);
    document.title = branding.headerTitle || defaultTitle;
  }, [branding, ready]);

  return null;
}
