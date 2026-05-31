import { useCallback } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
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
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { tapLight, tapMedium, notifyWarning } from "@/utils/haptics";
import { COLORS } from "@/lib/design";
import ToolTile from "@/components/coloring/ToolTile";
import BrushSizeRow from "@/components/coloring/BrushSizeRow";
import PaletteVariantPills from "@/components/coloring/PaletteVariantPills";
import ColorSwatchGrid from "@/components/coloring/ColorSwatchGrid";
import {
  COLORING_REGULAR_TOOLS,
  COLORING_MAGIC_TOOLS,
  type ColoringToolConfig,
} from "@/lib/coloring/tools";

type ColoringToolbarProps = {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
};

/**
 * Middle-tier toolbar — the toolbar-above-canvas panel for medium widths
 * (iPad portrait / phone landscape), mirroring CC web's ColoringToolbar:
 * one flat white card sitting ABOVE the canvas, holding the same controls
 * as the sidebars but laid out horizontally — palette-variant pills, a
 * wide swatch grid, the tool row + magic tiles, brush sizes, and an
 * undo/redo + zoom row. Built on the shared primitives so the look
 * matches web exactly. Tile size comes from the responsive layout's
 * medium touch target so tiles scale with device size (phone 48 / tablet
 * 64) and stay above the iOS minimum.
 */
const ColoringToolbar = ({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  zoom = 1,
  minZoom = 0.5,
  maxZoom = 3,
}: ColoringToolbarProps) => {
  const insets = useSafeAreaInsets();
  const { touchTargetSize } = useResponsiveLayout();
  const tile = touchTargetSize.medium;

  const {
    selectedTool,
    brushType,
    brushSize,
    magicMode,
    magicReady,
    selectedColor,
    paletteVariant,
    setTool,
    setColor,
    setBrushType,
    setBrushSize,
    setMagicMode,
    setPaletteVariant,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCanvasStore();

  const isMagicToolActive =
    selectedTool === "magic" &&
    (magicMode === "suggest" || magicMode === "auto");

  const handleToolSelect = useCallback(
    (config: ColoringToolConfig) => {
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

  return (
    <View
      style={[
        styles.card,
        { marginLeft: insets.left + 12, marginRight: insets.right + 12 },
      ]}
    >
      {/* Palette-variant pills (4 across) */}
      <PaletteVariantPills
        selected={paletteVariant}
        onSelect={setPaletteVariant}
        columns={4}
      />

      {/* Wide swatch grid — dims for magic tools */}
      <View
        style={{ opacity: isMagicToolActive ? 0.4 : 1 }}
        pointerEvents={isMagicToolActive ? "none" : "auto"}
      >
        <ColorSwatchGrid
          variant={paletteVariant}
          selectedColor={isMagicToolActive ? "" : selectedColor}
          onSelect={(c) => {
            tapLight();
            setColor(c);
          }}
          columns={10}
        />
      </View>

      {/* Tools — horizontal scroll row (regular + magic) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toolRow}
      >
        {COLORING_REGULAR_TOOLS.map((config) => (
          <ToolTile
            key={config.id}
            icon={config.icon}
            label={config.label}
            selected={isToolActive(config)}
            size={tile}
            onPress={() => handleToolSelect(config)}
          />
        ))}
        {COLORING_MAGIC_TOOLS.map((config) => (
          <ToolTile
            key={config.id}
            icon={config.icon}
            label={config.label}
            isMagic
            selected={isToolActive(config)}
            loading={!magicReady}
            size={tile}
            onPress={() => handleToolSelect(config)}
          />
        ))}
      </ScrollView>

      {/* Brush sizes + undo/redo + zoom on one row */}
      <View style={styles.bottomRow}>
        <BrushSizeRow
          selectedRadius={brushSize}
          onSelect={(radius) => {
            tapLight();
            setBrushSize(radius);
          }}
          color={selectedTool === "eraser" ? "#9E9E9E" : selectedColor}
          tileSize={tile}
        />

        <View style={styles.spacer} />

        <Pressable
          onPress={handleUndo}
          disabled={!canUndo()}
          style={[
            styles.iconButton,
            { width: tile, height: tile },
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
            { width: tile, height: tile },
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

        <View style={styles.zoomGroup}>
          <Pressable
            onPress={() => {
              tapLight();
              onZoomOut?.();
            }}
            disabled={zoom <= minZoom}
            style={[
              styles.iconButton,
              { width: tile, height: tile },
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
              { width: tile, height: tile },
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
            style={[styles.iconButton, { width: tile, height: tile }]}
            accessibilityLabel="Reset zoom"
          >
            <FontAwesomeIcon
              icon={faExpand}
              size={16}
              color={COLORS.textPrimary}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  toolRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
    paddingRight: 8,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  spacer: {
    flex: 1,
  },
  zoomGroup: {
    flexDirection: "row",
    gap: 8,
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
});

export default ColoringToolbar;
