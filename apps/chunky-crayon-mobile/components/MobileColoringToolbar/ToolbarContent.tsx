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
import { track } from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";
import { COLORING_PALETTE_VARIANTS } from "@/lib/coloring/palette";
import ToolTile from "@/components/coloring/ToolTile";
import BrushSizeRow from "@/components/coloring/BrushSizeRow";
import PaletteVariantPills from "@/components/coloring/PaletteVariantPills";
import ColorSwatchGrid from "@/components/coloring/ColorSwatchGrid";
import StickerPickerGrid from "@/components/coloring/StickerPickerGrid";
import { UndoIcon, RedoIcon } from "@/components/coloring/StrokeIcons";
import {
  COLORING_REGULAR_TOOLS,
  COLORING_MAGIC_TOOLS,
  type ColoringToolConfig,
} from "@/lib/coloring/tools";
import { useT } from "@/lib/i18n/useT";

// Tool slug (catalog id) -> i18n key under mobile.coloring.tool.*. The shared
// tools catalog stays untouched; the localized label is resolved at the render
// site, mirroring SceneInput's t(`subject.${key}`) pattern.
const TOOL_LABEL_KEY: Record<string, string> = {
  crayon: "crayon",
  marker: "marker",
  pencil: "pencil",
  paintbrush: "paint",
  glitter: "glitter",
  fill: "fill",
  eraser: "eraser",
  sticker: "sticker",
  "magic-reveal": "magicBrush",
  "magic-auto": "autoColor",
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
const TOOL_COLUMNS = 5;
const TOOL_GAP = 8;

const ToolbarContent = () => {
  const t = useT("mobile.coloring");
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
    magicStatus,
    onMagicRetry,
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

  // With the Sticker tool active, the phone sheet picks the STICKER (what you
  // place) instead of a colour — swap the palette pills + swatches for the
  // sticker picker, matching the iPad rail. Without this, a kid on phone could
  // select the Sticker tool but had no way to choose WHICH sticker.
  const isStickerToolActive = selectedTool === "sticker";

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
                    label={t(`tool.${TOOL_LABEL_KEY[config.id] ?? config.id}`)}
                    isMagic={config.isMagic}
                    // A magic tool can't be MEANINGFULLY active unless the magic
                    // system is ready — but selectedTool persists in the global
                    // store across images, so opening a store-less image with
                    // Magic Brush still selected painted the tile "active" while
                    // the status was waiting/timeout (active bg + retry arrow =
                    // unreadable pink-on-pink, and a tool that silently does
                    // nothing). Gate the visual on readiness.
                    selected={
                      isToolActive(config) && (!config.isMagic || magicReady)
                    }
                    // Magic tiles: spinner while waiting/retrying, rotate-arrow
                    // retry on timeout (tap re-kicks generation). Web parity.
                    loading={
                      config.isMagic &&
                      !magicReady &&
                      (magicStatus === "waiting" || magicStatus === "retrying")
                    }
                    timedOut={config.isMagic && magicStatus === "timeout"}
                    size={toolTileSize}
                    onPress={() =>
                      config.isMagic && magicStatus === "timeout"
                        ? onMagicRetry?.()
                        : handleToolSelect(config)
                    }
                  />
                </View>
              );
            },
          )}
        </View>
      </View>

      {isStickerToolActive ? (
        /* Sticker tool: pick WHICH sticker (replaces palette + swatches).
           Wider cells + labelled category pills since the phone sheet has
           room. */
        <View style={styles.section}>
          <StickerPickerGrid cellSize={60} columns={5} showLabels />
        </View>
      ) : (
        <>
          {/* Palette-variant pills (4 across) */}
          <View style={styles.section}>
            <PaletteVariantPills
              selected={paletteVariant}
              onSelect={(variant) => {
                track(ANALYTICS_EVENTS.PALETTE_VARIANT_CHANGED, {
                  fromVariant: useCanvasStore.getState().paletteVariant,
                  toVariant: variant,
                });
                setPaletteVariant(variant);
              }}
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
                track(ANALYTICS_EVENTS.PAGE_COLOR_SELECTED, {
                  color,
                  colorName: COLORING_PALETTE_VARIANTS[paletteVariant]?.find(
                    (s) => s.hex.toLowerCase() === color.toLowerCase(),
                  )?.name,
                });
                selectionChanged();
                setColor(color);
              }}
              columns={8}
            />
          </View>
        </>
      )}

      {/* Brush sizes — own row, left-aligned. Tiles are the SAME size as the
          tool-grid cards (web: brush tiles match the tool tiles), so they read
          as one consistent control language, not shrunken pills. */}
      <View style={styles.section}>
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
          tileSize={toolTileSize}
        />
      </View>

      {/* Undo / redo — own row below, left-aligned (web's history row:
          flex gap-3). Tiles match the tool-grid card size too. */}
      <View style={[styles.section, styles.historyRow]}>
        <Pressable
          onPress={handleUndo}
          disabled={!canUndo()}
          style={[
            styles.historyTile,
            { width: toolTileSize, height: toolTileSize },
            !canUndo() && styles.disabled,
          ]}
          accessibilityLabel={t("undo")}
        >
          <UndoIcon
            size={28}
            color={canUndo() ? COLORS.textPrimary : COLORS.textMuted}
          />
        </Pressable>
        <Pressable
          onPress={handleRedo}
          disabled={!canRedo()}
          style={[
            styles.historyTile,
            { width: toolTileSize, height: toolTileSize },
            !canRedo() && styles.disabled,
          ]}
          accessibilityLabel={t("redo")}
        >
          <RedoIcon
            size={28}
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
  // Undo/redo history row — left-aligned, web's `flex gap-3`.
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  // Bordered rounded-card history tile (web: size-14 rounded-coloring-card
  // border-2 border-coloring-surface-dark bg-white).
  historyTile: {
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

export default ToolbarContent;
