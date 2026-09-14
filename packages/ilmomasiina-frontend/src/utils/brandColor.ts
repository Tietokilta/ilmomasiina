/** Utilities for applying admin-configured theme colors (brand and danger colors) at runtime.
 *
 * These replicate the Sass color logic in `styles/_definitions.scss` and `styles/_shared.scss`
 * closely enough that a runtime brand color looks consistent with the compiled defaults.
 */

type Rgb = [number, number, number];

/** Parses a `#rrggbb` color. Returns null for invalid input. */
export function parseHexColor(hex: string): Rgb | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  // eslint-disable-next-line no-bitwise
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

/** Mixes `color` with `other` by the given weight (0..1) of `other`. Equivalent to Sass `mix`. */
function mix(color: Rgb, other: Rgb, weight: number): Rgb {
  return color.map((c, i) => c * (1 - weight) + other[i] * weight) as Rgb;
}

/** Relative luminance per WCAG, as used by Bootstrap's `color-contrast`. */
function luminance([r, g, b]: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

/** Returns white or black, whichever gives better contrast against the color. */
function contrastColor(color: Rgb): Rgb {
  // Bootstrap prefers white when it reaches the minimum contrast ratio of 4.5.
  return contrastRatio(color, WHITE) >= 4.5 || contrastRatio(color, WHITE) >= contrastRatio(color, BLACK)
    ? WHITE
    : BLACK;
}

/** Adjusts HSL lightness by the given amount (-1..1). Equivalent to Sass `lighten`/`darken`. */
function adjustLightness([r, g, b]: Rgb, amount: number): Rgb {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
  }
  const newL = Math.min(1, Math.max(0, l + amount));
  const hueToRgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  if (s === 0) return [newL * 255, newL * 255, newL * 255];
  const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
  const p = 2 * newL - q;
  return [hueToRgb(p, q, h + 1 / 3) * 255, hueToRgb(p, q, h) * 255, hueToRgb(p, q, h - 1 / 3) * 255];
}

/** CSS custom properties derived from a theme color. */
export type ThemeColorVariables = Record<string, string>;

/** Theme colors that can be customized at runtime. */
export type ThemeColorName = "brand" | "danger";

/** Bootstrap variables that depend on each theme color. */
function bootstrapVariables(name: ThemeColorName, color: Rgb, rgb: string): ThemeColorVariables {
  if (name === "brand") {
    const linkHover = mix(color, BLACK, 0.2);
    return {
      // Used by utilities like .text-primary and by links.
      "--bs-primary": toHex(color),
      "--bs-primary-rgb": rgb,
      "--bs-link-color": toHex(color),
      "--bs-link-color-rgb": rgb,
      "--bs-link-hover-color": toHex(linkHover),
      "--bs-link-hover-color-rgb": linkHover.map(Math.round).join(", "),
    };
  }
  return {
    // Used by utilities like .text-danger and by .alert-danger.
    "--bs-danger": toHex(color),
    "--bs-danger-rgb": rgb,
    "--bs-danger-text-emphasis": toHex(mix(color, BLACK, 0.6)),
    "--bs-danger-bg-subtle": toHex(mix(color, WHITE, 0.8)),
    "--bs-danger-border-subtle": toHex(mix(color, WHITE, 0.6)),
  };
}

/** Computes the CSS custom properties needed to apply a theme color at runtime.
 *
 * The generic variables are named `--ilmo-<name>-*` and used by `styles/_branding.scss`.
 */
export function computeThemeColorVariables(name: ThemeColorName, hex: string): ThemeColorVariables | null {
  const color = parseHexColor(hex);
  if (!color) return null;

  const contrast = contrastColor(color);
  // Dark brand colors get lighter hover states (like Tietokilta's black), light ones get darker
  // hover states (Bootstrap's default behavior).
  const isDark = contrast === WHITE;
  const hoverBg = isDark ? adjustLightness(color, 0.15) : mix(color, BLACK, 0.15);
  const hoverBorder = isDark ? adjustLightness(color, 0.2) : mix(color, BLACK, 0.2);
  const activeBg = isDark ? adjustLightness(color, 0.2) : mix(color, BLACK, 0.2);
  const activeBorder = isDark ? adjustLightness(color, 0.25) : mix(color, BLACK, 0.25);
  const focusBorder = mix(color, WHITE, 0.5);

  const rgb = color.map(Math.round).join(", ");
  return {
    [`--ilmo-${name}-color`]: toHex(color),
    [`--ilmo-${name}-rgb`]: rgb,
    [`--ilmo-${name}-contrast`]: toHex(contrast),
    [`--ilmo-${name}-hover-bg`]: toHex(hoverBg),
    [`--ilmo-${name}-hover-border`]: toHex(hoverBorder),
    [`--ilmo-${name}-active-bg`]: toHex(activeBg),
    [`--ilmo-${name}-active-border`]: toHex(activeBorder),
    [`--ilmo-${name}-focus-border`]: toHex(focusBorder),
    ...bootstrapVariables(name, color, rgb),
  };
}
