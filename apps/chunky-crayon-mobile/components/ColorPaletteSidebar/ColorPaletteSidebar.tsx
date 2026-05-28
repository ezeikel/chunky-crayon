import { View, ScrollView, Pressable, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faPalette } from "@fortawesome/pro-duotone-svg-icons";
import { useCanvasStore } from "@/stores/canvasStore";
import { ALL_COLORING_COLORS } from "@/constants/Colors";
import { COLORS } from "@/lib/design";
import { selectionChanged } from "@/utils/haptics";

type ColorPaletteSidebarProps = {
  /** Width of the sidebar */
  width: number;
};

/**
 * Left sidebar color palette for landscape layouts. Mirrors web's
 * DesktopColorPalette 4-column grid. Swatches match ColorPalette + web:
 * cream-dark border, crayon-orange halo on the selected swatch (ring +
 * offset + white inner border). Dims when magic tools are active
 * (web's opacity-40 + pointer-events-none).
 */
const ColorPaletteSidebar = ({ width }: ColorPaletteSidebarProps) => {
  const insets = useSafeAreaInsets();
  const { selectedColor, setColor, selectedTool, magicMode } = useCanvasStore();

  const isMagicToolActive =
    selectedTool === "magic" &&
    (magicMode === "suggest" || magicMode === "auto");

  const handleColorSelect = (color: string) => {
    if (isMagicToolActive) return;
    selectionChanged();
    setColor(color);
  };

  // 4 columns with gaps: width = 4*swatch + 3*gap + padding*2
  const paddingHorizontal = 12;
  const gap = 6;
  const availableWidth = width - paddingHorizontal * 2 - insets.left;
  const swatchSize = Math.floor((availableWidth - gap * 3) / 4);
  const clampedSwatchSize = Math.max(28, Math.min(swatchSize, 44));
  const innerSize = clampedSwatchSize - 2;
  const selectedInner = clampedSwatchSize - 10;

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
        <FontAwesomeIcon
          icon={faPalette}
          size={18}
          color={COLORS.crayonOrange}
          secondaryColor={COLORS.crayonPeach}
          secondaryOpacity={1}
        />
        <Text style={styles.headerText}>Colors</Text>
      </View>

      {/* Color Grid - 4 columns */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.gridContainer,
          { opacity: isMagicToolActive ? 0.4 : 1 },
        ]}
        pointerEvents={isMagicToolActive ? "none" : "auto"}
      >
        <View style={[styles.grid, { gap }]}>
          {ALL_COLORING_COLORS.map((color) => {
            const isSelected =
              selectedColor === color.hex && !isMagicToolActive;

            return (
              <Pressable
                key={color.hex}
                onPress={() => handleColorSelect(color.hex)}
                disabled={isMagicToolActive}
                style={[
                  styles.swatchWrap,
                  {
                    width: clampedSwatchSize,
                    height: clampedSwatchSize,
                    borderRadius: clampedSwatchSize / 2,
                  },
                  isSelected && styles.swatchWrapSelected,
                ]}
                accessibilityLabel={`Select ${color.name} color`}
              >
                <View
                  style={[
                    { backgroundColor: color.hex },
                    isSelected
                      ? {
                          width: selectedInner,
                          height: selectedInner,
                          borderRadius: selectedInner / 2,
                          borderWidth: 2,
                          borderColor: COLORS.white,
                        }
                      : {
                          width: innerSize,
                          height: innerSize,
                          borderRadius: innerSize / 2,
                          borderWidth: 2,
                          borderColor: COLORS.bgCreamDark,
                        },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRightWidth: 2,
    borderRightColor: COLORS.bgCreamDark,
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
    fontFamily: "TondoTrial-Bold",
    color: COLORS.textPrimary,
  },
  gridContainer: {
    flexGrow: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  swatchWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  swatchWrapSelected: {
    borderWidth: 2,
    borderColor: COLORS.crayonOrange,
    padding: 2,
  },
});

export default ColorPaletteSidebar;
