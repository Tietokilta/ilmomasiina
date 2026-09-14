/** Utilities for applying admin-configured theme colors at runtime.
 *
 * The derived colors (hover shades, contrast text) follow the same rules as the Sass in
 * `styles/_definitions.scss` and `styles/_shared.scss`, so runtime colors look consistent with compiled ones.
 */
import { colord, extend } from "colord";
import a11yPlugin from "colord/plugins/a11y";
import mixPlugin from "colord/plugins/mix";

extend([a11yPlugin, mixPlugin]);

/** Checks that a string is a `#rrggbb` color, the only format accepted by the branding API. */
export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

/** CSS custom properties derived from a theme color. */
export type ThemeColorVariables = Record<string, string>;

/** Theme colors that can be customized at runtime. */
export type ThemeColorName = "brand" | "secondary" | "success" | "danger";

const WHITE = "#ffffff";
const BLACK = "#000000";

/** Bootstrap's minimum contrast ratio for choosing text color on a background. */
const MIN_CONTRAST_RATIO = 4.5;

/** Formats a color as `r, g, b` for use in `rgba(var(...), alpha)`. */
function toRgbList(hex: string): string {
  const { r, g, b } = colord(hex).toRgb();
  return `${r}, ${g}, ${b}`;
}

/** Bootstrap variables that depend on each theme color. */
function bootstrapVariables(name: ThemeColorName, hex: string, rgb: string): ThemeColorVariables {
  const color = colord(hex);
  if (name === "brand") {
    const linkHover = color.mix(BLACK, 0.2);
    return {
      // Used by utilities like .text-primary and by links.
      "--bs-primary": hex,
      "--bs-primary-rgb": rgb,
      "--bs-link-color": hex,
      "--bs-link-color-rgb": rgb,
      "--bs-link-hover-color": linkHover.toHex(),
      "--bs-link-hover-color-rgb": toRgbList(linkHover.toHex()),
    };
  }
  if (name === "secondary") {
    return {
      "--bs-secondary": hex,
      "--bs-secondary-rgb": rgb,
    };
  }
  // Used by utilities like .text-success and by .alert-success (and the same for danger).
  return {
    [`--bs-${name}`]: hex,
    [`--bs-${name}-rgb`]: rgb,
    [`--bs-${name}-text-emphasis`]: color.mix(BLACK, 0.6).toHex(),
    [`--bs-${name}-bg-subtle`]: color.mix(WHITE, 0.8).toHex(),
    [`--bs-${name}-border-subtle`]: color.mix(WHITE, 0.6).toHex(),
  };
}

/** Computes the CSS custom properties needed to apply a theme color at runtime.
 *
 * The generic variables are named `--ilmo-<name>-*` and used by `styles/_branding.scss`.
 */
export function computeThemeColorVariables(name: ThemeColorName, hex: string): ThemeColorVariables | null {
  if (!isHexColor(hex)) return null;
  const color = colord(hex.trim());

  // Like Bootstrap's color-contrast(): prefer white text when it reaches the minimum contrast ratio.
  const whiteContrast = color.contrast(WHITE);
  const contrast = whiteContrast >= MIN_CONTRAST_RATIO || whiteContrast >= color.contrast(BLACK) ? WHITE : BLACK;
  // Dark theme colors get lighter hover states (like Tietokilta's black), light ones get darker
  // hover states (Bootstrap's default behavior).
  const isDark = contrast === WHITE;
  const shade = (amount: number) => (isDark ? color.lighten(amount) : color.mix(BLACK, amount));

  const normalized = color.toHex();
  return {
    [`--ilmo-${name}-color`]: normalized,
    [`--ilmo-${name}-rgb`]: toRgbList(normalized),
    [`--ilmo-${name}-contrast`]: contrast,
    [`--ilmo-${name}-hover-bg`]: shade(0.15).toHex(),
    [`--ilmo-${name}-hover-border`]: shade(0.2).toHex(),
    [`--ilmo-${name}-active-bg`]: shade(0.2).toHex(),
    [`--ilmo-${name}-active-border`]: shade(0.25).toHex(),
    [`--ilmo-${name}-focus-border`]: color.mix(WHITE, 0.5).toHex(),
    ...bootstrapVariables(name, normalized, toRgbList(normalized)),
  };
}
