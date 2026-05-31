import { View, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCanvasStore } from "@/stores/canvasStore";
import { COLORS } from "@/lib/design";
import PaletteVariantPills from "@/components/coloring/PaletteVariantPills";
import ColorSwatchGrid from "@/components/coloring/ColorSwatchGrid";
import { selectionChanged } from "@/utils/haptics";

type ColorPaletteSidebarProps = {
  /** Full width of the left column (rail + canvas gap), from the layout. */
  width: number;
};

/**
 * Left palette rail for the three-column coloring layout — a rounded
 * floating card (web's DesktopColorPalette) vertically centered next to the
 * canvas: mood-variant pills (2-up) on top, then a 2-column grid of round
 * swatches for the active variant. Dims when a magic tool is active (web's
 * opacity + pointer-events-none).
 *
 * The column `width` from the layout already includes the canvas gap; the
 * rail itself sits flush-left and the gap falls on its right via the outer
 * padding, so the rail never butts against the canvas.
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
        {/* Mood-variant pills (2-up). */}
        <PaletteVariantPills
          selected={paletteVariant}
          onSelect={setPaletteVariant}
          columns={2}
        />

        {/* Swatch grid for the active variant — dims for magic tools. */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.gridScroll,
            { opacity: isMagicToolActive ? 0.4 : 1 },
          ]}
          pointerEvents={isMagicToolActive ? "none" : "auto"}
        >
          <ColorSwatchGrid
            variant={paletteVariant}
            selectedColor={isMagicToolActive ? "" : selectedColor}
            onSelect={handleColorSelect}
            columns={2}
          />
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Outer column: fixed width (from prop), never squeezed by the flex row,
  // vertically centers the rail next to the canvas. The right padding is
  // the canvas gap so the rail floats clear of the canvas card.
  outer: {
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "stretch",
    paddingVertical: 12,
    paddingRight: 16,
  },
  // The floating rail card.
  rail: {
    flexShrink: 1,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  gridScroll: {
    flexGrow: 1,
    paddingTop: 2,
  },
});

export default ColorPaletteSidebar;
