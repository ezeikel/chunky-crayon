import { useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faArrowsRotate,
  faPrint,
  faFloppyDisk,
  faHeart,
} from "@fortawesome/pro-duotone-svg-icons";
import { useCanvasStore } from "@/stores/canvasStore";
import { tapLight, tapMedium, notifyWarning } from "@/utils/haptics";
import { track } from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";
import { COLORS } from "@/lib/design";
import ToolTile from "@/components/coloring/ToolTile";
import BrushSizeRow from "@/components/coloring/BrushSizeRow";
import {
  UndoIcon,
  RedoIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ExpandIcon,
  HomeIcon,
} from "@/components/coloring/StrokeIcons";
import { useFocusMode } from "@/components/FocusMode/FocusModeProvider";
import {
  COLORING_REGULAR_TOOLS,
  COLORING_MAGIC_TOOLS,
  type ColoringToolConfig,
} from "@/lib/coloring/tools";
import { getLandscapeRailFit } from "@/constants/Sizes";

type ToolsSidebarProps = {
  /** Width of the sidebar */
  width: number;
  /** Zoom handlers from parent */
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  /** Current zoom level (1 = 100%) */
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  /**
   * Each action tile opens its OWN bottom sheet (web parity: Start Over /
   * Print / Save / My Artwork are separate buttons, not one menu). Start Over
   * is the existing destructive ConfirmSheet; the other three are ActionSheets.
   */
  onStartOver?: () => void;
  onPrint?: () => void;
  onSave?: () => void;
  onMyArtwork?: () => void;
  /**
   * When the whole screen already scrolls (portrait three-column, with a
   * More-pages strip below), the rail must NOT scroll/height-cap internally —
   * it renders at full content height so every row (incl. the Start Over /
   * Print / Save actions) shows. The inner ScrollView + `maxHeight:"100%"`
   * are only for the landscape tier, which is height-bound with no outer
   * scroll. Default false keeps the landscape behaviour.
   */
  scrollable?: boolean;
  /**
   * Height the rail must fit into (FIXED/landscape tier). When set + short, the
   * tool/control/action tiles shrink to fit (via the shared getLandscapeRailFit),
   * clamped to today's sizes as a CEIL (so a tall window = no-op, iPad unchanged).
   * The inner ScrollView stays as a last-resort net. undefined → fixed sizes.
   */
  availableHeight?: number;
  /**
   * Safe-area inset on this column's screen edge (the notch / Dynamic Island in
   * landscape). The card pads away from it so it sits flush to the inner usable
   * edge while clearing the notch. Default 0 (iPad / no notch on this side).
   */
  edgeInset?: number;
};

/**
 * Right tools sidebar for the three-column coloring layout — mirrors CC
 * web's DesktopToolsSidebar exactly: a 3-column LEFT-ALIGNED grid of regular
 * tools, a 2-up row of magic tiles (purple→pink gradient + sparkle), brush
 * sizes, undo/redo, zoom, and the actions row (Start Over / Print / Save).
 *
 * Web fidelity notes (measured from the live DOM at iPad width):
 *  - tool tiles 61px, grid left-aligned (justifyContent: flex-start), 8px gap
 *  - undo/redo + zoom use hand-drawn STROKE glyphs (not FA duotone), 48px,
 *    white + 2px cream border
 *  - actions are 64px duotone tiles with a 1px cream border
 *  - the card hugs its content height (not full column).
 */
