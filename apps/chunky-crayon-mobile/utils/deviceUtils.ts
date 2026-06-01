import { Dimensions, Platform, ScaledSize } from "react-native";
import { useState, useEffect } from "react";

/**
 * Device detection and layout utilities for responsive tablet/phone experiences
 */

// iPad mini minimum dimension is 768 logical points
const TABLET_MIN_DIMENSION = 768;

export type DeviceType = "phone" | "tablet";

/**
 * The coloring experience picks its layout by whether it FITS the available
 * width — mirroring CC web (responsive breakpoints), not orientation or a
 * hard DP threshold. Principle: always maximise space — give a width the
 * richest layout that actually fits.
 *
 *   three-column: palette rail | canvas | tools rail — chosen only when both
 *                 rails + their gaps + a comfortable minimum canvas all fit.
 *   middle:       toolbar above the canvas, canvas under — when there isn't
 *                 room for two rails but the screen is wider than a phone.
 *   phone:        canvas + bottom-sheet drawer — narrow widths.
 *
 * Three-column chrome budget (matches getLandscapeSidebarWidths +
 * CANVAS_COLUMN_GAP in constants/Sizes.ts): left rail 198 + gap 16 +
 * right rail 232 + gap 16 = 462px. We require the canvas column to be at
 * least THREE_COLUMN_MIN_CANVAS wide on top of that.
 *
 * THE CANVAS MUST STAY DOMINANT. Three-column is only worth it when the canvas
 * column is at least as wide as the two rails combined (462px) — otherwise the
 * canvas is squeezed to a skinny strip between two fat rails, which is worse
 * than tools-on-top (where the canvas gets the full width). So MIN_CANVAS is
 * set to ~the rail chrome (538), giving a cutover of 1000:
 *   - ≥1000 (iPad Pro 13 portrait 1032 → canvas 570; ALL iPad landscapes;
 *     iPad mini landscape 1024 → canvas 562) → three-column, canvas dominant.
 *   - 700-999 (iPad Pro 11/Air portrait ~820-834, iPad mini portrait 744,
 *     large-phone landscape ~852) → MIDDLE tools-on-top, canvas full width.
 *   - <700 (every phone portrait) → phone bottom sheet.
 * (Earlier this was 822, which dropped iPad-11/Air portrait into three-column
 * with only a ~372px canvas — a skinny-canvas regression. Raised to 1000.)
 * Recompute on every Dimensions change so rotation + iPad split-view resizes
 * re-tier live.
 */
export type ColoringTier = "phone" | "middle" | "three-column";

// Phone → middle cutover (clears every iPhone portrait).
const COLORING_TIER_MIDDLE_MIN = 700;
// Chrome the two rails + their canvas gaps consume in three-column.
// Keep in sync with LEFT_RAIL_CARD_WIDTH (198) + RIGHT_RAIL_CARD_WIDTH (232)
// + 2× CANVAS_COLUMN_GAP (16) in constants/Sizes.ts.
const THREE_COLUMN_RAIL_CHROME = 198 + 16 + 232 + 16; // 462
// Minimum canvas column width before three-column is worth it. Set ≈ the rail
// chrome so the canvas is never narrower than the two rails combined (stays
// dominant). Below this, tools-on-top gives the canvas the full width instead.
const THREE_COLUMN_MIN_CANVAS = 538;
const COLORING_TIER_THREE_COLUMN_MIN =
  THREE_COLUMN_RAIL_CHROME + THREE_COLUMN_MIN_CANVAS; // 1000
// Minimum HEIGHT for a tools-above-canvas (middle) or rails (three-column)
// layout to leave a usable canvas. Below this the toolbar/chrome eats the whole
// viewport, so we drop to the phone bottom-sheet tier (collapsible → works in
// short heights). This is what stops a wide-but-SHORT phone-landscape
// (e.g. 852×393) from getting middle tools-on-top with a sliver of canvas: it's
// classified by width like a tablet, but only ~393px tall. Every tablet —
// even an iPad split-view — clears this (≥744 tall), so only phone-landscape
// is affected.
const COLORING_TIER_MIN_HEIGHT = 600;

