import { useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faArrowsRotate,
  faPrint,
  faFloppyDisk,
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
} from "@/components/coloring/StrokeIcons";
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
  /** Opens the action sheet (Save / Share / Start Over). */
  onOpenActions?: () => void;
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
  minZoom = 0.5,
  maxZoom = 3,
  onOpenActions,
}: ToolsSidebarProps) => {
  const insets = useSafeAreaInsets();

  const {
    selectedTool,
    brushType,
    brushSize,
    magicMode,
    magicReady,
    selectedColor,
    setTool,
    setBrushType,
    setBrushSize,
    setMagicMode,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCanvasStore();

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

  return (
    <View style={[styles.outer, { width, paddingRight: insets.right + 8 }]}>
      {/* Floating tools rail (web's DesktopToolsSidebar) — content-height
          rounded card, 3-column LEFT-ALIGNED grid + control rows. */}
      <View style={styles.rail}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { width: gridWidth }]}
        >
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
              disabled={!canUndo()}
              style={[
                styles.controlButtonBorderless,
                { width: controlSize, height: controlSize },
                !canUndo() && styles.disabled,
              ]}
              accessibilityLabel="Undo"
            >
              <UndoIcon
                size={24}
                color={canUndo() ? COLORS.textPrimary : COLORS.textMuted}
              />
            </Pressable>
            <Pressable
              onPress={handleRedo}
              disabled={!canRedo()}
              style={[
                styles.controlButtonBorderless,
                { width: controlSize, height: controlSize },
                !canRedo() && styles.disabled,
              ]}
              accessibilityLabel="Redo"
            >
              <RedoIcon
                size={24}
                color={canRedo() ? COLORS.textPrimary : COLORS.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* Zoom — stroke magnifier glyphs, borderless. Zoom out / in /
              fullscreen (faExpand, persistent — web's third zoom button). */}
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
            {/* Fullscreen / fit-view — persistent third zoom button (web's
                expand button). Resets the canvas to fit. */}
            <Pressable
              onPress={() => {
                tapLight();
                onResetZoom?.();
              }}
              style={[
                styles.controlButtonBorderless,
                { width: controlSize, height: controlSize },
              ]}
              accessibilityLabel="Fit to screen"
            >
              <ExpandIcon size={22} color={COLORS.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.zoomPercentage}>{Math.round(zoom * 100)}%</Text>

          {/* Actions — Start Over / Print / Save (web's actions slot). All
              open the action sheet which performs save/share/start-over. */}
          {onOpenActions && (
            <>
              <View style={styles.divider} />
              <View style={[styles.toolGrid, { gap, width: gridWidth }]}>
                <Pressable
                  onPress={() => {
                    tapLight();
                    onOpenActions();
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
                    onOpenActions();
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
                    onOpenActions();
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
              </View>
            </>
          )}
        </ScrollView>
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
  scrollView: {
    flexShrink: 1,
  },
  scrollContent: {
    gap: 14,
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
