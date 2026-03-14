/**
 * Design System Shadows
 *
 * Cross-platform shadow utilities matching web box-shadows.
 * Uses shadowColor/offset/opacity/radius for iOS and elevation for Android.
 */

import { Platform, ViewStyle } from "react-native";

type ShadowStyle = Pick<
  ViewStyle,
  | "shadowColor"
  | "shadowOffset"
  | "shadowOpacity"
  | "shadowRadius"
  | "elevation"
>;

/**
 * Create cross-platform shadow style
 */
const createShadow = (
  offsetY: number,
  blur: number,
  opacity: number,
  elevation: number,
  color = "#000000",
): ShadowStyle => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: opacity,
  shadowRadius: blur,
  ...Platform.select({
    android: { elevation },
  }),
});

// Shadow presets matching web design
export const SHADOWS = {
  // No shadow
  none: createShadow(0, 0, 0, 0),

  // Subtle shadow for cards
  sm: createShadow(1, 2, 0.05, 1),

  // Default card shadow
  md: createShadow(2, 4, 0.1, 3),

  // Elevated elements
  lg: createShadow(4, 8, 0.15, 6),

  // Modal/overlay shadows
  xl: createShadow(8, 16, 0.2, 12),

  // Floating elements
  "2xl": createShadow(12, 24, 0.25, 16),

  // Warm accent shadow (orange tint)
  warm: createShadow(4, 8, 0.15, 6, "#E86942"),

  // Soft inner glow effect (approximate)
  glow: createShadow(0, 8, 0.3, 8, "#E86942"),
} as const;

export type ShadowKey = keyof typeof SHADOWS;

/**
 * Get shadow style by key
 */
export const getShadow = (key: ShadowKey): ShadowStyle => SHADOWS[key];

/**
 * Create custom shadow
 */
export const customShadow = (
  offsetY: number,
  blur: number,
  opacity: number,
  elevation: number,
  color?: string,
): ShadowStyle => createShadow(offsetY, blur, opacity, elevation, color);
