import { View, Pressable, StyleSheet } from "react-native";
import { COLORS_PALETTE } from "@/constants/colors";
import { COLORS } from "@/lib/design";

type ColorSwatchGridProps = {
  selectedColor: string;
  onSelect: (color: string) => void;
  /** Number of columns (web's slim rail uses 3). */
  columns?: number;
  /** Diameter of each swatch chip. Web uses size-10 = 40px. */
  swatchSize?: number;
};

/**
 * Grid of selectable color swatches — shared by the phone toolbar and the
 * tablet palette rail. Mirrors CC web's ColorPalette: a fixed-column grid of
 * round, fixed-size chips (size-10 = 40px, border-2, rounded-full). The
 * selected chip gets a dark ring. Fixed-size (not %-width) so the chips never
 * collapse to dots in a narrow rail — the rail is sized to fit the grid.
 */
const ColorSwatchGrid = ({
  selectedColor,
  onSelect,
  columns = 3,
  swatchSize = 40,
}: ColorSwatchGridProps) => {
  const gap = 8;
  // The grid is exactly wide enough for `columns` chips + the gaps between
  // them, so flexWrap breaks cleanly into rows of `columns`.
  const gridWidth = columns * swatchSize + (columns - 1) * gap;

  return (
    <View style={[styles.grid, { width: gridWidth, gap }]}>
      {COLORS_PALETTE.map((color) => {
        const isSelected = selectedColor === color;
        return (
          <Pressable
            key={color}
            onPress={() => onSelect(color)}
            style={[
              styles.swatch,
              {
                width: swatchSize,
                height: swatchSize,
                backgroundColor: color,
                borderColor: isSelected ? COLORS.textPrimary : "#E5E0D5",
                transform: isSelected ? [{ scale: 1.08 }] : undefined,
              },
            ]}
            accessibilityLabel={`Color ${color}`}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  swatch: {
    borderRadius: 999,
    borderWidth: 2,
  },
});

export default ColorSwatchGrid;
