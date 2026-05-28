/**
 * Design System Colors
 *
 * Warm canvas aesthetic. Values are the EXACT hex conversions of CC
 * web's HSL crayon tokens (apps/chunky-crayon-web/global.css), so the
 * mobile and web palettes are byte-identical. Do not hand-tweak these
 * — if web's tokens change, re-run the HSL→hex conversion and update
 * here. See ~/.claude/plans/mobile-web-parity-master-plan.md §2.
 *
 * HSL → hex source (web global.css):
 *   --crayon-orange  12 75% 58%   → #E46444   (web --coloring-accent)
 *   --crayon-pink   355 65% 72%   → #E68991
 *   --crayon-yellow  42 95% 62%   → #FAC342
 *   --crayon-green   85 35% 52%   → #8CAF5A
 *   --crayon-purple 340 30% 65%   → #C18B9D
 *   --crayon-blue   210 70% 62%   → #5A9EE2
 *   --crayon-teal    25 80% 72%   → #F1AE7E  (warm peach-orange)
 *   --crayon-sky     30 50% 85%   → #ECD9C6
 *   --text-primary   20 20% 22%   → #43342D
 *   --text-secondary 20 12% 40%   → #72625A
 *   --paper-cream    40 50% 96%   → #FAF7F0
 */

export const COLORS = {
  // ─── Brand primary (= web --coloring-accent / --crayon-orange) ───
  primary: "#E46444",
  primaryLight: "#F2A18C",
  primaryDark: "#D04725",

  // Backwards-compatible alias used widely across the app.
  crayonOrange: "#E46444",
  crayonOrangeLight: "#F2A18C",
  crayonOrangeDark: "#D04725",

  // ─── Paper / background (web --paper-*) ───
  bgCream: "#FAF7F0",
  bgCreamDark: "#F4EEE6",
  bgPeach: "#F7F1E9", // = paper-sky (warm peach wash)
  bgCanvas: "#FFFEF8",

  // ─── Text (web --text-*) ───
  textPrimary: "#43342D",
  textSecondary: "#72625A",
  textMuted: "#A89080",
  textGray: "#374151",
  textWarmMuted: "#8B7E78",

  // ─── Neutrals ───
  white: "#FFFFFF",
  black: "#000000",

  // ─── Crayon accents (exact web tokens) ───
  // "secondaryOrange" + "peach" both map to web --crayon-teal (the
  // warm peach-orange), kept as named aliases for existing call sites.
  secondaryOrange: "#F1AE7E",
  crayonPeach: "#F1AE7E",
  crayonPeachLight: "#F9D3B8",
  peach: "#F1AE7E",
  coral: "#E68991", // = crayon-pink
  yellow: "#FAC342", // = crayon-yellow
  mint: "#8CAF5A", // = crayon-green
  sky: "#5A9EE2", // = crayon-blue
  lavender: "#C18B9D", // = crayon-purple

  // ─── State ───
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  recordingRed: "#EF4444",

  // ─── Borders ───
  border: "#E8DFD6",
  borderLight: "#F5EDE6",

  // ─── Overlay ───
  overlay: "rgba(0, 0, 0, 0.5)",
  overlayLight: "rgba(0, 0, 0, 0.3)",
} as const;

// Colo Avatar stage gradient colors (mascot evolution — distinct from
// the crayon palette on purpose; these are stage-mood gradients).
export const COLO_STAGE_COLORS = {
  1: { from: "#FDE68A", to: "#F59E0B" }, // Baby - warm yellow
  2: { from: "#A7F3D0", to: "#10B981" }, // Little - green growth
  3: { from: "#BAE6FD", to: "#0EA5E9" }, // Growing - sky blue
  4: { from: "#FBCFE8", to: "#EC4899" }, // Happy - joyful pink
  5: { from: "#DDD6FE", to: "#8B5CF6" }, // Artist - creative violet
  6: { from: "#FDBA74", to: "#F59E0B" }, // Master - golden
} as const;

/**
 * The full crayon palette — exact hex of web's crayon HSL tokens,
 * each with light + dark. This is the canonical set for any UI that
 * paints with brand crayons (color pickers, chunky button shadows,
 * tinted toasts, etc). Mirrors web's --crayon-* family 1:1.
 */
export const CRAYON = {
  orange: { base: "#E46444", light: "#F2A18C", dark: "#D04725" },
  teal: { base: "#F1AE7E", light: "#F9D3B8", dark: "#E48744" },
  pink: { base: "#E68991", light: "#F4C2C6", dark: "#D4545E" },
  yellow: { base: "#FAC342", light: "#FFE099", dark: "#E9A60C" },
  green: { base: "#8CAF5A", light: "#BCD49B", dark: "#6C8A42" },
  purple: { base: "#C18B9D", light: "#DEBAC6", dark: "#A65973" },
  sky: { base: "#ECD9C6", light: "#F6EBDF", dark: "#DCBFA3" },
  blue: { base: "#5A9EE2", light: "#9DC7F1", dark: "#2D80D2" },
} as const;

/**
 * Flat crayon palette kept for existing call sites (CRAYON_PALETTE.red
 * etc). Values re-pointed at the exact web crayon tokens. `red` maps to
 * crayon-pink (web has no separate red), `brown` kept as-is (UI-only,
 * no web equivalent).
 */
export const CRAYON_PALETTE = {
  red: "#E68991", // → crayon-pink
  orange: "#E46444", // → crayon-orange
  yellow: "#FAC342", // → crayon-yellow
  green: "#8CAF5A", // → crayon-green
  blue: "#5A9EE2", // → crayon-blue
  purple: "#C18B9D", // → crayon-purple
  pink: "#E68991", // → crayon-pink
  brown: "#8B5A2B", // UI-only, no web token
} as const;

export type ColorKey = keyof typeof COLORS;
export type ColoStageKey = keyof typeof COLO_STAGE_COLORS;
export type CrayonColorKey = keyof typeof CRAYON_PALETTE;
export type CrayonKey = keyof typeof CRAYON;
