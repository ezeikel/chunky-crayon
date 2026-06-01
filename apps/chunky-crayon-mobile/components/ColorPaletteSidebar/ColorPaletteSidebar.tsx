import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCanvasStore } from "@/stores/canvasStore";
import { COLORS } from "@/lib/design";
import PaletteVariantPills from "@/components/coloring/PaletteVariantPills";
import ColorSwatchGrid from "@/components/coloring/ColorSwatchGrid";
import { RAIL_TOP_OFFSET } from "@/constants/Sizes";
import { selectionChanged } from "@/utils/haptics";

type ColorPaletteSidebarProps = {
  /** Full width of the left column (rail + canvas gap), from the layout. */
  width: number;
};

/**
 * Left palette rail for the three-column coloring layout — a rounded
 * floating card (web's DesktopColorPalette) TOP-aligned beside the canvas:
 * mood-variant pills (2-up) on top, then a 3-column grid of round swatches
 * for the active variant. The card grows to fit all 18 swatches (no scroll,
 * no clipping). Dims when a magic tool is active (web's opacity +
 * pointer-events-none).
 *
 * The column `width` from the layout already includes the canvas gap; the
 * rail sits flush-left and the gap falls on its right via the outer padding.
 * RAIL_TOP_OFFSET pushes the card down so its top lines up with the canvas
 * card (which sits below the progress-bar row).
 */
const ColorPaletteSidebar = ({ width }: ColorPaletteSidebarProps) => {
  const insets = useSafeAreaInsets();
  const {
    selectedColor,
    setColor,
    selectedTool,
    magicMode,
    paletteVariant,
    setPaletteVariant,
  } = useCanvasStore();

  const isMagicToolActive =
    selectedTool === "magic" &&
    (magicMode === "suggest" || magicMode === "auto");

  const handleColorSelect = (color: string) => {
    if (isMagicToolActive) return;
    selectionChanged();
    setColor(color);
  };

  return (
    <View style={[styles.outer, { width, paddingLeft: insets.left + 8 }]}>
      <View style={styles.rail}>
        {/* Mood-variant pills (2-up) — fixed at the top of the card. */}
        <PaletteVariantPills
          selected={paletteVariant}
          onSelect={setPaletteVariant}
          columns={2}
        />

        {/* Swatch grid for the active variant — a plain block (no scroll) so
            the card grows to fit all 18 swatches; dims for magic tools. */}
        <View
          style={[styles.gridScroll, { opacity: isMagicToolActive ? 0.4 : 1 }]}
          pointerEvents={isMagicToolActive ? "none" : "auto"}
        >
          <ColorSwatchGrid
            variant={paletteVariant}
            selectedColor={isMagicToolActive ? "" : selectedColor}
            onSelect={handleColorSelect}
            columns={3}
            swatchSize={51}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Outer column: fixed width (from prop), never squeezed by the flex row.
  // The row top-aligns all columns; this rail's top is pushed down by
  // RAIL_TOP_OFFSET so its top edge lines up with the CANVAS card (which
  // sits below the progress-bar row), matching web. Right padding = gap.
  outer: {
    flexShrink: 0,
    paddingTop: RAIL_TOP_OFFSET,
    paddingBottom: 12,
    paddingRight: 16,
  },
  // The floating rail card — pure content height (no maxHeight cap, no
  // scroll): it grows to fit the pills + all 18 swatches so the bottom row
  // is never clipped. Web radius 32 + uniform 16 padding + 2px cream border.
  rail: {
    backgroundColor: COLORS.white,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  gridScroll: {
    paddingTop: 2,
    alignItems: "center",
  },
});

export default ColorPaletteSidebar;
