import { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { COLORS } from "@/lib/design";
import ColorPaletteSidebar from "@/components/ColorPaletteSidebar/ColorPaletteSidebar";
import ToolsSidebar from "@/components/ToolsSidebar/ToolsSidebar";
import ColoringToolbar from "@/components/ColoringToolbar/ColoringToolbar";
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
        <View style={styles.canvasCenter}>
          {renderCanvas({ width: canvasSize, height })}
        </View>
        <ToolsSidebar
          width={rightWidth}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onResetZoom={onResetZoom}
          zoom={zoom}
        />
      </View>
    );
  }

  // middle (and phone fallback for the story): toolbar above the canvas.
  return (
    <View style={styles.column}>
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
  row: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: COLORS.bgCream,
  },
  column: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: COLORS.bgCream,
    paddingTop: 8,
    gap: 8,
  },
  canvasCenter: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    alignItems: "stretch",
    paddingVertical: 12,
  },
  middleCanvas: {
    flex: 1,
  },
});

export default ColoringLayout;
