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
        {/* Mood-variant pills (2-up) — fixed at the top of the card. */}
        <PaletteVariantPills
          selected={paletteVariant}
          onSelect={setPaletteVariant}
          columns={2}
        />

        {/* Swatch grid for the active variant — scrolls WITHIN the card
            (flexShrink:1 so the ScrollView is bounded by the card height
            instead of the card growing past the screen). Dims for magic
            tools. */}
        <ScrollView
          style={styles.gridScrollView}
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
            columns={3}
            swatchSize={40}
          />
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Outer column: fixed width (from prop), never squeezed by the flex row.
  // The card FILLS the column height (paddingVertical = top/bottom breathing
  // room) so the inner swatch ScrollView is height-bounded and scrolls
  // INSIDE the card — the card never grows past the screen, and short
  // content just leaves the card shorter (alignSelf:center keeps it tidy).
  // The right padding is the canvas gap so the rail floats clear of the
  // canvas card.
  outer: {
    flexShrink: 0,
    justifyContent: "center",
    paddingVertical: 12,
    paddingRight: 16,
  },
  // The floating rail card — fills the column height; its swatch grid
  // scrolls within it. flexShrink lets it shrink when content is short.
  rail: {
    flex: 1,
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
  // ScrollView fills the remaining card height below the pills and scrolls.
  gridScrollView: {
    flex: 1,
  },
  gridScroll: {
    paddingTop: 2,
    alignItems: "center",
  },
});

export default ColorPaletteSidebar;
