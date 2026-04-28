/**
 * Chunky Crayon brand tokens for Demo Reel V2 Remotion compositions.
 *
 * Mirrors `apps/chunky-crayon-web/global.css` so the reel pixel-matches the
 * live app without bringing Tailwind into Remotion's webpack bundle. When
 * the live app's tokens change, update these to match.
 *
 * Colour values are HSL triples (hue saturation% lightness%) — same shape as
 * the CSS variables — so we pass them through `hsl()` at the call site.
 */

const hsl = (triple: string) => `hsl(${triple})`;

export const COLORS = {
  // Crayon palette
  orange: hsl("12 75% 58%"),
  orangeLight: hsl("12 80% 75%"),
  orangeDark: hsl("12 70% 48%"),
  teal: hsl("25 80% 72%"),
  tealDark: hsl("25 75% 58%"),
  pink: hsl("355 65% 72%"),
  pinkDark: hsl("355 60% 58%"),
  yellow: hsl("42 95% 62%"),
  yellowDark: hsl("42 90% 48%"),
  green: hsl("85 35% 52%"),
  greenDark: hsl("85 35% 40%"),
  purple: hsl("340 30% 65%"),
  purpleDark: hsl("340 30% 50%"),
  sky: hsl("30 50% 85%"),
  skyLight: hsl("30 55% 92%"),

  // Surfaces
  bgCream: hsl("38 55% 97%"),
  bgCreamDark: hsl("35 40% 93%"),
  paperCream: hsl("38 55% 97%"),

  // Text
  textPrimary: hsl("20 20% 22%"),
  textSecondary: hsl("20 12% 40%"),
  textMuted: hsl("25 10% 55%"),
  textInverted: hsl("0 0% 100%"),

  // Borders
  borderLight: hsl("30 25% 88%"),
  borderMedium: hsl("30 20% 75%"),
} as const;

/**
 * Coloring UI semantic tokens — kids/Chunky Crayon brand.
 * Maps to crayon-* values by convention (matches global.css mapping).
 */
export const SEMANTIC = {
  accent: COLORS.orange,
  accentDark: COLORS.orangeDark,
  highlight: COLORS.pink,
  success: COLORS.green,
  surface: COLORS.paperCream,
  surfaceDark: COLORS.bgCreamDark,
  muted: COLORS.textMuted,
  textPrimary: COLORS.textPrimary,
  textSecondary: COLORS.textSecondary,
  magicGradientFrom: COLORS.purple,
  magicGradientTo: COLORS.pink,
} as const;

/** Radii — `coloring-button`, `coloring-card`, etc. from global.css. */
export const RADII = {
  button: "1.5rem",
  card: "1.5rem",
  pill: "9999px",
  surface: "2rem",
} as const;

/** Shadows — Chunky Crayon's chunky offset look. */
export const SHADOWS = {
  button: `0 6px 0 0 ${COLORS.orangeDark}`,
  buttonHover: `0 4px 0 0 ${COLORS.orangeDark}`,
  surface: "0 4px 20px rgb(0 0 0 / 0.08)",
} as const;

/**
 * Fonts — Tondo is the only family shipped to the worker (loaded as
 * base64-inlined CSS via `<link>` from `../fonts.ts`). The live web app
 * uses Rooney Sans for body copy, but it isn't packaged for the worker;
 * defaulting body to Tondo keeps every reel rendering chunky and on-brand
 * instead of falling back to system sans (was the V2 outro card bug).
 * AdVideo.tsx made the same call for the same reason.
 */
export const FONTS = {
  heading: '"Tondo", ui-rounded, system-ui, sans-serif',
  body: '"Tondo", ui-rounded, system-ui, sans-serif',
} as const;

/** Font weights tuned for kids brand (chunky, confident). */
export const FONT_WEIGHTS = {
  heading: 800,
  body: 500,
  emphasis: 700,
} as const;

/**
 * Easing curve — used everywhere in the live app for the bouncy feel.
 * `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoots slightly past the target
 * before settling, which reads as playful rather than mechanical.
 */
export const EASING = {
  bouncy: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

/**
 * Spring configs for Remotion's `spring()` helper. Tuned to feel like the
 * live app's `--ease-coloring` — soft overshoot, quick settle.
 */
export const SPRINGS = {
  bouncy: { damping: 12, mass: 0.6, stiffness: 100 },
  snappy: { damping: 18, mass: 0.5, stiffness: 180 },
} as const;
