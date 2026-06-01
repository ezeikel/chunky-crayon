import { useCallback, useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  type LayoutChangeEvent,
} from "react-native";
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
const TOOL_COLUMNS = 5;
const TOOL_GAP = 8;

const ToolbarContent = () => {
  const { touchTargetSize } = useResponsiveLayout();
  const tile = touchTargetSize.medium;

  // Tools render as a 5-column grid (web: `grid grid-cols-5 gap-2`), tiles
  // stretching to fill each column. Measure the row width and derive a square
  // tile size from it so the grid fills the sheet edge-to-edge like web,
  // rather than a fixed-size horizontal scroll row.
  const [toolRowWidth, setToolRowWidth] = useState(0);
  const onToolRowLayout = useCallback((e: LayoutChangeEvent) => {
    setToolRowWidth(e.nativeEvent.layout.width);
  }, []);
  const toolTileSize =
    toolRowWidth > 0
      ? Math.floor(
          (toolRowWidth - TOOL_GAP * (TOOL_COLUMNS - 1)) / TOOL_COLUMNS,
        )
      : tile;
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

      {/* Tools — 5-column grid (web: `grid grid-cols-5 gap-2`), 2 rows of 5
          (8 regular + 2 magic). Tiles stretch to fill each column. FIRST,
          like web. */}
      <View style={styles.section} onLayout={onToolRowLayout}>
        <View style={styles.toolGrid}>
          {[...COLORING_REGULAR_TOOLS, ...COLORING_MAGIC_TOOLS].map(
            (config, i) => {
              const col = i % TOOL_COLUMNS;
              return (
                <View
                  key={config.id}
                  style={[
                    styles.toolCell,
                    {
                      marginLeft: col === 0 ? 0 : TOOL_GAP,
                      marginBottom: TOOL_GAP,
                    },
                  ]}
                >
                  <ToolTile
                    icon={config.icon}
                    label={config.label}
                    isMagic={config.isMagic}
                    selected={isToolActive(config)}
                    loading={config.isMagic ? !magicReady : false}
                    size={toolTileSize}
                    onPress={() => handleToolSelect(config)}
                  />
                </View>
              );
            },
          )}
        </View>
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
          columns={8}
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
  // 5-column tool grid (web `grid grid-cols-5`). Wraps to 2 rows of 5.
  // Per-cell marginLeft (not row `gap`) supplies the column gap so the row
  // sums to exactly the measured width and never wraps mid-row.
  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  toolCell: {
    flexGrow: 0,
    flexShrink: 0,
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
