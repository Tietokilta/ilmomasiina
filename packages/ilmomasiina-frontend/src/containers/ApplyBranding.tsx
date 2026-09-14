import { useEffect } from "react";

import { selectShownBranding, useBrandingStore } from "../modules/branding";
import { computeThemeColorVariables, ThemeColorName } from "../utils/brandColor";

/** Attribute marking the <link> element for a custom favicon. */
const FAVICON_ATTRIBUTE = "data-ilmo-favicon";
/** Attribute marking the <meta name="theme-color"> element we add. */
const THEME_COLOR_ATTRIBUTE = "data-ilmo-theme-color";

/** The icon <link> elements from index.html, removed from the DOM while a custom favicon is active. */
let defaultIconLinks: HTMLLinkElement[] | null = null;
const appliedColorVariables: Record<ThemeColorName, string[]> = { brand: [], secondary: [], success: [], danger: [] };
const defaultTitle = document.title;

/** Applies a theme color as CSS variables on <html>, or removes them if `color` is null.
 *
 * Also sets the attribute `data-ilmo-<name>` on <html> while a custom color is active.
 * This is used by `styles/_branding.scss` to override compiled Bootstrap colors.
 */
function applyThemeColor(name: ThemeColorName, color: string | null) {
  const root = document.documentElement;
  const attribute = `data-ilmo-${name}`;
  const variables = color ? computeThemeColorVariables(name, color) : null;
  appliedColorVariables[name].forEach((variable) => root.style.removeProperty(variable));
  appliedColorVariables[name] = [];
  if (variables) {
    Object.entries(variables).forEach(([variable, value]) => root.style.setProperty(variable, value));
    appliedColorVariables[name] = Object.keys(variables);
    root.setAttribute(attribute, "");
  } else {
    root.removeAttribute(attribute);
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

/** Loads the admin-configured branding and applies the parts that live outside React: the theme colors
 * (as CSS variables), the favicon and the document title.
 */
export default function ApplyBranding() {
  const branding = useBrandingStore(selectShownBranding);
  const loadBranding = useBrandingStore((state) => state.loadBranding);

  useEffect(() => {
    loadBranding();
  }, [loadBranding]);

  useEffect(() => {
    if (!branding) return;
    applyThemeColor("brand", branding.brandColor);
    // Secondary follows the brand color unless separately set, as in the default theme.
    applyThemeColor("secondary", branding.secondaryColor ?? branding.brandColor);
    applyThemeColor("success", branding.successColor);
    applyThemeColor("danger", branding.dangerColor);
    applyThemeColorMeta(branding.brandColor);
    applyFavicon(branding.favicon);
    document.title = branding.headerTitle ?? defaultTitle;
  }, [branding]);

  return null;
}
