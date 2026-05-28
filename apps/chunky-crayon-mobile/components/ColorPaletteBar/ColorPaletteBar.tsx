import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCanvasStore } from "@/stores/canvasStore";
import { PALETTE_COLORS } from "@/constants/Colors";
import { TOOLBAR } from "@/constants/Sizes";
import { COLORS } from "@/lib/design";
import { selectionChanged } from "@/utils/haptics";

/**
 * Horizontal color palette bar for landscape layouts. Sits at the
 * bottom of the canvas area for quick color access.
 *
 * Swatch styling matches ColorPalette + web: round swatches with a
 * cream-dark border; the selected swatch gets the crayon-orange halo
 * (orange ring + offset + white inner border), not a flat grey border.
 */
const ColorPaletteBar = () => {
  const insets = useSafeAreaInsets();
  const selectedColor = useCanvasStore((s) => s.selectedColor);
  const setColor = useCanvasStore((s) => s.setColor);

  const handleColorSelect = (color: string) => {
    selectionChanged();
    setColor(color);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {PALETTE_COLORS.map((color) => {
          const isSelected = selectedColor === color;
          return (
            <Pressable
              key={color}
              onPress={() => handleColorSelect(color)}
              style={[
                styles.swatchWrap,
                isSelected && styles.swatchWrapSelected,
              ]}
            >
              <View
                style={[
                  { backgroundColor: color },
                  isSelected ? styles.swatchSelected : styles.swatch,
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const SWATCH = 44;

const styles = StyleSheet.create({
  container: {
    height: TOOLBAR.paletteHeight,
    backgroundColor: COLORS.white,
    borderTopWidth: 2,
    borderTopColor: COLORS.bgCreamDark,
    justifyContent: "center",
    paddingTop: 8,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  swatchWrap: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchWrapSelected: {
    borderWidth: 2,
    borderColor: COLORS.crayonOrange,
    padding: 2,
  },
  swatch: {
    width: SWATCH - 2,
    height: SWATCH - 2,
    borderRadius: (SWATCH - 2) / 2,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
  },
  swatchSelected: {
    width: SWATCH - 10,
    height: SWATCH - 10,
    borderRadius: (SWATCH - 10) / 2,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
});

export default ColorPaletteBar;
