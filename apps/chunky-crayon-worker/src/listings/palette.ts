/**
 * Brand palette + shared constants for listing templates.
 *
 * Colors are hex (not HSL) because Satori's CSS subset is happiest with
 * hex / rgb(). Values match the CC `--crayon-*` tokens from
 * apps/chunky-crayon-web/global.css — converted once for SVG portability.
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
  // Yellow (hsl(42, 95%, 62%))
  crayonYellow: "#F8B83F",
  crayonYellowLight: "#FCDA85",
  // Background — soft cream so brand frames pop
  cream: "#FFFAF5",
  brown: "#5C3A21", // text + outlines
  brownLight: "#8B6747",
} as const;
