/**
 * CC brand tokens — EXACT hex from
 * apps/chunky-crayon-mobile/lib/design/colors.ts. Do NOT hand-tweak; if
 * the app's colors.ts changes, mirror the change here. These are the
 * literal poster palette per the brief.
 */

export const BRAND = {
  // ─── Crayon palette (primary = crayon-orange) ───
  crayonOrange: "#E46444",
  crayonOrangeLight: "#F2A18C",
  crayonOrangeDark: "#D04725",
  pink: "#E68991",
  yellow: "#FAC342",
  green: "#8CAF5A",
  purple: "#C18B9D",
  blue: "#5A9EE2",
  // crayon-teal is a warm peach-orange in CC tokens
  peach: "#F1AE7E",
  peachLight: "#F9D3B8",

  // ─── Paper / backgrounds ───
  paperCream: "#FAF7F0",
  bgPeach: "#F7F1E9",
  bgCanvas: "#FFFEF8",

  // ─── Text ───
  textPrimary: "#43342D",
  textSecondary: "#72625A",

  white: "#FFFFFF",
} as const;

/**
 * Colo mascot stage gradients (from COLO_STAGE_COLORS) — distinct from
 * the crayon palette on purpose (stage-mood gradients). Available for
 * gradient backgrounds that want the mascot-evolution feel.
 */
export const COLO_STAGE_GRADIENTS = {
  1: { from: "#FDE68A", to: "#F59E0B" }, // Baby — warm yellow
  2: { from: "#A7F3D0", to: "#10B981" }, // Little — green growth
  3: { from: "#BAE6FD", to: "#0EA5E9" }, // Growing — sky blue
  4: { from: "#FBCFE8", to: "#EC4899" }, // Happy — joyful pink
  5: { from: "#DDD6FE", to: "#8B5CF6" }, // Artist — creative violet
  6: { from: "#FDBA74", to: "#F59E0B" }, // Master — golden
} as const;

export type Solid = { kind: "solid"; color: string };
export type Gradient = {
  kind: "gradient";
  /** CSS angle in degrees, e.g. 135 */
  angle: number;
  /** ordered color stops, first → last */
  stops: string[];
};
export type Background = Solid | Gradient;

/** Convenience: a CC-branded gradient from two crayon tokens. */
export const gradient = (angle: number, ...stops: string[]): Gradient => ({
  kind: "gradient",
  angle,
  stops,
});

export const solid = (color: string): Solid => ({ kind: "solid", color });

/** Resolve a Background to a CSS `background` value. */
export const backgroundToCss = (bg: Background): string => {
  if (bg.kind === "solid") return bg.color;
  return `linear-gradient(${bg.angle}deg, ${bg.stops.join(", ")})`;
};
