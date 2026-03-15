import { Dimensions, Platform, ScaledSize } from "react-native";
import { useState, useEffect } from "react";

/**
 * Device detection and layout utilities for responsive tablet/phone experiences
 */

// iPad mini minimum dimension is 768 logical points
const TABLET_MIN_DIMENSION = 768;

export type DeviceType = "phone" | "tablet";

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
