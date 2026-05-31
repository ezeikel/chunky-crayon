import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * Gap between the canvas and the side rails in the three-column coloring
 * layout. Folded into each side column's inner padding.
 */
export const CANVAS_COLUMN_GAP = 16;

/**
 * Three-column rail content sizing. These widths are what the rail CARDS need
 * to fit their content without collapsing, and they MUST stay in sync with:
 *   - the swatch grid: 3 cols × 40px + 2 × 8px gap = 136px content, + 12px
 *     card padding each side = 160px left rail card.
 *   - the tools rail: a single 56px tile column + 12px card padding each side
 *     = 80px right rail card.
 * Each side COLUMN then adds the canvas gap (16) + the left/right inset so the
 * rail floats clear of the centered canvas card.
 * Keep COLORING_TIER_* in deviceUtils.ts in sync with these.
 */
export const LEFT_RAIL_CARD_WIDTH = 160;
export const RIGHT_RAIL_CARD_WIDTH = 80;

/**
 * Compute the three-column coloring layout widths. The two rails are sized
 * first (fixed, content-fitting tablet widths) and the canvas takes the
 * remaining width. The canvas gap is folded into each side column so the
 * rails float clear of the centered canvas card.
 */
export const getLandscapeSidebarWidths = (
  screenWidth: number,
  screenHeight: number,
  leftInset = 0,
  rightInset = 0,
) => {
  const availableWidth = screenWidth - leftInset - rightInset;
  const gap = CANVAS_COLUMN_GAP;
  // Column = rail card + canvas gap + the screen-edge inset.
  const leftWidth = LEFT_RAIL_CARD_WIDTH + gap + leftInset;
  const rightWidth = RIGHT_RAIL_CARD_WIDTH + gap + rightInset;
  const canvasSize = Math.max(0, availableWidth - leftWidth - rightWidth);
  return { leftWidth, rightWidth, canvasSize };
};
