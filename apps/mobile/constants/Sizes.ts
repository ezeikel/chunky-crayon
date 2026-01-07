import type { LayoutMode } from "../utils/deviceUtils";

/**
 * Size constants for responsive tablet and phone layouts.
 * Touch targets follow Apple HIG guidelines (44pt minimum) with larger
 * sizes for tablets and kid-friendly interactions.
 */

// Device breakpoints (in logical points)
export const BREAKPOINTS = {
  /** iPad mini and larger */
  tablet: 768,
} as const;

// Touch target sizes by device type
export const TOUCH_TARGETS = {
  phone: {
    /** Small buttons (44pt - iOS minimum) */
    small: 44,
    /** Medium buttons (default for most controls) */
    medium: 48,
    /** Large buttons (primary actions) */
    large: 56,
  },
  tablet: {
    /** Small buttons - larger for bigger screens */
    small: 56,
    /** Medium buttons - comfortable for Pencil/finger switching */
    medium: 64,
    /** Large buttons - primary actions, easy for kids */
    large: 80,
  },
} as const;

// Toolbar dimensions
export const TOOLBAR = {
  /** Bottom toolbar collapsed height (phone portrait) */
  bottomCollapsed: 140,
  /** Bottom toolbar expanded height (phone portrait) */
  bottomExpanded: 380,
  /** Side toolbar width (tablet landscape) */
  sideWidth: 120,
  /** Side toolbar collapsed width (phone landscape) */
  sideCollapsed: 64,
  /** Color palette bar height */
  paletteHeight: 80,
} as const;

// Canvas padding and margins
export const CANVAS = {
  /** Horizontal padding around canvas */
  horizontalPadding: 16,
  /** Vertical padding above canvas */
  topPadding: 8,
  /** Bottom padding (space for toolbar) */
  bottomPaddingPortrait: 180,
  /** Bottom padding in landscape (minimal) */
  bottomPaddingLandscape: 16,
} as const;

// Header dimensions
export const HEADER = {
  /** Full header height */
  full: 56,
  /** Compact header height (phone landscape) */
  compact: 44,
} as const;

// Spacing scale (4px base unit)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Border radius
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

/**
 * Get touch target size based on layout mode and size category
 */
export const getTouchTargetSize = (
  layoutMode: LayoutMode,
  size: "small" | "medium" | "large" = "medium",
): number => {
  const isTablet =
    layoutMode === "tablet-portrait" || layoutMode === "tablet-landscape";
  return TOUCH_TARGETS[isTablet ? "tablet" : "phone"][size];
};

/**
 * Get header height based on layout mode
 */
export const getHeaderHeight = (layoutMode: LayoutMode): number => {
  return layoutMode === "phone-landscape" ? HEADER.compact : HEADER.full;
};

/**
 * Get toolbar width for side toolbar layouts
 */
export const getSideToolbarWidth = (
  layoutMode: LayoutMode,
  isExpanded: boolean = true,
): number => {
  if (layoutMode === "phone-landscape") {
    return isExpanded ? TOOLBAR.sideWidth : TOOLBAR.sideCollapsed;
  }
  if (layoutMode === "tablet-landscape") {
    return TOOLBAR.sideWidth;
  }
  return 0; // No side toolbar in portrait modes
};

/**
 * Calculate available canvas dimensions for a given layout mode
 */
export const getAvailableCanvasArea = (
  screenWidth: number,
  screenHeight: number,
  layoutMode: LayoutMode,
  sideToolbarExpanded: boolean = true,
): { width: number; height: number } => {
  let availableWidth = screenWidth;
  let availableHeight = screenHeight;

  // Account for side toolbar in landscape modes
  const sideToolbarWidth = getSideToolbarWidth(layoutMode, sideToolbarExpanded);
  availableWidth -= sideToolbarWidth;

  // Account for horizontal padding
  availableWidth -= CANVAS.horizontalPadding * 2;

  // Account for header
  const headerHeight = getHeaderHeight(layoutMode);
  availableHeight -= headerHeight;

  // Account for top padding
  availableHeight -= CANVAS.topPadding;

  // Account for bottom elements
  if (layoutMode === "phone-portrait" || layoutMode === "tablet-portrait") {
    // Portrait: bottom toolbar
    availableHeight -= CANVAS.bottomPaddingPortrait;
  } else {
    // Landscape: minimal bottom, maybe color palette
    availableHeight -= TOOLBAR.paletteHeight + CANVAS.bottomPaddingLandscape;
  }

  return {
    width: Math.max(0, availableWidth),
    height: Math.max(0, availableHeight),
  };
};
