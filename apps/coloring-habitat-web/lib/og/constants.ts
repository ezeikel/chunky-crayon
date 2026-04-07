/**
 * OG Image Design Constants
 *
 * Brand colors and design tokens for consistent OG image styling.
 * Based on the Coloring Habitat nature/wellness palette.
 */

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export const colors = {
  // Primary - Forest Green
  primary: "#2D6A4F",
  primaryLight: "#52B788",
  primaryDark: "#1B4332",

  // Accent - Sage
  sage: "#95D5B2",
  sageLight: "#D8F3DC",
  sageDark: "#74C69D",

  // Warm - Sand
  sand: "#E8D5B7",
  sandLight: "#F5EDE0",
  sandDark: "#D4BEA0",

  // Accent - Terracotta
  terracotta: "#C9705B",
  terracottaLight: "#E8A798",
  terracottaDark: "#A85A48",

  // Accent - Lavender
  lavender: "#B8A9C9",
  lavenderLight: "#DDD5E8",
  lavenderDark: "#9584AA",

  // Text
  textPrimary: "#1A1A2E",
  textSecondary: "#4A4A5E",
  textMuted: "#8A8A9E",
  textInverted: "#FFFFFF",

  // Backgrounds
  bgCream: "#FAFAF5",
  bgCreamDark: "#F0EFE8",
  bgWhite: "#FFFFFF",
} as const;

// Decorative accent colors for stripe bars
export const accentColors = [
  colors.primary,
  colors.sage,
  colors.terracotta,
  colors.lavender,
  colors.sand,
  colors.primaryLight,
] as const;
