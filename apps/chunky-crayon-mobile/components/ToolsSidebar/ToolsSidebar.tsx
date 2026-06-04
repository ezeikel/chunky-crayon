import { useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faArrowsRotate,
  faPrint,
  faFloppyDisk,
  faHeart,
} from "@fortawesome/pro-duotone-svg-icons";
import { useCanvasStore } from "@/stores/canvasStore";
import { tapLight, tapMedium, notifyWarning } from "@/utils/haptics";
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
}: ToolsSidebarProps) => {
  const insets = useSafeAreaInsets();
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
      tapMedium();
      undo();
    } else {
      notifyWarning();
    }
  };

  const handleRedo = () => {
    if (canRedo()) {
      tapMedium();
      redo();
    } else {
      notifyWarning();
    }
  };

  // Web (measured): tool tiles 61px, controls 48px, actions 64px, 8px gap.
  // We render the action tiles at the tool-tile size (61) so all three fit
  // the shared 3-column grid width (a 64px action tile would overflow it and
  // wrap Save onto its own row).
  const gap = 8;
  const tileSize = 61;
  const controlSize = 48;
  const actionSize = 61;
  // The 3-tile grid width keeps every row (tools, magic, brush, undo/zoom,
  // actions) aligned to the same left edge and content width.
  const gridWidth = tileSize * 3 + gap * 2;

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
    <View style={[styles.outer, { width, paddingRight: insets.right + 8 }]}>
      {/* Floating tools rail (web's DesktopToolsSidebar) — content-height
          rounded card, 3-column LEFT-ALIGNED grid + control rows. */}
      <View style={[styles.rail, scrollable && styles.railScrollable]}>
        <RailBody {...railBodyProps}>
          {/* Regular tools — 3-column LEFT-ALIGNED grid (web). */}
          <View style={[styles.toolGrid, { gap, width: gridWidth }]}>
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
          <View style={[styles.toolGrid, { gap, width: gridWidth }]}>
            {COLORING_MAGIC_TOOLS.map((config) => (
              <ToolTile
                key={config.id}
                icon={config.icon}
                label={config.label}
                isMagic
                selected={isToolActive(config)}
                loading={!magicReady}
                size={tileSize}
                onPress={() => handleToolSelect(config)}
              />
            ))}
          </View>

          <View style={styles.divider} />

          {/* Brush sizes (left-aligned row). */}
          <View style={[styles.controlRow, { gap, width: gridWidth }]}>
            <BrushSizeRow
              selectedRadius={brushSize}
              onSelect={(radius) => {
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
              <View style={[styles.toolGrid, { gap, width: gridWidth }]}>
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
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 16,
  },
  // Floating tools rail card — pure content height (web radius 24, uniform
  // 16 padding); grows to fit all controls. maxHeight caps it to the column
  // height so an unusually tall stack scrolls inside rather than overflowing.
  rail: {
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
