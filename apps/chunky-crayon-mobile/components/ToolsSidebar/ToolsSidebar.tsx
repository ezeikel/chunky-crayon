import { useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faArrowRotateLeft,
  faArrowRotateRight,
  faMagnifyingGlassPlus,
  faMagnifyingGlassMinus,
  faExpand,
} from "@fortawesome/pro-duotone-svg-icons";
import { useCanvasStore } from "@/stores/canvasStore";
import { tapLight, tapMedium, notifyWarning } from "@/utils/haptics";
import { COLORS } from "@/lib/design";
import ToolTile from "@/components/coloring/ToolTile";
import BrushSizeRow from "@/components/coloring/BrushSizeRow";
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
};

/**
 * Right tools sidebar for the three-column coloring layout — mirrors CC
 * web's DesktopToolsSidebar: a 3-column grid of regular tools, a 2-up row
 * of magic tiles (purple→pink gradient + sparkle), brush sizes, undo/redo,
 * and zoom (±, reset, and a NN% readout). Built on the shared ToolTile /
 * BrushSizeRow primitives so the look matches web exactly.
 */
const ToolsSidebar = ({
  width,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  zoom = 1,
  minZoom = 0.5,
  maxZoom = 3,
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

  // 3-column tools grid (web's DesktopToolsSidebar): regular tools 3-up,
  // magic tiles 2-up, then brush/undo-redo/zoom rows. The rail width is set
  // by the layout to fit exactly 3 tiles + gaps + padding.
  const gap = 8;
  const tileSize = 56;
  const zoomButtonSize = 48;
  // Width of the 3-tile grid — keeps the rows (brush/undo/zoom) aligned to
  // the same content width as the tool grid.
  const gridWidth = tileSize * 3 + gap * 2;

  return (
    <View style={[styles.outer, { width, paddingRight: insets.right + 8 }]}>
      {/* Floating tools rail (web's DesktopToolsSidebar): a rounded card
          filling the column height, 3-column tool grid + control rows. */}
      <View style={styles.rail}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { width: gridWidth }]}
        >
          {/* Regular tools — 3-column grid (web slim rail) */}
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

          {/* Magic tools — 2-up, gradient + sparkle */}
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

          {/* Brush sizes */}
          <BrushSizeRow
            selectedRadius={brushSize}
            onSelect={(radius) => {
              tapLight();
              setBrushSize(radius);
            }}
            color={selectedTool === "eraser" ? "#9E9E9E" : selectedColor}
            tileSize={tileSize}
          />

          <View style={styles.divider} />

          {/* Undo / Redo */}
          <View style={[styles.row, { gap }]}>
            <Pressable
              onPress={handleUndo}
              disabled={!canUndo()}
              style={[
                styles.iconButton,
                { width: tileSize, height: tileSize },
                !canUndo() && styles.disabled,
              ]}
              accessibilityLabel="Undo"
            >
              <FontAwesomeIcon
                icon={faArrowRotateLeft}
                size={18}
                color={canUndo() ? COLORS.textPrimary : COLORS.textMuted}
              />
            </Pressable>
            <Pressable
              onPress={handleRedo}
              disabled={!canRedo()}
              style={[
                styles.iconButton,
                { width: tileSize, height: tileSize },
                !canRedo() && styles.disabled,
              ]}
              accessibilityLabel="Redo"
            >
              <FontAwesomeIcon
                icon={faArrowRotateRight}
                size={18}
                color={canRedo() ? COLORS.textPrimary : COLORS.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* Zoom — ±, reset, and NN% readout (web's sidebar zoom). */}
          <View style={[styles.row, { gap }]}>
            <Pressable
              onPress={() => {
                tapLight();
                onZoomOut?.();
              }}
              disabled={zoom <= minZoom}
              style={[
                styles.iconButton,
                { width: zoomButtonSize, height: zoomButtonSize },
                zoom <= minZoom && styles.disabled,
              ]}
              accessibilityLabel="Zoom out"
            >
              <FontAwesomeIcon
                icon={faMagnifyingGlassMinus}
                size={16}
                color={zoom <= minZoom ? COLORS.textMuted : COLORS.textPrimary}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                tapLight();
                onZoomIn?.();
              }}
              disabled={zoom >= maxZoom}
              style={[
                styles.iconButton,
                { width: zoomButtonSize, height: zoomButtonSize },
                zoom >= maxZoom && styles.disabled,
              ]}
              accessibilityLabel="Zoom in"
            >
              <FontAwesomeIcon
                icon={faMagnifyingGlassPlus}
                size={16}
                color={zoom >= maxZoom ? COLORS.textMuted : COLORS.textPrimary}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                tapLight();
                onResetZoom?.();
              }}
              style={[
                styles.iconButton,
                { width: zoomButtonSize, height: zoomButtonSize },
              ]}
              accessibilityLabel="Reset zoom"
            >
              <FontAwesomeIcon
                icon={faExpand}
                size={16}
                color={COLORS.textPrimary}
              />
            </Pressable>
          </View>
          <Text style={styles.zoomPercentage}>{Math.round(zoom * 100)}%</Text>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Outer column: fixed width (from prop), never squeezed by the flex row.
  // The card is capped to the column height (paddingVertical = breathing
  // room) so its inner ScrollView is height-bounded and the tool stack
  // scrolls INSIDE the card — controls never spill past the card bottom.
  // The left padding is the canvas gap so the rail floats clear of the
  // canvas card.
  outer: {
    flexShrink: 0,
    justifyContent: "center",
    paddingVertical: 12,
    paddingLeft: 16,
  },
  // Floating tools rail card — fills the column height; its content scrolls
  // within it (flexShrink lets it shrink when content is short).
  rail: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    paddingVertical: 12,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
    alignItems: "center",
  },
  // 3-column tool grid (wraps within the fixed gridWidth set inline).
  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    alignSelf: "stretch",
    backgroundColor: COLORS.bgCreamDark,
    marginVertical: 2,
  },
  // Control rows (brush sizes / undo-redo / zoom) lay out horizontally,
  // centered, matching the 3-up tool grid above.
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    backgroundColor: COLORS.white,
  },
  disabled: {
    opacity: 0.5,
  },
  zoomPercentage: {
    textAlign: "center",
    fontSize: 14,
    fontFamily: "TondoTrial-Bold",
    color: COLORS.textPrimary,
    marginTop: 2,
  },
});

export default ToolsSidebar;
