import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCanvasStore } from "@/stores/canvasStore";
import { PALETTE_COLORS } from "@/constants/Colors";
import { TOOLBAR } from "@/constants/Sizes";
import { selectionChanged } from "@/utils/haptics";

/**
 * Horizontal color palette bar for landscape layouts.
 * Sits at the bottom of the canvas area, providing quick color access.
 */
const ColorPaletteBar = () => {
  const insets = useSafeAreaInsets();
  const { selectedColor, setColor } = useCanvasStore();

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
        {PALETTE_COLORS.map((color) => (
          <Pressable key={color} onPress={() => handleColorSelect(color)}>
            <View
              style={[
                styles.colorSwatch,
                { backgroundColor: color },
                selectedColor === color && styles.colorSwatchActive,
                color === "#FFFFFF" && styles.colorSwatchWhite,
              ]}
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: TOOLBAR.paletteHeight,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    justifyContent: "center",
    paddingTop: 8,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: "#374151",
    transform: [{ scale: 1.1 }],
  },
  colorSwatchWhite: {
    borderColor: "#D1D5DB",
  },
});

export default ColorPaletteBar;
