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
  /** Side toolbar width (tablet landscape) - used as minimum */
  sideWidth: 120,
  /** Side toolbar collapsed width (phone landscape) */
  sideCollapsed: 64,
  /** Color palette bar height */
  paletteHeight: 80,
  /** Minimum sidebar width (phone landscape) */
  minSidebarWidth: 80,
  /** Maximum sidebar width (tablet landscape) */
  maxSidebarWidth: 200,
} as const;

/**
 * Horizontal gap between each floating rail and the canvas card in the
 * three-column coloring layout. Folded into each side column's width so the
 * rails never butt against the canvas.
 */
export const CANVAS_COLUMN_GAP = 16;

/** Floating rail card widths — see getLandscapeSidebarWidths for derivation. */
export const LEFT_RAIL_CARD_WIDTH = 198;
export const RIGHT_RAIL_CARD_WIDTH = 232;

/**
 * SINGLE SOURCE OF TRUTH for the height-adaptive landscape rail fit.
 *
 * On a short-and-wide window (iPhone landscape) the rails can't show their
 * full-size iPad swatches/tiles without overflowing the window height, so we
 * shrink them. Crucially the SAME shrunk dimensions drive (a) the rail card
 * widths and (b) the column-width split that gives the canvas its space — so
 * the canvas reclaims whatever the rails give up, with no empty gutter inside
 * a column and no canvas-starvation. Computing this in two places (the rails
 * sizing themselves while getLandscapeSidebarWidths reserved fixed iPad widths)
 * was the bug: fat columns, narrow canvas, swatches overflowing their card.
 *
 * `availableHeight` is the height the rail must fit into (window minus safe
 * area, the rails' own vertical padding, and any reserved top band). When it's
 * undefined or tall (iPad), everything resolves to today's CEIL values → the
 * iPad layout is byte-for-byte unchanged.
 *
 * The palette rail (6 swatch rows + 2 pill rows) is the taller of the two, so
 * it drives the shrink; the tools rail uses a matching factor.
 */
const SWATCH_CEIL = 51;
const SWATCH_FLOOR = 30;
const PILL_CEIL = 48;
const PILL_FLOOR = 38;
const SWATCH_GAP = 6; // ColorSwatchGrid GAP
const SWATCH_ROWS = 6; // 18 swatches / 3 columns
const RAIL_PADDING = 16; // each rail card's uniform padding
const RAIL_BORDER = 2; // each rail card's border width

const TILE_CEIL = 61; // tools rail tool/action tile
const CONTROL_CEIL = 48; // tools rail control button
const TILE_GAP = 8; // tools grid gap
const TILE_FLOOR_FACTOR = 0.72; // tools tiles never below 72% (≈44px tap target)

// Below this available height we start shrinking; at/above it = CEIL (iPad).
const RAIL_FIT_THRESHOLD = 560;

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export type LandscapeRailFit = {
  /** Palette rail */
  swatchSize: number;
  pillHeight: number;
  leftCardWidth: number;
  /** Tools rail */
  tileSize: number;
  controlSize: number;
  actionSize: number;
  /** Inner grid/content width that every tools row pins to (fits the widest row). */
  toolsContentWidth: number;
  rightCardWidth: number;
};

