import { Pressable, View, ScrollView, StyleSheet } from "react-native";
import { PALETTE_COLORS } from "@/constants/Colors";
import { useCanvasStore } from "@/stores/canvasStore";
import { COLORS } from "@/lib/design";
import { perfect } from "@/styles";
import { selectionChanged } from "@/utils/haptics";

type ColorPaletteProps = {
  style?: Record<string, unknown>;
};

/**
 * Mobile color palette — matched to web's coloring-ui ColorPalette
 * (kids variant). White card with a chunky cream-dark border + rounded-
 * coloring-card corners. Swatches are round; the SELECTED swatch gets
 * web's orange halo treatment: a white inner border with an offset
 * crayon-orange ring around it (web's `ring-2 ring-offset-1
 * ring-coloring-accent border-white`), NOT a flat grey border.
 *
 * Horizontal scroll is the native form factor on phone (web kids uses a
 * grid); the swatch styling matches web exactly so it reads as the same
 * palette.
 */

const SWATCH = 40;

const ColorPalette = ({ style }: ColorPaletteProps) => {
  const selectedColor = useCanvasStore((s) => s.selectedColor);
  const setColor = useCanvasStore((s) => s.setColor);

  return (
    <View style={[styles.card, style, perfect.boxShadow]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {PALETTE_COLORS.map((color) => {
          const isSelected = selectedColor === color;
          return (
            <Pressable
              key={color}
              onPress={() => {
                selectionChanged();
                setColor(color);
              }}
              // The orange ring + offset live on the wrapper so the swatch
              // itself keeps its clean white inner border.
              style={[
                styles.swatchWrap,
                isSelected && styles.swatchWrapSelected,
              ]}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: color },
                  isSelected ? styles.swatchSelected : styles.swatchDefault,
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24, // web --radius-coloring-card
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark, // web --coloring-surface-dark
  },
  row: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    alignItems: "center",
  },
  swatchWrap: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  // Selected: crayon-orange ring with a 1px offset gap (the padding).
  swatchWrapSelected: {
    borderWidth: 2,
    borderColor: COLORS.crayonOrange,
    padding: 2,
  },
  swatch: {
    width: SWATCH - 2,
    height: SWATCH - 2,
    borderRadius: (SWATCH - 2) / 2,
  },
  swatchDefault: {
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
  },
  // White inner border so the colour reads as "lifted" inside the ring.
  swatchSelected: {
    width: SWATCH - 8,
    height: SWATCH - 8,
    borderRadius: (SWATCH - 8) / 2,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
});

export default ColorPalette;
