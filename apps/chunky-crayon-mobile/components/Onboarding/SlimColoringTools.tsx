import { View, Pressable, StyleSheet } from "react-native";
import ColorSwatchGrid from "@/components/coloring/ColorSwatchGrid";
import BrushSizeRow from "@/components/coloring/BrushSizeRow";
import ToolTile from "@/components/coloring/ToolTile";
import { UndoIcon, RedoIcon } from "@/components/coloring/StrokeIcons";
import { COLORING_MAGIC_TOOLS, COLORING_TOOLS } from "@/lib/coloring/tools";
import { useCanvasStore } from "@/stores/canvasStore";
import { COLORS } from "@/lib/design";
import { useT } from "@/lib/i18n/useT";
import { selectionChanged, tapMedium, notifyWarning } from "@/utils/haptics";

// The basic tools surfaced in onboarding (the real configs from the live
// lineup, not invented buttons): the default Crayon brush, the Fill bucket, and
// the Eraser. Pulled by id so they stay in sync if the lineup's icon/brushType
// changes.
const BASIC_BRUSH = COLORING_TOOLS.find((t) => t.id === "crayon")!;
const BASIC_FILL = COLORING_TOOLS.find((t) => t.id === "fill")!;
const BASIC_ERASER = COLORING_TOOLS.find((t) => t.id === "eraser")!;

/**
 * The onboarding coloring chrome — composed from the SAME real sub-components
 * the live MobileColoringToolbar / sidebars use (the basic + magic ToolTiles,
 * BrushSizeRow, ColorSwatchGrid), arranged SLIM: two basic tools (Crayon brush +
 * Fill bucket) + the two magic tools (Magic Brush + Auto Color) + brush sizes +
 * color swatches. No full 10-tool grid, no stickers, no zoom/undo.
 *
 * Tools are driven through the store EXACTLY like ToolbarContent: the basic
 * tiles set tool="brush"+brushType or tool="fill"; the magic tiles set
 * tool="magic" + the tool's magicMode (canvas reacts natively — Auto Color fills
 * via the region store, Magic Brush reveals on tap). Magic tiles disable + spin
 * until the region store is ready (magicReady); the basic tools always work.
 *
 * `direction` lays it out as a row (phone bottom sheet) or column (tablet rail).
 */
type SlimColoringToolsProps = {
  direction?: "row" | "column";
};

