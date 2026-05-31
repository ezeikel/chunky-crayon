import { useCallback } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCanvasStore } from "@/stores/canvasStore";
import { tapLight } from "@/utils/haptics";
import { COLORS } from "@/lib/design";
import ColorSwatchGrid from "@/components/coloring/ColorSwatchGrid";
import PaletteVariantPills from "@/components/coloring/PaletteVariantPills";

type ColorPaletteSidebarProps = {
  /** Width of the sidebar column (computed by the layout). */
  width: number;
};

/**
 * Left palette rail for the three-column coloring layout — mirrors CC web's
 * palette card: a slim floating rounded card holding the palette-variant
 * pills on top, a divider, then a scrollable 3-column swatch grid beneath.
 * The rail is sized by the layout to fit a 3-column grid of 40px chips.
 */
const ColorPaletteSidebar = ({ width }: ColorPaletteSidebarProps) => {
  const insets = useSafeAreaInsets();

  const { selectedColor, setColor, paletteVariant, setPaletteVariant } =
    useCanvasStore();

  const handleColorSelect = useCallback(
    (color: string) => {
      tapLight();
      setColor(color);
    },
    [setColor],
  );

  return (
    <View style={[styles.outer, { width, paddingLeft: insets.left + 8 }]}>
      {/* Slim floating rail card. */}
      <View style={styles.rail}>
        <PaletteVariantPills
          selected={paletteVariant}
          onSelect={(variant) => {
            tapLight();
            setPaletteVariant(variant);
          }}
          columns={2}
        />
        <View style={styles.divider} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.swatchScroll}
        >
          <ColorSwatchGrid
            selectedColor={selectedColor}
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
  // Outer column: fixed width (from prop), never squeezed by the flex row,
  // vertically centers the rail. Right padding is the canvas gap.
  outer: {
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    paddingRight: 16,
  },
  // Slim floating rail card. Width hugs its content (the 3-col swatch grid).
  rail: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 12,
    // Cap the rail's own height so the swatch ScrollView can scroll within it
    // rather than the whole rail stretching to the column height.
    maxHeight: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  swatchScroll: {
    paddingTop: 4,
    alignItems: "center",
  },
  divider: {
    height: 1,
    alignSelf: "stretch",
    backgroundColor: COLORS.bgCreamDark,
  },
});

export default ColorPaletteSidebar;