export const getLandscapeRailFit = (
  availableHeight?: number,
): LandscapeRailFit => {
  const shrink =
    availableHeight !== undefined && availableHeight < RAIL_FIT_THRESHOLD;

  let swatchSize = SWATCH_CEIL;
  let pillHeight = PILL_CEIL;
  if (shrink) {
    // Shrink the pills modestly first, then size the swatches so all 6 rows
    // fit EXACTLY in what's left — true budget (subtract card border + padding)
    // with Math.floor so the bottom row can never overflow the card.
    pillHeight = clamp(
      Math.round(availableHeight! * 0.1),
      PILL_FLOOR,
      PILL_CEIL,
    );
    const cardChrome = 2 * RAIL_BORDER + 2 * RAIL_PADDING; // border + padding (top+bottom)
    const pillsBlock = 2 * pillHeight + 16; // 2 pill rows + 2× marginBottom(8)
    const railGap = 12; // palette rail style `gap`
    const gridPadTop = 2; // gridScroll paddingTop
    const gridBudget =
      availableHeight! - cardChrome - pillsBlock - railGap - gridPadTop;
    swatchSize = clamp(
      Math.floor(gridBudget / SWATCH_ROWS - SWATCH_GAP),
      SWATCH_FLOOR,
      SWATCH_CEIL,
    );
  }
  // Palette card = 3-swatch grid + padding + BORDER. RN is border-box, so the
  // 2px border on each side eats into the content box; omitting it (as before)
  // left the card 4px too narrow and clipped the edge swatch circles. Matches
  // the right rail's border-box accounting (rightCardWidth below).
  const leftCardWidth =
    3 * (swatchSize + SWATCH_GAP) + 2 * RAIL_PADDING + 2 * RAIL_BORDER;

  // Tools rail shrinks by a factor off the same available height so its tiles
  // track the palette swatches. ~640 ≈ its natural content height.
  const fitFactor = shrink
    ? clamp(availableHeight! / 640, TILE_FLOOR_FACTOR, 1)
    : 1;
  const tileSize = Math.round(TILE_CEIL * fitFactor);
  const controlSize = Math.round(CONTROL_CEIL * fitFactor);
  const actionSize = tileSize;
  // Content box (the width every tools row pins to). On the iPhone-landscape
  // SHRINK path it must fit the WIDEST row — the zoom row's 4 control buttons
  // (4×controlSize + 3×gap) exceed the 3-tile grid (164 vs 148 at the 0.72
  // floor) and would otherwise wrap 3+1 / clip the rightmost tile. Taking the
  // max widens the card just enough to contain them. On the TALL/iPad path we
  // keep the historical 3-tile basis (CEIL 199 → card 232) byte-for-byte: that
  // layout shipped with the wider zoom row already centering/wrapping inside it
  // and the user reports iPad as correct, so we don't disturb it here.
  const baseGrid = 3 * tileSize + 2 * TILE_GAP;
  const zoomRow = 4 * controlSize + 3 * TILE_GAP;
  const toolsContentWidth = shrink ? Math.max(baseGrid, zoomRow) : baseGrid;
  // Card = content box + padding + border. RN is border-box, so the 2px border
  // on each side eats the content width — the previous formula omitted it, which
  // (with the +32 hug in ToolsSidebar) shrank the inner box 4px below gridWidth
  // and clipped the rightmost tile. Include it so inner box == gridWidth exactly.
  const rightCardWidth = toolsContentWidth + 2 * RAIL_PADDING + 2 * RAIL_BORDER;

  return {
    swatchSize,
    pillHeight,
    leftCardWidth,
    tileSize,
    controlSize,
    actionSize,
    toolsContentWidth,
    rightCardWidth,
  };
};

/**
 * Calculate sidebar + canvas widths for the three-column coloring layout.
 *
 * Layout: [Left Sidebar] [Canvas] [Right Sidebar]
 *
 * The side panels are sized FIRST off the SHRUNK rail-fit card widths (so the
 * canvas reclaims any width the rails give up on a short window), and the
 * canvas column takes whatever horizontal space is left between them. The
 * safe-area insets are reserved INSIDE each side column so the rail card can
 * sit flush against the inner edge while clearing the notch.
 *
 * The previous implementation sized the canvas as a square fit to HEIGHT,
 * then gave the sidebars `(screenWidth - canvasSize) / 2`. That only works
 * in landscape (width > height). In a wide PORTRAIT three-column tier (e.g.
 * iPad Pro 13" portrait, 1032×1376) the height-fit canvas (~1290) exceeded
 * the screen width, so `remainingWidth` went negative and both sidebars
 * clamped to the 80px minimum — they collapsed to thin strips and the
 * square canvas spilled past both screen edges. Sizing the panels first
 * (off width, not height) fixes both orientations.
 */
export const getLandscapeSidebarWidths = (
  screenWidth: number,
  screenHeight: number,
  leftInset: number = 0,
  rightInset: number = 0,
  /** Height the rails fit into — drives the shrunk card widths (iPhone landscape). */
  railAvailableHeight?: number,
): { leftWidth: number; rightWidth: number; canvasSize: number } => {
  const availableWidth = screenWidth - leftInset - rightInset;

  // Rail card widths come from the SAME fit function the rails render with, so
  // the column split and the cards agree exactly (no empty gutter, no starved
  // canvas). On a tall window these resolve to the iPad CEIL widths (198/232).
  const fit = getLandscapeRailFit(railAvailableHeight);
  const gap = CANVAS_COLUMN_GAP;

  const leftWidth = fit.leftCardWidth + gap + leftInset;
  const rightWidth = fit.rightCardWidth + gap + rightInset;

  // Canvas column is the remaining horizontal space between the two rails.
  const canvasSize = Math.max(0, availableWidth - leftWidth - rightWidth);

  return { leftWidth, rightWidth, canvasSize };
};

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