const SlimColoringTools = ({ direction = "row" }: SlimColoringToolsProps) => {
  const t = useT("mobile.coloring");
  const selectedTool = useCanvasStore((s) => s.selectedTool);
  const brushType = useCanvasStore((s) => s.brushType);
  const magicMode = useCanvasStore((s) => s.magicMode);
  const magicReady = useCanvasStore((s) => s.magicReady);
  const selectedColor = useCanvasStore((s) => s.selectedColor);
  const brushSize = useCanvasStore((s) => s.brushSize);
  const paletteVariant = useCanvasStore((s) => s.paletteVariant);
  const setTool = useCanvasStore((s) => s.setTool);
  const setBrushType = useCanvasStore((s) => s.setBrushType);
  const setMagicMode = useCanvasStore((s) => s.setMagicMode);
  const setColor = useCanvasStore((s) => s.setColor);
  const setBrushSize = useCanvasStore((s) => s.setBrushSize);
  // Undo / redo — subscribe to history so canUndo/canRedo re-evaluate on every
  // stroke (the getters read history/historyIndex, which are reactive state).
  const history = useCanvasStore((s) => s.history);
  const historyIndex = useCanvasStore((s) => s.historyIndex);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const canUndo = useCanvasStore((s) => s.canUndo);
  const canRedo = useCanvasStore((s) => s.canRedo);
  // history/historyIndex referenced so the selectors above keep this component
  // subscribed to history changes (the getters don't subscribe on their own).
  void history;
  void historyIndex;
  const undoEnabled = canUndo();
  const redoEnabled = canRedo();

  const handleUndo = () => {
    if (undoEnabled) {
      tapMedium();
      undo();
    } else {
      notifyWarning();
    }
  };
  const handleRedo = () => {
    if (redoEnabled) {
      tapMedium();
      redo();
    } else {
      notifyWarning();
    }
  };

  const isColumn = direction === "column";
  // In the iPad rail (column) tiles are smaller so the rail's content fits its
  // fixed 150pt width — three basic tiles + 2×8 gaps = 142, comfortably inside.
  // The rows also wrap (styles below) as a safety net on a tighter rail.
  const tile = isColumn ? 42 : 56;
  const rowGap = isColumn ? 8 : 10;
  const swatchCols = isColumn ? 3 : 8;
  const swatch = isColumn ? 38 : undefined;

  // Basic tools are active when their tool matches (and, for the brush, the
  // brush type) — mirrors how the live ToolSelector marks selection.
  const brushActive =
    selectedTool === "brush" && brushType === BASIC_BRUSH.brushType;
  const fillActive = selectedTool === "fill";
  const eraserActive = selectedTool === "eraser";

  // Undo/redo tiles match the basic ToolTile footprint so the whole control set
  // reads as one language. Bordered cream card like the live toolbar's history row.
  const historyTile = (
    enabled: boolean,
    onPress: () => void,
    Icon: typeof UndoIcon,
    label: string,
  ) => (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.historyTile,
        { width: tile, height: tile },
        !enabled && styles.historyDisabled,
      ]}
    >
      <Icon
        size={Math.round(tile * 0.5)}
        color={enabled ? COLORS.textPrimary : COLORS.textMuted}
      />
    </Pressable>
  );

  // All tool tiles together — Crayon · Fill · Eraser · Magic Brush · Auto Color.
  // Wraps in the iPad rail (narrow fixed width); single row on the phone sheet.
  const toolTiles = (
    <View style={[styles.toolRow, { gap: rowGap }]}>
      <ToolTile
        icon={BASIC_BRUSH.icon}
        label={BASIC_BRUSH.label}
        selected={brushActive}
        onPress={() => {
          selectionChanged();
          setTool("brush");
          if (BASIC_BRUSH.brushType) setBrushType(BASIC_BRUSH.brushType);
        }}
        size={tile}
      />
      <ToolTile
        icon={BASIC_FILL.icon}
        label={BASIC_FILL.label}
        selected={fillActive}
        onPress={() => {
          selectionChanged();
          setTool("fill");
        }}
        size={tile}
      />
      <ToolTile
        icon={BASIC_ERASER.icon}
        label={BASIC_ERASER.label}
        selected={eraserActive}
        onPress={() => {
          selectionChanged();
          setTool("eraser");
        }}
        size={tile}
      />
      {COLORING_MAGIC_TOOLS.map((config) => {
        const active =
          selectedTool === "magic" && magicMode === config.magicMode;
        return (
          <ToolTile
            key={config.id}
            icon={config.icon}
            label={config.label}
            selected={active}
            isMagic
            loading={!magicReady}
            onPress={() => {
              if (!magicReady) return;
              setTool("magic");
              if (config.magicMode) setMagicMode(config.magicMode);
            }}
            size={tile}
          />
        );
      })}
    </View>
  );

  const brushSizes = (
    <BrushSizeRow
      selectedRadius={brushSize}
      onSelect={setBrushSize}
      color={eraserActive ? "#9E9E9E" : selectedColor}
      tileSize={tile}
    />
  );

  const undoRedo = (
    <View style={[styles.toolRow, { gap: rowGap }]}>
      {historyTile(undoEnabled, handleUndo, UndoIcon, t("undo"))}
      {historyTile(redoEnabled, handleRedo, RedoIcon, t("redo"))}
    </View>
  );

  const swatches = (
    <View style={styles.swatches}>
      <ColorSwatchGrid
        variant={paletteVariant}
        selectedColor={selectedColor}
        onSelect={(hex) => {
          selectionChanged();
          setColor(hex);
        }}
        columns={swatchCols}
        swatchSize={swatch}
      />
    </View>
  );

  // Both tiers STACK sections vertically (like the live ToolbarContent) — the
  // earlier "row" phone layout laid all five sections side-by-side and ran them
  // off-screen. The only per-tier difference is tile/swatch sizing and whether
  // brush-sizes + undo/redo share a line (phone, to stay compact) or stack
  // (iPad rail, where width is the constraint, not height).
  return (
    <View style={styles.container}>
      {toolTiles}
      {isColumn ? (
        <>
          {brushSizes}
          {swatches}
          {undoRedo}
        </>
      ) : (
        <>
          {/* Phone: brush sizes + undo/redo share one line to save sheet height. */}
          <View style={styles.phoneControlsRow}>
            {brushSizes}
            {undoRedo}
          </View>
          {swatches}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Vertical stack of sections (tools → controls → swatches), centered. Both
  // tiers stack; tile/swatch sizes and the controls grouping differ per tier.
  container: {
    alignItems: "center",
    gap: 14,
  },
  // Shared row for the tool / history tiles. Gap is supplied inline (per-tier).
  // Wraps + centers so a full tool row never overflows a narrow iPad rail.
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  // Phone: brush sizes (left) + undo/redo (right) on one line to keep the sheet
  // short. They're separate control groups so space them apart.
  phoneControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    flexWrap: "wrap",
  },
  swatches: {
    alignItems: "center",
  },
  // Bordered cream history tile — same look as the live toolbar's undo/redo.
  historyTile: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    backgroundColor: COLORS.white,
  },
  historyDisabled: {
    opacity: 0.5,
  },
});

export default SlimColoringTools;
