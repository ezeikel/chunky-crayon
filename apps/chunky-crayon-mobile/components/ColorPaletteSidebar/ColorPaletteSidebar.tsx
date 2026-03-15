import { View, ScrollView, Pressable, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faPalette } from "@fortawesome/pro-solid-svg-icons";
import { useCanvasStore } from "@/stores/canvasStore";
import { ALL_COLORING_COLORS } from "@/constants/Colors";
import { selectionChanged } from "@/utils/haptics";

type ColorPaletteSidebarProps = {
  /** Width of the sidebar */
  width: number;
};

/**
 * Left sidebar color palette for landscape layouts.
 * Matches web's DesktopColorPalette component with 4-column grid.
 */
const ColorPaletteSidebar = ({ width }: ColorPaletteSidebarProps) => {
  const insets = useSafeAreaInsets();
  const { selectedColor, setColor, selectedTool, magicMode } = useCanvasStore();

  // Disable palette when magic tools are active
  const isMagicToolActive =
    selectedTool === "magic" &&
    (magicMode === "suggest" || magicMode === "auto");

  const handleColorSelect = (color: string) => {
    if (isMagicToolActive) return;
    selectionChanged();
    setColor(color);
  };

  // Calculate swatch size based on available width
  // 4 columns with gaps: width = 4*swatch + 3*gap + padding*2
  const paddingHorizontal = 12;
  const gap = 6;
  const availableWidth = width - paddingHorizontal * 2 - insets.left;
  const swatchSize = Math.floor((availableWidth - gap * 3) / 4);
  const clampedSwatchSize = Math.max(28, Math.min(swatchSize, 44));

  return (
    <View
      style={[
        styles.container,
        {
          width,
          paddingLeft: insets.left + paddingHorizontal,
          paddingRight: paddingHorizontal,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 12,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <FontAwesomeIcon icon={faPalette} size={18} color="#E46444" />
        <Text style={styles.headerText}>Colors</Text>
      </View>

      {/* Color Grid - 4 columns */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.gridContainer,
          { gap, opacity: isMagicToolActive ? 0.4 : 1 },
        ]}
      >
        <View style={[styles.grid, { gap }]}>
          {ALL_COLORING_COLORS.map((color) => {
            const isSelected = selectedColor === color.hex;
            const isWhite = color.hex === "#FFFFFF";

            return (
              <Pressable
                key={color.hex}
                onPress={() => handleColorSelect(color.hex)}
                disabled={isMagicToolActive}
                style={({ pressed }) => [
                  styles.colorSwatch,
                  {
                    width: clampedSwatchSize,
                    height: clampedSwatchSize,
                    backgroundColor: color.hex,
                    borderRadius: clampedSwatchSize / 2,
                  },
                  isWhite && styles.colorSwatchWhite,
                  isSelected && !isMagicToolActive && styles.colorSwatchActive,
                  pressed && styles.colorSwatchPressed,
                ]}
                accessibilityLabel={`Select ${color.name} color`}
                accessibilityHint={
                  isMagicToolActive
                    ? "Colors are chosen automatically with Magic tools"
                    : undefined
                }
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  headerText: {
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "TondoTrial-Bold",
    color: "#374151",
  },
  gridContainer: {
    flexGrow: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  colorSwatch: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  colorSwatchWhite: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: "#374151",
    transform: [{ scale: 1.1 }],
  },
  colorSwatchPressed: {
    transform: [{ scale: 0.95 }],
  },
});

export default ColorPaletteSidebar;
