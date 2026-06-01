import { View, StyleSheet } from "react-native";
import SquishyPressable from "@/components/SquishyPressable";
import { COLORING_BRUSH_SIZES } from "@/lib/coloring/palette";

/**
 * A row of 3 brush-size tiles, matching CC web's MobileColoringDrawer +
 * tablet ColoringToolbar brush picker exactly (both web surfaces use the
 * SAME treatment — `size-14 rounded-coloring-card border-2`):
 *  - each tile is a rounded-24 square with a 2px border. Unselected = white
 *    + #F0E9DC border; SELECTED = solid orange (#E46444) fill + transparent
 *    border + soft orange glow (web's bg-coloring-accent shadow-btn-primary).
 *  - the centered dot is the current paint `color` (web: width/height =
 *    min(radius * 2, 32)); WHITE when the tile is selected so it reads on the
 *    orange fill (web whitens it on the accent background).
 *
 * Springy press (SquishyPressable, scaleTo 0.95). The size name
 * ("Fine"/"Regular"/"Chunky") is the accessibility label.
 */

// Web tokens (match ToolTile.tsx).
const ACCENT = "#E46444";
const SURFACE_DARK = "#F0E9DC";
const TEXT_PRIMARY = "#433A33";

type BrushSizeRowProps = {
  selectedRadius: number;
  onSelect: (radius: number) => void;
  /** The current paint color — drives the unselected dot. Default #433A33. */
  color?: string;
  /** Square side of each tile. Default 56. */
  tileSize?: number;
};

// Web: dotSize = min(radius * 2, 32) → 8 / 24 / 32 for radii 4 / 12 / 24.
const dotSizeForRadius = (radius: number) => Math.min(radius * 2, 32);

const BrushSizeRow = ({
  selectedRadius,
  onSelect,
  color = TEXT_PRIMARY,
  tileSize = 56,
}: BrushSizeRowProps) => (
  <View style={styles.row}>
    {COLORING_BRUSH_SIZES.map((brush) => {
      const selected = brush.radius === selectedRadius;
      const dotSize = dotSizeForRadius(brush.radius);
      return (
        <SquishyPressable
          key={brush.key}
          onPress={() => onSelect(brush.radius)}
          scaleTo={0.95}
          accessibilityRole="button"
          accessibilityLabel={brush.name}
          accessibilityState={{ selected }}
          style={{ width: tileSize, height: tileSize }}
        >
          <View
            style={[
              styles.tileBase,
              selected ? styles.selected : styles.unselected,
            ]}
          >
            <View
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: selected ? "#FFFFFF" : color,
              }}
            />
          </View>
        </SquishyPressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  // Fill the fixed-size pressable parent (see ToolTile — flex:1 collapses
  // to a sliver inside the Animated.View pressable).
  tileBase: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  unselected: {
    backgroundColor: "#FFFFFF",
    borderColor: SURFACE_DARK,
  },
  // Selected = solid orange fill + soft glow (web's bg-coloring-accent
  // border-transparent shadow-btn-primary), matching the tool tiles.
  selected: {
    backgroundColor: ACCENT,
    borderColor: "transparent",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
});

export default BrushSizeRow;
