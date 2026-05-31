import { View, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCanvasStore } from "@/stores/canvasStore";
import { COLORS } from "@/lib/design";
import PaletteVariantPills from "@/components/coloring/PaletteVariantPills";
import ColorSwatchGrid from "@/components/coloring/ColorSwatchGrid";
import { selectionChanged } from "@/utils/haptics";

type ColorPaletteSidebarProps = {
  /** Width of the sidebar */
  width: number;
};

/**
 * Left palette sidebar for the three-column coloring layout — mirrors CC
 * web's DesktopColorPalette: a 2×2 grid of mood-variant pills on top,
 * then a 3-column grid of round swatches for the active variant. Dims
 * when a magic tool is active (web's opacity + pointer-events-none).
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

  const paddingHorizontal = 12;

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
      {/* Mood-variant pills (2×2, web's DesktopColorPalette top). */}
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
          columns={3}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRightWidth: 2,
    borderRightColor: COLORS.bgCreamDark,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  gridScroll: {
    flexGrow: 1,
    paddingTop: 4,
  },
});

export default ColorPaletteSidebar;
