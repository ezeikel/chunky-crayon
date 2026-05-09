/**
 * Brand palette + shared constants for listing templates.
 *
 * Colors are hex (not HSL) because Satori's CSS subset is happiest with
 * hex / rgb(). Values match the CC `--crayon-*` tokens from
 * apps/chunky-crayon-web/global.css — converted once for SVG portability.
 *
 * v2: Added purple and additional accent colors to support the warmer,
 * more playful CocoWyo-inspired aesthetic.
 */

export const LISTING_SIZE = 1200; // 1:1 square — same dim for IG/Pinterest cross-post

export const PALETTE = {
  // Primary (hsl(12, 75%, 58%))
  crayonOrange: "#E58163",
  crayonOrangeLight: "#F2B79E",
  crayonOrangeDark: "#D26542",
  // Pink (hsl(355, 65%, 72%))
  crayonPink: "#E89098",
  crayonPinkLight: "#F4C5CB",
  crayonPinkDark: "#E5639A",
  // Yellow (hsl(42, 95%, 62%))
  crayonYellow: "#F8B83F",
  crayonYellowLight: "#FCDA85",
  // Purple — for titles and accents
  crayonPurple: "#A06FB0",
  crayonPurpleLight: "#C4A0D8",
  // Teal — secondary accent
  crayonTeal: "#E8A0B0",
  // Background — soft cream so brand frames pop
  cream: "#FFFAF5",
  creamWarm: "#FFF8F0", // slightly warmer variant
  brown: "#5C3A21", // text + outlines
  brownLight: "#8B6747",
  brownSoft: "rgba(92, 58, 33, 0.12)", // for shadows
} as const;
