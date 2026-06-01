import { ReactNode, useState } from "react";
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
  /** Each rail action tile opens its own sheet. */
  onStartOver?: () => void;
  onPrint?: () => void;
  onSave?: () => void;
  onMyArtwork?: () => void;
  /**
   * When the layout is rendered inside a vertical ScrollView (portrait
   * three-column, where a "More Coloring Pages" strip sits below), the
   * three-column `row` must NOT be `flex:1` — there's no bounded height to
   * fill inside scroll content, so it takes its intrinsic height instead
   * (max of the rails / the definite-size canvas). Default false keeps the
   * fixed-screen `flex:1` behaviour for landscape / middle / phone / stories.
   */
  scrollable?: boolean;
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
  onStartOver,
  onPrint,
  onSave,
  onMyArtwork,
  scrollable = false,
}: ColoringLayoutProps) => {
  const tier = getColoringTier(width);

  // Measured height of the FIXED-tier canvas column (the View below the
  // CanvasTopBar). Used to CONTAIN the canvas within the real visible area so
  // a square/tall image can't spill off the bottom — flexbox has already
  // subtracted the header + TopBar + paddings + safe-area for us, so we just
  // read the resolved height back rather than re-summing brittle chrome
  // constants. 0 until the first layout pass; scrollable tiers never set it.
  const [fillHeight, setFillHeight] = useState(0);

  if (tier === "three-column") {
    const { leftWidth, rightWidth, canvasSize } = getLandscapeSidebarWidths(
      width,
      height,
      0,
      0,
    );
    // Landscape three-column is FIXED (row flex:1): the canvas must CONTAIN
    // within the height left under the header + CanvasTopBar + card padding +
    // safe-area, or a square/tall image spills off the bottom. We measure the
    // canvasFill View (which sits below the TopBar, so flexbox has already
    // subtracted it) and feed that real height to the canvas area. Portrait
    // three-column (scrollable) intentionally lets the block exceed the
    // viewport — there we DON'T clamp: pass the full height through.
    const canvasAreaHeight =
      !scrollable && fillHeight > 0 ? fillHeight : height;
    return (
      <View style={[styles.row, scrollable && styles.rowScrollable]}>
        <ColorPaletteSidebar width={leftWidth} />
        {/* Center column: progress bar + sound/music ABOVE the canvas
            (web's per-column placement), then the dominant canvas. */}
        <View style={styles.canvasCenter}>
          <CanvasTopBar />
          <View
            style={[styles.canvasFill, !scrollable && styles.canvasFillFixed]}
            onLayout={
              scrollable
                ? undefined
                : (e) => setFillHeight(e.nativeEvent.layout.height)
            }
          >
            {renderCanvas({ width: canvasSize, height: canvasAreaHeight })}
          </View>
        </View>
        <ToolsSidebar
          width={rightWidth}
          scrollable={scrollable}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onResetZoom={onResetZoom}
          zoom={zoom}
          onStartOver={onStartOver}
          onPrint={onPrint}
          onSave={onSave}
          onMyArtwork={onMyArtwork}
        />
      </View>
    );
  }

  // middle (and phone fallback for the story): top bar + toolbar above canvas.
  // Same containment fix as three-column — the canvas sits below the TopBar +
  // toolbar, so measure the leftover column height and clamp to it (FIXED tier;
  // scrollable middle, if ever used, falls through to full height like portrait).
  const middleCanvasHeight =
    !scrollable && fillHeight > 0 ? fillHeight : height;
  return (
    <View style={styles.column}>
      <CanvasTopBar />
      <ColoringToolbar
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetZoom={onResetZoom}
        zoom={zoom}
        onStartOver={onStartOver}
        onPrint={onPrint}
        onSave={onSave}
        onMyArtwork={onMyArtwork}
      />
      <View
        style={styles.middleCanvas}
        onLayout={
          scrollable
            ? undefined
            : (e) => setFillHeight(e.nativeEvent.layout.height)
        }
      >
        {renderCanvas({ width, height: middleCanvasHeight })}
      </View>
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
  // Inside a ScrollView (portrait, with a More-pages strip below) the row
  // can't be flex:1 — drop it so the row sizes to its content height.
  rowScrollable: {
    flex: undefined,
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
  // Fixed (landscape) tier: claim the leftover column height so onLayout
  // measures the real visible area, and clip a too-tall canvas rather than let
  // it spill past the bottom edge. (Scrollable/portrait keeps plain canvasFill.)
  canvasFillFixed: {
    flex: 1,
    overflow: "hidden",
  },
  middleCanvas: {
    flex: 1,
    overflow: "hidden",
  },
});

export default ColoringLayout;