/**
 * Pick the coloring layout tier. WIDTH decides three-column vs middle vs phone,
 * but a viewport too SHORT for an above-canvas toolbar is forced to the phone
 * bottom sheet regardless of width (height is optional for back-compat; when
 * omitted, the old width-only behaviour applies).
 */
export const getColoringTier = (
  width: number,
  height?: number,
): ColoringTier => {
  // Too short for tools-on-top / rails to leave a usable canvas → bottom sheet.
  if (height !== undefined && height < COLORING_TIER_MIN_HEIGHT) return "phone";
  // Three-column only if both rails + gaps + a comfortable canvas fit.
  if (width >= COLORING_TIER_THREE_COLUMN_MIN) return "three-column";
  // Otherwise toolbar-on-top for anything wider than a phone.
  if (width >= COLORING_TIER_MIDDLE_MIN) return "middle";
  return "phone";
};

export type LayoutMode =
  | "phone-portrait"
  | "phone-landscape"
  | "tablet-portrait"
  | "tablet-landscape";

export type DeviceInfo = {
  deviceType: DeviceType;
  isTablet: boolean;
  isPhone: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  screenWidth: number;
  screenHeight: number;
  layoutMode: LayoutMode;
  platform: typeof Platform.OS;
};

/**
 * Get current device type based on screen dimensions
 * iPad mini and larger are considered tablets (min dimension >= 768)
 */
export const getDeviceType = (
  width: number,
  height: number,
): { deviceType: DeviceType; isTablet: boolean; isPhone: boolean } => {
  const minDimension = Math.min(width, height);
  const isTablet = minDimension >= TABLET_MIN_DIMENSION;

  return {
    deviceType: isTablet ? "tablet" : "phone",
    isTablet,
    isPhone: !isTablet,
  };
};

/**
 * Determine if current orientation is landscape
 */
export const getOrientation = (
  width: number,
  height: number,
): { isLandscape: boolean; isPortrait: boolean } => {
  const isLandscape = width > height;

  return {
    isLandscape,
    isPortrait: !isLandscape,
  };
};

/**
 * Get optimal layout mode based on device and orientation
 */
export const getLayoutMode = (width: number, height: number): LayoutMode => {
  const { isTablet } = getDeviceType(width, height);
  const { isLandscape } = getOrientation(width, height);

  if (isTablet) {
    return isLandscape ? "tablet-landscape" : "tablet-portrait";
  }

  return isLandscape ? "phone-landscape" : "phone-portrait";
};

/**
 * Get complete device info from dimensions
 */
export const getDeviceInfo = (width: number, height: number): DeviceInfo => {
  const { deviceType, isTablet, isPhone } = getDeviceType(width, height);
  const { isLandscape, isPortrait } = getOrientation(width, height);
  const layoutMode = getLayoutMode(width, height);

  return {
    deviceType,
    isTablet,
    isPhone,
    isLandscape,
    isPortrait,
    screenWidth: width,
    screenHeight: height,
    layoutMode,
    platform: Platform.OS,
  };
};

/**
 * Get current device info (snapshot, non-reactive)
 */
export const getCurrentDeviceInfo = (): DeviceInfo => {
  const { width, height } = Dimensions.get("window");
  return getDeviceInfo(width, height);
};

/**
 * React hook for reactive device info that updates on orientation changes
 */
export const useDeviceInfo = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() =>
    getCurrentDeviceInfo(),
  );

  useEffect(() => {
    const handleChange = ({ window }: { window: ScaledSize }) => {
      setDeviceInfo(getDeviceInfo(window.width, window.height));
    };

    const subscription = Dimensions.addEventListener("change", handleChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  return deviceInfo;
};

/**
 * Check if we should use side toolbar (landscape modes)
 */
export const shouldUseSideToolbar = (layoutMode: LayoutMode): boolean => {
  return layoutMode === "phone-landscape" || layoutMode === "tablet-landscape";
};

/**
 * Check if we should use compact header (phone landscape)
 */
export const shouldUseCompactHeader = (layoutMode: LayoutMode): boolean => {
  return layoutMode === "phone-landscape";
};

/**
 * Check if side toolbar should be collapsible (phone landscape only)
 */
export const isToolbarCollapsible = (layoutMode: LayoutMode): boolean => {
  return layoutMode === "phone-landscape";
};
