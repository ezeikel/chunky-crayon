import { Dimensions, Platform, ScaledSize } from "react-native";
import { useState, useEffect } from "react";

/**
 * Device detection and layout utilities for responsive tablet/phone experiences
 */

// iPad mini minimum dimension is 768 logical points
const TABLET_MIN_DIMENSION = 768;

export type DeviceType = "phone" | "tablet";

/**
 * The coloring experience picks its layout by AVAILABLE WIDTH, not
 * orientation — mirroring CC web (which switches on width: bottom-sheet
 * → toolbar-above-canvas → 3-column). Orientation alone was wrong: an
 * iPad held in portrait has plenty of width for a richer layout but was
 * getting the phone bottom-sheet.
 *
 *   phone        (< 700dp): top controls + zoom pill, canvas, bottom drawer
 *   middle     (700–1023dp): toolbar above the canvas, canvas under
 *   three-column (≥ 1024dp): palette | canvas | tools sidebars
 *
 * Thresholds are logical DP (RN window width). Principle: always maximise
 * space — give a width the richest layout it can fit. 700 clears every
 * iPhone portrait; 1024 lets EVERY iPad (incl. the 11"/13" in portrait,
 * 834/1032dp… 1024 catches the 13" at 1032, the 11" at 834 stays middle)
 * — really 1024 means "iPad-landscape-ish width or wider gets 3 columns",
 * so iPad Pro 13 portrait (1032) gets the full 3-column layout. Recompute
 * on every Dimensions change so rotation and iPad split-view resizes
 * re-tier live.
 */
export type ColoringTier = "phone" | "middle" | "three-column";

const COLORING_TIER_MIDDLE_MIN = 700;
const COLORING_TIER_THREE_COLUMN_MIN = 1024;

export const getColoringTier = (width: number): ColoringTier => {
  if (width >= COLORING_TIER_THREE_COLUMN_MIN) return "three-column";
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
