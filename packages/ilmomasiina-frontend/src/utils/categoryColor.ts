import type { CSSProperties } from "react";

export type CategoryColor = {
  /** Solid color for strips, dots and borders. */
  solid: string;
  /** Pale tint for backgrounds. */
  tint: string;
  /** Dark shade of the hue for text on the tint. */
  ink: string;
};

// Muted but clearly distinct hues.
const PALETTE: CategoryColor[] = [
  { solid: "#c4623f", tint: "#f8e9e2", ink: "#8a3d22" }, // terracotta
  { solid: "#3e73a8", tint: "#e6eef6", ink: "#264b73" }, // blue
  { solid: "#c28a1e", tint: "#f7eeda", ink: "#7f5a0c" }, // ochre
  { solid: "#8a4f7d", tint: "#f1e6ee", ink: "#5e3254" }, // plum
  { solid: "#2a8c8c", tint: "#e0f0ef", ink: "#1b5e5e" }, // teal
  { solid: "#c2476b", tint: "#f8e5eb", ink: "#8c2a49" }, // rose
  { solid: "#5b5bc4", tint: "#e8e8f7", ink: "#3a3a8c" }, // indigo
  { solid: "#8b6f5a", tint: "#efe8e2", ink: "#5c463a" }, // cocoa
];

// Categories with a fixed color. The green is reserved for ESTIEM, so no other category can end up looking the same.
const GREEN: CategoryColor = { solid: "#4f8f4a", tint: "#e5f1e3", ink: "#2f5c2b" };
const FIXED_PALETTE_INDEXES = { juhlat: 5, "vapaa-aika": 1, yritykset: 6, muut: 7 };
const FIXED = new Map<string, CategoryColor>([
  ["estiem", GREEN],
  ...Object.entries(FIXED_PALETTE_INDEXES).map(([name, index]) => [name, PALETTE[index]] as [string, CategoryColor]),
]);

const NEUTRAL: CategoryColor = { solid: "#9ca3af", tint: "#f3f4f1", ink: "#6b7280" };

const normalize = (category: string | null | undefined) => (category ?? "").trim().toLowerCase();

function hash(key: string) {
  // djb2
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    // eslint-disable-next-line no-bitwise
    h = ((h << 5) + h + key.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Builds a function that maps a category name to its color.
 *
 * Category names are free text, so each category starts from a stable hash of its name. Categories are handled in
 * alphabetical order, and one whose color is already taken moves on to the next free color. This keeps colors mostly
 * stable while guaranteeing that the categories on screen are distinct (up to the size of the palette).
 * Categories listed in FIXED (such as ESTIEM) always get their own color. Uncategorized events are neutral grey.
 */
export function buildCategoryColors(categories: Iterable<string | null | undefined>) {
  const names = Array.from(new Set(Array.from(categories).map(normalize).filter(Boolean))).sort();
  const colors = new Map<string, CategoryColor>();
  // Other categories (such as old ones) don't reuse the colors of the fixed categories.
  const taken = new Set<number>(Object.values(FIXED_PALETTE_INDEXES));
  names.forEach((name) => {
    if (FIXED.has(name)) return;
    let index = hash(name) % PALETTE.length;
    for (let tries = 0; tries < PALETTE.length && taken.has(index); tries++) {
      index = (index + 1) % PALETTE.length;
    }
    taken.add(index);
    colors.set(name, PALETTE[index]);
  });
  return (category: string | null | undefined): CategoryColor => {
    const key = normalize(category);
    if (!key) return NEUTRAL;
    return FIXED.get(key) ?? colors.get(key) ?? PALETTE[hash(key) % PALETTE.length];
  };
}

/** Inline style that exposes a category color as CSS variables (--cat, --cat-tint, --cat-ink). */
export function categoryStyle({ solid, tint, ink }: CategoryColor): CSSProperties {
  return { "--cat": solid, "--cat-tint": tint, "--cat-ink": ink } as CSSProperties;
}
