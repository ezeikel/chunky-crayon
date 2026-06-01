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
            swatchSize={51}
          />
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Outer column: fixed width (from prop), never squeezed by the flex row,
  // vertically centers the rail. The card HUGS its content (web's card is
  // content-height, floating beside the canvas — NOT full column height),
  // capped to the column height so an unusually tall variant still scrolls
  // inside the card rather than overflowing. Right padding = canvas gap.
  outer: {
    flexShrink: 0,
    justifyContent: "center",
    paddingVertical: 12,
    paddingRight: 16,
  },
  // The floating rail card — content-height (no flex:1), web radius 32 +
  // uniform 16 padding + 2px cream border. maxHeight caps it so a tall
  // variant scrolls within instead of overflowing the column.
  rail: {
    maxHeight: "100%",
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
  // ScrollView only shrinks/scrolls if the grid would overflow the capped
  // card; otherwise the card hugs the grid's natural height.
  gridScrollView: {
    flexShrink: 1,
  },
  gridScroll: {
    paddingTop: 2,
    alignItems: "center",
  },
});

export default ColorPaletteSidebar;
