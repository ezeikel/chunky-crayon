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

  // 3-column tool grid (web's DesktopToolsSidebar). Tile size from the
  // available width; clamp so tiles stay chunky but fit.
  const paddingHorizontal = 12;
  const gap = 8;
  const availableWidth = width - paddingHorizontal * 2 - insets.right;
  const tileSize = Math.max(
    44,
    Math.min(Math.floor((availableWidth - gap * 2) / 3), 64),
  );
  const zoomButtonSize = Math.max(40, tileSize - 8);

  return (
    <View style={[styles.outer, { width, paddingRight: insets.right + 8 }]}>
      {/* Slim floating rail (web's DesktopToolsSidebar): a rounded card
          vertically centered next to the canvas, single-column tool stack. */}
      <View style={styles.rail}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Regular tools — single-column vertical stack (web slim rail) */}
          <View style={[styles.toolColumn, { gap }]}>
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

          {/* Magic tools — stacked, gradient + sparkle */}
          <View style={[styles.toolColumn, { gap }]}>
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
  // Outer column: fixed width (from prop), never squeezed by the flex row,
  // vertically centers the rail next to the canvas.
  outer: {
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "stretch",
    paddingVertical: 12,
  },
  // Slim floating rail card.
  rail: {
    flexShrink: 1,
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
  scrollContent: {
    gap: 12,
    alignItems: "center",
  },
  toolColumn: {
    flexDirection: "column",
    alignItems: "center",
  },
  divider: {
    height: 1,
    alignSelf: "stretch",
    backgroundColor: COLORS.bgCreamDark,
    marginVertical: 2,
  },
  row: {
    flexDirection: "column",
    alignItems: "center",
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
