import { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { COLORS } from "@/lib/design";
import ColorPaletteSidebar from "@/components/ColorPaletteSidebar/ColorPaletteSidebar";
import ToolsSidebar from "@/components/ToolsSidebar/ToolsSidebar";
import ColoringToolbar from "@/components/ColoringToolbar/ColoringToolbar";
import CanvasTopBar from "@/components/CanvasTopBar/CanvasTopBar";
import { getColoringTier } from "@/utils/deviceUtils";
import { getLandscapeSidebarWidths } from "@/constants/Sizes";

type ColoringLayoutProps = {
  /** Available width to lay the coloring experience out in. */
  width: number;
  /** Available height. */
  height: number;
  /** The canvas surface (real ImageCanvas on the screen; a placeholder in
   *  stories). Receives the computed canvas column width/height. */
  renderCanvas: (area: { width: number; height: number }) => ReactNode;
  /** Zoom wiring passed through to the tools rail / middle toolbar. */
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  zoom?: number;
  /** Opens the action sheet (Save / Share / Start Over) from the tools rail. */
  onOpenActions?: () => void;
};

/**
 * The responsive coloring layout — the single source of truth for HOW the
 * coloring experience arranges its rails, toolbar and canvas at a given
 * size. Both the real screen and the Storybook layout story render this so
 * what we review in Storybook is exactly what ships.
 *
 * Fit-based (mirrors web's responsive breakpoints, see getColoringTier):
 *   - three-column: palette rail │ canvas │ tools rail — when both rails +
 *     gaps + a comfortable canvas all fit.
 *   - middle: toolbar-above-canvas — when there isn't room for two rails.
 *   - phone: handled by the screen's bottom-sheet (not this component) —
 *     here we fall back to the middle toolbar for completeness.
 */
const ColoringLayout = ({
  width,
  height,
  renderCanvas,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  zoom = 1,
  onOpenActions,
}: ColoringLayoutProps) => {
  const tier = getColoringTier(width);

  if (tier === "three-column") {
    const { leftWidth, rightWidth, canvasSize } = getLandscapeSidebarWidths(
      width,
      height,
      0,
      0,
    );
    return (
      <View style={styles.row}>
        <ColorPaletteSidebar width={leftWidth} />
        {/* Center column: progress bar + sound/music ABOVE the canvas
            (web's per-column placement), then the dominant canvas. */}
        <View style={styles.canvasCenter}>
          <CanvasTopBar />
          <View style={styles.canvasFill}>
            {renderCanvas({ width: canvasSize, height })}
          </View>
        </View>
        <ToolsSidebar
          width={rightWidth}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onResetZoom={onResetZoom}
          zoom={zoom}
          onOpenActions={onOpenActions}
        />
      </View>
    );
  }

  // middle (and phone fallback for the story): top bar + toolbar above canvas.
  return (
    <View style={styles.column}>
      <CanvasTopBar />
      <ColoringToolbar
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetZoom={onResetZoom}
        zoom={zoom}
      />
      <View style={styles.middleCanvas}>{renderCanvas({ width, height })}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  // All three columns TOP-align their content (web aligns the left rail,
  // canvas card and right rail to the same top edge). alignItems: flex-start
  // stops the columns from stretching their rails full-height.
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.bgCream,
  },
  column: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: COLORS.bgCream,
    paddingTop: 8,
    gap: 8,
  },
  // Center column: top bar then canvas, both TOP-aligned (no vertical
  // centering) so the canvas card top lines up with the rails' tops.
  canvasCenter: {
    flex: 1,
    minWidth: 0,
    flexDirection: "column",
    paddingTop: 12,
    paddingHorizontal: 0,
  },
  // Canvas hugs its content height (the square card) directly under the bar.
  canvasFill: {
    alignItems: "stretch",
  },
  middleCanvas: {
    flex: 1,
  },
});

export default ColoringLayout;
