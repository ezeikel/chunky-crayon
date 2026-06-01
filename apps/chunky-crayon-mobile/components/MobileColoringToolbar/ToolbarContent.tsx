import { useCallback } from "react";
import { View, Pressable, ScrollView, StyleSheet } from "react-native";
import { COLORS } from "@/lib/design";
import { useCanvasStore } from "@/stores/canvasStore";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import {
  tapLight,
  tapMedium,
  notifyWarning,
  selectionChanged,
} from "@/utils/haptics";
import ToolTile from "@/components/coloring/ToolTile";
import BrushSizeRow from "@/components/coloring/BrushSizeRow";
import PaletteVariantPills from "@/components/coloring/PaletteVariantPills";
import ColorSwatchGrid from "@/components/coloring/ColorSwatchGrid";
import { UndoIcon, RedoIcon } from "@/components/coloring/StrokeIcons";
import {
  COLORING_REGULAR_TOOLS,
  COLORING_MAGIC_TOOLS,
  type ColoringToolConfig,
} from "@/lib/coloring/tools";

type ToolbarContentProps = {
  /** Action handlers — each opens its OWN sheet (web/rail parity). Zoom is NOT
   *  here: on phone, zoom lives in the top chrome above the canvas (web). */
  onStartOver?: () => void;
  onPrint?: () => void;
  onSave?: () => void;
  onMyArtwork?: () => void;
};

/**
 * The scrollable body of the phone-tier coloring toolbar — the content of
 * the docked bottom sheet (`MobileColoringToolbar`). Rebuilt on the shared
 * coloring primitives so the phone tier matches web exactly, same as the
 * three-column sidebars and the middle-tier ColoringToolbar:
 *   - palette-variant pills (Realistic / Pastel / Cute / Surprise)
 *   - a swatch grid for the active variant (dims for magic tools)
 *   - the 10-tool web set as horizontal ToolTiles + the magic tiles
 *   - brush sizes (Fine / Regular / Chunky)
 *   - undo / redo
 *
 * Reads everything from `useCanvasStore` (zustand), takes no props.
 *
 * Extracted from MobileColoringToolbar so the production component can wrap
 * it in a BottomSheet (which docks to the screen bottom) while Storybook can
 * render it inline in the story frame (a docked sheet renders off-canvas in
 * SB's split layout). Same component, two hosts — visuals identical.
 *
 * Tile size comes from the responsive layout's medium touch target so it
 * scales with device size and stays above the iOS minimum (matches the
 * other toolbars).
 */
const ToolbarContent = ({
  onStartOver,
  onPrint,
  onSave,
  onMyArtwork,
}: ToolbarContentProps) => {
  const { touchTargetSize } = useResponsiveLayout();
  const tile = touchTargetSize.medium;
  const {
    selectedTool,
    selectedColor,
    brushType,
    brushSize,
    magicMode,
    magicReady,
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

  return (
    <>
      {/* Order mirrors web's MobileColoringDrawer exactly:
          1. TOOLS  2. palette-variant pills  3. colour swatches  4. brush + undo/redo.
          (No zoom — top chrome; no actions — under the canvas.) */}

      {/* Tools — horizontal scroll row (regular + magic). FIRST, like web. */}
      <View style={styles.section}>
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
      </View>

      {/* Palette-variant pills (4 across) */}
      <View style={styles.section}>
        <PaletteVariantPills
          selected={paletteVariant}
          onSelect={setPaletteVariant}
          columns={4}
        />
      </View>

      {/* Swatch grid for the active variant — dims for magic tools. */}
      <View
        style={[styles.section, { opacity: isMagicToolActive ? 0.4 : 1 }]}
        pointerEvents={isMagicToolActive ? "none" : "auto"}
      >
        <ColorSwatchGrid
          variant={paletteVariant}
          selectedColor={isMagicToolActive ? "" : selectedColor}
          onSelect={(color) => {
            selectionChanged();
            setColor(color);
          }}
          columns={9}
        />
      </View>

      {/* Brush sizes + undo / redo on one row (borderless stroke glyphs). */}
      <View style={[styles.section, styles.bottomRow]}>
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
            styles.controlButtonBorderless,
            { width: tile, height: tile },
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
            { width: tile, height: tile },
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
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 14,
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
  // Borderless control button (web/rail parity — undo/redo have no circle).
  controlButtonBorderless: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default ToolbarContent;
