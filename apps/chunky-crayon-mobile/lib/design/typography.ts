/**
 * Design System Typography
 *
 * Font sizes, weights, and line heights matching web design.
 * Uses TondoTrial font family.
 */

import { TextStyle } from "react-native";

// Font families (using available TondoTrial weights)
export const FONTS = {
  light: "TondoTrial-Light",
  regular: "TondoTrial-Regular",
  medium: "TondoTrial-Regular", // fallback - Medium not available
  semiBold: "TondoTrial-Bold", // fallback - SemiBold not available
  bold: "TondoTrial-Bold",
} as const;

// Font sizes (matching web rem values at 16px base)
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
} as const;

// Line heights
export const LINE_HEIGHTS = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.625,
} as const;

// Letter spacing
export const LETTER_SPACING = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
} as const;

// Pre-composed text styles
export const TEXT_STYLES: Record<string, TextStyle> = {
  // Headings
  h1: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES["4xl"],
    lineHeight: FONT_SIZES["4xl"] * LINE_HEIGHTS.tight,
    letterSpacing: LETTER_SPACING.tight,
  },
  h2: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES["3xl"],
    lineHeight: FONT_SIZES["3xl"] * LINE_HEIGHTS.tight,
    letterSpacing: LETTER_SPACING.tight,
  },
  h3: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES["2xl"],
    lineHeight: FONT_SIZES["2xl"] * LINE_HEIGHTS.tight,
  },
  h4: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xl,
    lineHeight: FONT_SIZES.xl * LINE_HEIGHTS.normal,
  },

  // Body text
  body: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    lineHeight: FONT_SIZES.base * LINE_HEIGHTS.normal,
  },
  bodyLarge: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.lg,
    lineHeight: FONT_SIZES.lg * LINE_HEIGHTS.normal,
  },
  bodySmall: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    lineHeight: FONT_SIZES.sm * LINE_HEIGHTS.normal,
  },

  // Labels and captions
  label: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.sm,
    lineHeight: FONT_SIZES.sm * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.wide,
  },
  caption: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    lineHeight: FONT_SIZES.xs * LINE_HEIGHTS.normal,
  },

  // Button text
  button: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.base,
    lineHeight: FONT_SIZES.base * LINE_HEIGHTS.tight,
    letterSpacing: LETTER_SPACING.wide,
  },
  buttonSmall: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    lineHeight: FONT_SIZES.sm * LINE_HEIGHTS.tight,
    letterSpacing: LETTER_SPACING.wide,
  },
} as const;

export type FontKey = keyof typeof FONTS;
export type FontSizeKey = keyof typeof FONT_SIZES;
export type TextStyleKey = keyof typeof TEXT_STYLES;
