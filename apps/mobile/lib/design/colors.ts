/**
 * Design System Colors
 *
 * Warm canvas aesthetic matching web app.
 * Colors translated from web CSS HSL variables to hex.
 */

// Primary brand colors
export const COLORS = {
  // Primary orange (crayon brand)
  primary: "#E86942",
  primaryLight: "#F5A083",
  primaryDark: "#C94E2A",

  // Background colors
  bgCream: "#FFFDF5",
  bgPeach: "#FFF5EB",
  bgCanvas: "#FFFEF8",

  // Text colors
  textPrimary: "#3D2C1E",
  textSecondary: "#6B5344",
  textMuted: "#A89080",

  // UI colors
  white: "#FFFFFF",
  black: "#000000",

  // Accent colors
  coral: "#FF6B6B",
  peach: "#FFAB91",
  yellow: "#FFD93D",
  mint: "#6BCB77",
  sky: "#4D96FF",
  lavender: "#9B59B6",

  // State colors
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  // Border colors
  border: "#E8DFD6",
  borderLight: "#F5EDE6",

  // Overlay colors
  overlay: "rgba(0, 0, 0, 0.5)",
  overlayLight: "rgba(0, 0, 0, 0.3)",
} as const;

// Colo Avatar stage gradient colors
export const COLO_STAGE_COLORS = {
  1: { from: "#FDE68A", to: "#F59E0B" }, // Baby - warm yellow
  2: { from: "#A7F3D0", to: "#10B981" }, // Little - green growth
  3: { from: "#BAE6FD", to: "#0EA5E9" }, // Growing - sky blue
  4: { from: "#FBCFE8", to: "#EC4899" }, // Happy - joyful pink
  5: { from: "#DDD6FE", to: "#8B5CF6" }, // Artist - creative violet
  6: { from: "#FDBA74", to: "#F59E0B" }, // Master - golden
} as const;

// Crayon palette colors (for UI elements)
export const CRAYON_PALETTE = {
  red: "#FF6B6B",
  orange: "#E86942",
  yellow: "#FFD93D",
  green: "#6BCB77",
  blue: "#4D96FF",
  purple: "#9B59B6",
  pink: "#FF85A2",
  brown: "#8B5A2B",
} as const;

export type ColorKey = keyof typeof COLORS;
export type ColoStageKey = keyof typeof COLO_STAGE_COLORS;
export type CrayonColorKey = keyof typeof CRAYON_PALETTE;
