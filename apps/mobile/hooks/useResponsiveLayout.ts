import { useMemo } from "react";
import {
  useDeviceInfo,
  shouldUseSideToolbar,
  shouldUseCompactHeader,
  isToolbarCollapsible,
  type LayoutMode,
  type DeviceInfo,
} from "../utils/deviceUtils";
import {
  getTouchTargetSize,
  getHeaderHeight,
  getSideToolbarWidth,
  getAvailableCanvasArea,
  TOOLBAR,
  CANVAS,
} from "../constants/Sizes";
import { useFeatureStore } from "../stores/featureStore";

/**
 * Responsive layout information for coloring screen
 */
export type ResponsiveLayout = {
  // Device info
  deviceInfo: DeviceInfo;
  layoutMode: LayoutMode;

  // Layout decisions
  useSideToolbar: boolean;
  useCompactHeader: boolean;
  toolbarCollapsible: boolean;
  sideToolbarExpanded: boolean;

  // Computed dimensions
  headerHeight: number;
  sideToolbarWidth: number;
  touchTargetSize: {
    small: number;
    medium: number;
    large: number;
  };
  canvasArea: {
    width: number;
    height: number;
  };

  // Feature flags
  responsiveLayoutEnabled: boolean;

  // Actions
  toggleSideToolbar: () => void;
};

/**
 * Hook providing comprehensive responsive layout information
 * for the coloring screen. Combines device detection, feature flags,
 * and computed dimensions.
 */
export const useResponsiveLayout = (): ResponsiveLayout => {
  const deviceInfo = useDeviceInfo();
  const {
    responsiveLayout: responsiveLayoutEnabled,
    sideToolbarExpanded,
    toggleSideToolbar,
  } = useFeatureStore();

  // Determine effective layout mode
  // If responsive layout is disabled, force phone-portrait behavior
  const effectiveLayoutMode: LayoutMode = responsiveLayoutEnabled
    ? deviceInfo.layoutMode
    : "phone-portrait";

  // Compute layout decisions
  const useSideToolbar = shouldUseSideToolbar(effectiveLayoutMode);
  const useCompactHeader = shouldUseCompactHeader(effectiveLayoutMode);
  const toolbarCollapsible = isToolbarCollapsible(effectiveLayoutMode);

  // Compute dimensions based on layout mode
  const headerHeight = getHeaderHeight(effectiveLayoutMode);
  const sideToolbarWidth = getSideToolbarWidth(
    effectiveLayoutMode,
    sideToolbarExpanded,
  );

  // Touch targets for different button sizes
  const touchTargetSize = useMemo(
    () => ({
      small: getTouchTargetSize(effectiveLayoutMode, "small"),
      medium: getTouchTargetSize(effectiveLayoutMode, "medium"),
      large: getTouchTargetSize(effectiveLayoutMode, "large"),
    }),
    [effectiveLayoutMode],
  );

  // Available canvas area
  const canvasArea = useMemo(
    () =>
      getAvailableCanvasArea(
        deviceInfo.screenWidth,
        deviceInfo.screenHeight,
        effectiveLayoutMode,
        sideToolbarExpanded,
      ),
    [
      deviceInfo.screenWidth,
      deviceInfo.screenHeight,
      effectiveLayoutMode,
      sideToolbarExpanded,
    ],
  );

  return {
    deviceInfo,
    layoutMode: effectiveLayoutMode,

    useSideToolbar,
    useCompactHeader,
    toolbarCollapsible,
    sideToolbarExpanded,

    headerHeight,
    sideToolbarWidth,
    touchTargetSize,
    canvasArea,

    responsiveLayoutEnabled,

    toggleSideToolbar,
  };
};

/**
 * Get optimal canvas dimensions respecting SVG aspect ratio
 */
export const getOptimalCanvasDimensions = (
  svgWidth: number,
  svgHeight: number,
  availableWidth: number,
  availableHeight: number,
): { width: number; height: number; scale: number } => {
  const svgAspect = svgWidth / svgHeight;
  const availableAspect = availableWidth / availableHeight;

  let canvasWidth: number;
  let canvasHeight: number;
  let scale: number;

  if (svgAspect > availableAspect) {
    // SVG is wider - fit to width
    canvasWidth = availableWidth;
    canvasHeight = availableWidth / svgAspect;
    scale = availableWidth / svgWidth;
  } else {
    // SVG is taller - fit to height
    canvasHeight = availableHeight;
    canvasWidth = availableHeight * svgAspect;
    scale = availableHeight / svgHeight;
  }

  return {
    width: Math.floor(canvasWidth),
    height: Math.floor(canvasHeight),
    scale,
  };
};