const ToolsSidebar = ({
  width,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  zoom = 1,
  // Match the canvas store / pinch clamp (0.5–4) so the zoom-in button doesn't
  // disable early at 3 while the canvas can still zoom to 4.
  minZoom = 0.5,
  maxZoom = 4,
  onStartOver,
  onPrint,
  onSave,
  onMyArtwork,
  scrollable = false,
  availableHeight,
  edgeInset = 0,
}: ToolsSidebarProps) => {
  const { isFocusMode, toggleFocus } = useFocusMode();

  // Narrow per-slice selectors instead of a whole-store subscription. The old
  // `useCanvasStore()` re-rendered this rail on EVERY store change — including
  // every stroke's addAction — which the profiler measured as the ~110ms
  // whole-screen hot commit per stroke (the flash/jank). This rail renders only
  // on these tool/brush/magic/color primitives + the undo/redo enabled state.
  const selectedTool = useCanvasStore((s) => s.selectedTool);
  const brushType = useCanvasStore((s) => s.brushType);
  const brushSize = useCanvasStore((s) => s.brushSize);
  const magicMode = useCanvasStore((s) => s.magicMode);
  const magicReady = useCanvasStore((s) => s.magicReady);
  const magicStatus = useCanvasStore((s) => s.magicStatus);
  const onMagicRetry = useCanvasStore((s) => s.onMagicRetry);
  const selectedColor = useCanvasStore((s) => s.selectedColor);
  // Derived undo/redo enabled state — keeps the greyed/enabled visual live.
  // canRedo depends on BOTH historyIndex AND history.length (addAction
  // tombstones the redo tail + appends on draw-after-undo), so subscribing to
  // historyIndex alone would miss the Redo button greying out — subscribe to the
  // derived booleans directly (primitive → no useShallow needed).
  const canUndoNow = useCanvasStore((s) => s.historyIndex >= 0);
  const canRedoNow = useCanvasStore(
    (s) => s.historyIndex < s.history.length - 1,
  );
  // Stable action/getter fns — identity never changes; no subscription. The
  // canUndo()/canRedo() getters stay here for the live-at-tap handler guards.
  const {
    setTool,
    setBrushType,
    setBrushSize,
    setMagicMode,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCanvasStore.getState();

  const handleToolSelect = useCallback(
    (config: ColoringToolConfig) => {
      // Magic tools need the region store; ignore taps until ready.
      if (config.isMagic && !magicReady) return;
      track(ANALYTICS_EVENTS.TOOL_SELECTED, {
        tool: config.id,
        previousTool: useCanvasStore.getState().selectedTool,
      });
      if (config.brushType) {
        track(ANALYTICS_EVENTS.BRUSH_TYPE_CHANGED, {
          fromType: useCanvasStore.getState().brushType,
          toType: config.brushType,
        });
      }
      tapLight();
      setTool(config.tool);
      if (config.brushType) setBrushType(config.brushType);
      if (config.magicMode) setMagicMode(config.magicMode);
    },
    [setTool, setBrushType, setMagicMode, magicReady],
  );

  const isToolActive = useCallback(
    (config: ColoringToolConfig) => {
      if (config.tool === "magic") {
        return selectedTool === "magic" && magicMode === config.magicMode;
      }
      if (config.tool === "brush" && config.brushType) {
        return selectedTool === "brush" && brushType === config.brushType;
      }
      return selectedTool === config.tool;
    },
    [selectedTool, brushType, magicMode],
  );

  const handleUndo = () => {
    if (canUndo()) {
      track(ANALYTICS_EVENTS.CANVAS_UNDO);
      tapMedium();
      undo();
    } else {
      notifyWarning();
    }
  };

  const handleRedo = () => {
    if (canRedo()) {
      track(ANALYTICS_EVENTS.CANVAS_REDO);
      tapMedium();
      redo();
    } else {
      notifyWarning();
    }
  };

  // Height-adaptive tile sizes come from the SHARED helper so the rail card
  // width and the column-split width (getLandscapeSidebarWidths) agree exactly
  // (no empty gutter, no starved canvas). On a tall window everything resolves
  // to the iPad CEIL sizes (61 / 48). The inner ScrollView stays as a net.
  const isShort = availableHeight !== undefined && availableHeight < 560;
  const {
    tileSize,
    controlSize,
    actionSize,
    toolsContentWidth,
    rightCardWidth,
  } = getLandscapeRailFit(availableHeight);
  const gap = 8;
  // Every row (tools, magic, brush, undo/zoom, actions) pins to this width so
  // they share one left edge + content width. It is the SHARED content box from
  // getLandscapeRailFit — the MAX of the 3-tile grid and the 4-button zoom row —
  // so the zoom row no longer overflows/wraps inside a 3-tile-only basis.
  const gridWidth = toolsContentWidth;
  // On the SHORT (iPhone-landscape) path the content box is widened to fit the
  // 4-button zoom row, so the narrower 3-tile rows would hug the left and leave
  // a gap on the right. Center the normally-left-aligned grids so the whole rail
  // reads symmetric. On iPad the box == the 3-tile grid, so centering is a
  // no-op → web's left-aligned layout is unchanged.
  const gridJustify = isShort ? ("center" as const) : ("flex-start" as const);

  // In scrollable (portrait) mode the rail is full content height with NO
  // inner scroll — a plain View — so every row renders and the outer page
  // scroll handles overflow. In landscape it keeps the height-capped inner
  // ScrollView. Same children either way.
  const RailBody = scrollable ? View : ScrollView;
  const railBodyProps = scrollable
    ? { style: [styles.scrollContent, { width: gridWidth }] }
    : {
        style: styles.scrollView,
        showsVerticalScrollIndicator: false,
        contentContainerStyle: [styles.scrollContent, { width: gridWidth }],
      };

  return (
    // paddingRight clears the notch (edgeInset) while keeping the card flush to
    // the inner usable edge. The COLUMN width already reserves edgeInset, so we
    // pad by max(8, edgeInset) — never less than the base 8pt gutter.
    <View
      style={[styles.outer, { width, paddingRight: Math.max(8, edgeInset) }]}
    >
      {/* Floating tools rail (web's DesktopToolsSidebar) — content-height
          rounded card, 3-column LEFT-ALIGNED grid + control rows. */}
      <View
        style={[
          styles.rail,
          scrollable && styles.railScrollable,
          // ALWAYS pin the card to the SHARED rightCardWidth (content box +
          // padding + border) — the same value the column split reserves — so
          // the inner content box == gridWidth exactly. Leaving it to content-hug
          // on iPad let the inner ScrollView stretch the card wider than the
          // column, and alignSelf:flex-end then pushed the LEFT column of tiles
          // off the card's left edge (clipped). Pinning the width fixes it.
          { width: rightCardWidth },
        ]}
      >
        <RailBody {...railBodyProps}>
          {/* Regular tools — 3-column grid (left on iPad, centered when the
              card is widened on iPhone-landscape). */}
          <View
            style={[
              styles.toolGrid,
              { gap, width: gridWidth, justifyContent: gridJustify },
            ]}
          >
            {COLORING_REGULAR_TOOLS.map((config) => (
              <ToolTile
                key={config.id}
                icon={config.icon}
                label={config.label}
                selected={isToolActive(config)}
                size={tileSize}
                onPress={() => handleToolSelect(config)}
              />
            ))}
          </View>

          {/* Magic tools — 2-up, gradient + sparkle. */}
          <View
            style={[
              styles.toolGrid,
              { gap, width: gridWidth, justifyContent: gridJustify },
            ]}
          >
            {COLORING_MAGIC_TOOLS.map((config) => {
              const isTimeout = magicStatus === "timeout";
              return (
                <ToolTile
                  key={config.id}
                  icon={config.icon}
                  label={config.label}
                  isMagic
                  selected={isToolActive(config)}
                  // Spinner while waiting/retrying; rotate-arrow on timeout
                  // (enabled → tap re-kicks generation). Web ToolSelector parity.
                  loading={
                    !magicReady &&
                    (magicStatus === "waiting" || magicStatus === "retrying")
                  }
                  timedOut={isTimeout}
                  size={tileSize}
                  onPress={() =>
                    isTimeout ? onMagicRetry?.() : handleToolSelect(config)
                  }
                />
              );
            })}
          </View>

          <View style={styles.divider} />

          {/* Brush sizes (left on iPad, centered when widened on iPhone). */}
          <View
            style={[
              styles.controlRow,
              { gap, width: gridWidth, justifyContent: gridJustify },
            ]}
          >
            <BrushSizeRow
              selectedRadius={brushSize}
              onSelect={(radius) => {
                track(ANALYTICS_EVENTS.BRUSH_SIZE_CHANGED, {
                  fromSize: useCanvasStore.getState().brushSize,
                  toSize: radius,
                });
                tapLight();
                setBrushSize(radius);
              }}
              color={selectedTool === "eraser" ? "#9E9E9E" : selectedColor}
              tileSize={controlSize}
            />
          </View>

          <View style={styles.divider} />

          {/* Undo / Redo — stroke glyphs, CENTERED, borderless (no circle). */}
          <View style={[styles.controlRowCentered, { gap, width: gridWidth }]}>
            <Pressable
              onPress={handleUndo}
              disabled={!canUndoNow}
              style={[
                styles.controlButtonBorderless,
                { width: controlSize, height: controlSize },
                !canUndoNow && styles.disabled,
              ]}
              accessibilityLabel="Undo"
            >
              <UndoIcon
                size={24}
                color={canUndoNow ? COLORS.textPrimary : COLORS.textMuted}
              />
            </Pressable>
            <Pressable
              onPress={handleRedo}
              disabled={!canRedoNow}
              style={[
                styles.controlButtonBorderless,
                { width: controlSize, height: controlSize },
                !canRedoNow && styles.disabled,
              ]}
              accessibilityLabel="Redo"
            >
              <RedoIcon
                size={24}
                color={canRedoNow ? COLORS.textPrimary : COLORS.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* Zoom — stroke glyphs, borderless. Web's ZoomControls row:
              zoom out / in / home (reset-to-fit) / fullscreen (focus mode).
              The home + fullscreen buttons are DISTINCT — home returns to the
              whole picture, fullscreen toggles focus mode (hides all chrome).
              Previously these were conflated into one expand button wired to
              reset-zoom, so focus mode had no entry on iPad. */}
          <View style={[styles.controlRowCentered, { gap, width: gridWidth }]}>
            <Pressable
              onPress={() => {
                tapLight();
                onZoomOut?.();
              }}
              disabled={zoom <= minZoom}
              style={[
                styles.controlButtonBorderless,
                { width: controlSize, height: controlSize },
                zoom <= minZoom && styles.disabled,
              ]}
              accessibilityLabel="Zoom out"
            >
              <ZoomOutIcon
                size={22}
                color={
                  zoom <= minZoom ? COLORS.textMuted : COLORS.textSecondary
                }
              />
            </Pressable>
            <Pressable
              onPress={() => {
                tapLight();
                onZoomIn?.();
              }}
              disabled={zoom >= maxZoom}
              style={[
                styles.controlButtonBorderless,
                { width: controlSize, height: controlSize },
                zoom >= maxZoom && styles.disabled,
              ]}
              accessibilityLabel="Zoom in"
            >
              <ZoomInIcon
                size={22}
                color={
                  zoom >= maxZoom ? COLORS.textMuted : COLORS.textSecondary
                }
              />
            </Pressable>
            {/* Home — reset zoom/pan back to the whole picture (web's
                HomeIcon reset-view). */}
            <Pressable
              onPress={() => {
                tapLight();
                onResetZoom?.();
              }}
              style={[
                styles.controlButtonBorderless,
                { width: controlSize, height: controlSize },
              ]}
              accessibilityLabel="See whole picture"
            >
              <HomeIcon size={22} color={COLORS.textSecondary} />
            </Pressable>
            {/* Fullscreen — toggles focus mode (hides all chrome, full-bleed
                canvas). Web's trailing expand button; the floating X exits. */}
            <Pressable
              onPress={() => {
                tapLight();
                toggleFocus();
              }}
              style={[
                styles.controlButtonBorderless,
                { width: controlSize, height: controlSize },
              ]}
              accessibilityLabel={
                isFocusMode ? "Exit focus mode" : "Enter focus mode"
              }
            >
              <ExpandIcon size={22} color={COLORS.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.zoomPercentage}>{Math.round(zoom * 100)}%</Text>

          {/* Actions — Start Over / Print / Save / My Artwork (web's actions
              slot). Each tile is its own button that opens its OWN sheet:
              Start Over → destructive confirm; Print / Save / My Artwork →
              their ActionSheets. The 4th (heart) wraps to a second row. */}
          {(onStartOver || onPrint || onSave || onMyArtwork) && (
            <>
              <View style={styles.divider} />
              <View
                style={[
                  styles.toolGrid,
                  { gap, width: gridWidth, justifyContent: gridJustify },
                ]}
              >
                <Pressable
                  onPress={() => {
                    tapLight();
                    onStartOver?.();
                  }}
                  style={[
                    styles.actionTile,
                    { width: actionSize, height: actionSize },
                  ]}
                  accessibilityLabel="Start Over"
                >
                  <FontAwesomeIcon
                    icon={faArrowsRotate}
                    size={24}
                    color={COLORS.textPrimary}
                  />
                </Pressable>
                <Pressable
                  onPress={() => {
                    tapLight();
                    onPrint?.();
                  }}
                  style={[
                    styles.actionTile,
                    { width: actionSize, height: actionSize },
                  ]}
                  accessibilityLabel="Print"
                >
                  <FontAwesomeIcon
                    icon={faPrint}
                    size={24}
                    color={COLORS.textPrimary}
                  />
                </Pressable>
                <Pressable
                  onPress={() => {
                    tapLight();
                    onSave?.();
                  }}
                  style={[
                    styles.actionTile,
                    { width: actionSize, height: actionSize },
                  ]}
                  accessibilityLabel="Save"
                >
                  <FontAwesomeIcon
                    icon={faFloppyDisk}
                    size={22}
                    color={COLORS.textPrimary}
                  />
                </Pressable>
                <Pressable
                  onPress={() => {
                    tapLight();
                    onMyArtwork?.();
                  }}
                  style={[
                    styles.actionTile,
                    { width: actionSize, height: actionSize },
                  ]}
                  accessibilityLabel="My Artwork"
                >
                  <FontAwesomeIcon
                    icon={faHeart}
                    size={22}
                    color={COLORS.textPrimary}
                  />
                </Pressable>
              </View>
            </>
          )}
        </RailBody>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Outer column: fixed width (from prop), never squeezed by the flex row.
  // The row top-aligns all columns, and this rail's top lines up with the
  // PROGRESS-BAR row (CanvasTopBar) — web spans the bar between the two
  // rails with their tops sharing the bar's top edge. Same top padding as
  // the canvas column (12), NOT a bar-height offset. Left padding = gap.
  outer: {
    flexShrink: 0,
    // Stretch to the row height so the rail card's maxHeight:'100%' + inner
    // ScrollView actually cap/scroll on a short window. Tall window: card hugs
    // content (shorter than the row) → no-op, iPad unchanged.
    alignSelf: "stretch",
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 16,
  },
  // Floating tools rail card — pure content height (web radius 24, uniform
  // 16 padding); grows to fit all controls. maxHeight caps it to the column
  // height so an unusually tall stack scrolls inside rather than overflowing.
  rail: {
    // Hug content width (the 3-tile grid + padding) and align to the END of the
    // column (right edge) so it doesn't stretch full-width and leave empty space
    // inside when tiles shrink on a short window. Width is set inline = gridWidth
    // + 32 padding. alignSelf:flex-end keeps it flush to the right rail position.
    alignSelf: "flex-end",
    maxHeight: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  // Portrait (outer page scrolls): drop the height cap so the rail is full
  // content height and nothing gets clipped by an inner scroll viewport.
  railScrollable: {
    maxHeight: undefined,
  },
  scrollView: {
    flexShrink: 1,
  },
  scrollContent: {
    gap: 14,
    // Trailing space so the last row (the Start Over / Print / Save action
    // tiles) clears the rail card's rounded bottom corner (radius 24) — without
    // it the corner clipped the bottom of the action icons when the content
    // filled the height-capped rail.
    paddingBottom: 8,
  },
  // 3-column tool grid — LEFT-ALIGNED (web justifyContent: normal/start).
  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  // Brush-size row — left-aligned (sits under the left-aligned tool grid).
  controlRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  // Undo/redo + zoom rows — CENTERED (web centers these control clusters).
  controlRowCentered: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    alignSelf: "stretch",
    backgroundColor: COLORS.bgCreamDark,
    marginVertical: 2,
  },
  // Undo/redo/zoom buttons: BORDERLESS (no circle) — icon-only on the rail's
  // white card, matching web's perceived borderless treatment.
  controlButtonBorderless: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
  },
  // Action tiles: white + 1px cream border, duotone icon (web actions slot).
  actionTile: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.bgCreamDark,
    backgroundColor: COLORS.white,
  },
  disabled: {
    opacity: 0.5,
  },
  zoomPercentage: {
    textAlign: "center",
    width: "100%",
    fontSize: 18,
    fontFamily: "TondoTrial-Bold",
    color: COLORS.textPrimary,
    marginTop: 4,
  },
});

export default ToolsSidebar;
