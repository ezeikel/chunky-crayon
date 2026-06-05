import { ReactNode, useState } from "react";
import { View, StyleSheet, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  /**
   * Hide the per-column CanvasTopBar (progress bar + sound/music). Used by iPad
   * focus mode to drop that top strip so the canvas + rails fill the window —
   * matching iPhone focus (which uses a different layout with no CanvasTopBar).
   * The progress bar is a passive completion indicator; sound/music can be set
   * before entering focus. Default false keeps the bar everywhere else.
   */
  hideTopBar?: boolean;
  /**
   * Vertical space reserved ABOVE this layout (e.g. iPhone-landscape's back-chip
   * band, applied as the parent block's paddingTop). Subtracted from the rails'
   * available height so they fit the real area — WITHOUT changing the tier
   * (reducing the `height` prop itself would drop a short window below the
   * three-column floor → middle tier).
   */
  reservedTop?: number;
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
  hideTopBar = false,
  reservedTop = 0,
}: ColoringLayoutProps) => {
  const tier = getColoringTier(width, height);
  const insets = useSafeAreaInsets();

  // Height the rails must fit into in the FIXED (landscape) tier: the layout
  // height minus the top/bottom safe area and the rails' own column vertical
  // padding (12+12). The rails resize their tiles/swatches to fit this (clamped
  // to today's sizes as a CEIL, so a tall iPad window is a no-op). undefined in
  // the scrollable (portrait/iPad-portrait) path → rails keep full content
  // height + the outer page scroll, unchanged.
  const railMaxHeight = scrollable
    ? undefined
    : Math.max(1, height - insets.top - insets.bottom - 24 - reservedTop);

  // Measured size of the FIXED-tier canvas slot (the View below the
  // CanvasTopBar). We MEASURE both axes via onLayout and fit the canvas inside
  // the real resolved box rather than COMPUTING height by subtracting chrome
  // (header + TopBar + paddings + safe-area) — flexbox already resolved all of
  // that, so the measured box is correct by construction at any orientation /
  // height / safe-area, and self-corrects if chrome changes. Feeding the real
  // {width,height} to getOptimalCanvasDimensions (in ImageCanvas) letterboxes
  // the square art to fit BOTH axes — a wide-short landscape box fits to
  // height, a tall portrait column fits to width. {0,0} until the first layout
  // pass; in the FIXED tier we render NOTHING until measured so a 0-fallback
  // never paints an oversized canvas that spills off the bottom (the landscape
  // cut-off bug). Scrollable tiers (portrait) never measure — they pass the
  // full box through and let the block exceed the viewport (it scrolls).
  const [fillBox, setFillBox] = useState({ width: 0, height: 0 });
  const onFillLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setFillBox((prev) =>
      prev.width === w && prev.height === h ? prev : { width: w, height: h },
    );
  };
  const measured = fillBox.width > 0 && fillBox.height > 0;

  if (tier === "three-column") {
    // Pass the REAL safe-area insets so the rail COLUMNS reserve the notch /
    // Dynamic Island (canvas shrinks by the inset; rails keep their full card
    // width). The rails must then NOT also subtract the inset in their own
    // padding (they use a flat 8pt gutter) or it'd be double-counted and the
    // card would be too narrow (the clipped 3rd tool column). iPad insets ≈ 0 →
    // identical to before.
    const { leftWidth, rightWidth, canvasSize } = getLandscapeSidebarWidths(
      width,
      height,
      insets.left,
      insets.right,
      // Same height the rails fit into — so the column split uses the SHRUNK
      // card widths and the canvas reclaims the freed horizontal space.
      railMaxHeight,
    );
    return (
      <View style={[styles.row, scrollable && styles.rowScrollable]}>
        <ColorPaletteSidebar
          width={leftWidth}
          availableHeight={railMaxHeight}
          // Reserve the notch on the left column so the card clears it.
          edgeInset={insets.left}
        />
        {/* Center column: progress bar + sound/music ABOVE the canvas
            (web's per-column placement), then the dominant canvas. */}
        <View style={styles.canvasCenter}>
          {!hideTopBar && <CanvasTopBar />}
          <View
            style={[styles.canvasFill, !scrollable && styles.canvasFillFixed]}
            onLayout={scrollable ? undefined : onFillLayout}
          >
            {scrollable
              ? // Portrait scrollable: full-width canvas, height unconstrained
                // (the outer ScrollView handles overflow).
                renderCanvas({ width: canvasSize, height })
              : // Landscape FIXED: fit the canvas inside the MEASURED slot.
                // Render nothing until measured (one invisible frame — the
                // canvas already awaits svgDimensions anyway) so we never paint
                // the oversized 0-fallback.
                measured
                ? renderCanvas({ width: fillBox.width, height: fillBox.height })
                : null}
          </View>
        </View>
        <ToolsSidebar
          width={rightWidth}
          availableHeight={railMaxHeight}
          // Reserve the notch on the right column so the card clears it.
          edgeInset={insets.right}
          // ToolsSidebar's `scrollable` prop means "render full content height,
          // no internal scroll cap" (the OUTER ScrollView handles it). In the
          // FIXED landscape tier there is no outer ScrollView, so we keep
          // scrollable=false → the rail uses its OWN height-capped inner
          // ScrollView (maxHeight:100%), keeping its bottom rows reachable on a
          // short landscape window. Portrait (scrollable) passes it through.
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
  // Same measure-based containment as three-column — the canvas sits below the
  // TopBar + toolbar, so fit it inside the MEASURED leftover box (both axes),
  // rendering nothing until measured so the 0-fallback never paints oversized.
  return (
    <View style={styles.column}>
      {!hideTopBar && <CanvasTopBar />}
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
        onLayout={scrollable ? undefined : onFillLayout}
      >
        {scrollable
          ? renderCanvas({ width, height })
          : measured
            ? renderCanvas({ width: fillBox.width, height: fillBox.height })
            : null}
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
  // measures the real visible area. TOP-align the canvas (flex-start) so it sits
  // directly under the progress/sound bar instead of floating centered with a big
  // gap above — that gap was the "canvas pushed down" in focus mode, where the
  // slot is full-window-height (taller than the non-focus measured viewport) so a
  // width-bound square centered in it had huge top/bottom slack. (Horizontal stays
  // centered so a height-bound square isn't pinned left.) Scrollable/portrait
  // keeps plain canvasFill.
  canvasFillFixed: {
    flex: 1,
    overflow: "hidden",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  middleCanvas: {
    flex: 1,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ColoringLayout;
