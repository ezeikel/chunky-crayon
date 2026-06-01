import { View, StyleSheet } from "react-native";
import SquishyPressable from "@/components/SquishyPressable";
import { COLORING_BRUSH_SIZES } from "@/lib/coloring/palette";

/**
 * A row of 3 brush-size tiles, matching CC web's DesktopToolsSidebar
 * brush-size picker exactly (the desktop rail treatment — distinct from the
 * old chunky orange tiles):
 *  - each tile is a rounded-24 square with NO border. The web tile is a
 *    plain hover target; SELECTED = light-gray fill (#E5E7EB / gray-200) +
 *    a gray ring (gray-400). Unselected = transparent.
 *  - the centered dot is the current paint `color` (web: width/height =
 *    min(radius * 2, 32)), and stays the paint colour even when selected
 *    (web does not whiten it in the desktop sidebar).
 *
 * Springy press (SquishyPressable, scaleTo 0.95). The size name
 * ("Fine"/"Regular"/"Chunky") is the accessibility label.
 */

// Web tokens.
const SELECTED_BG = "#E5E7EB"; // gray-200
const SELECTED_RING = "#9CA3AF"; // gray-400
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
          <View style={[styles.tileBase, selected && styles.selected]}>
            <View
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: color,
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
  // to a sliver inside the Animated.View pressable). No border (web's
  // desktop brush tile is borderless).
  tileBase: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  // Selected = light-gray fill + gray ring (web's bg-gray-200 ring-2
  // ring-gray-400).
  selected: {
    backgroundColor: SELECTED_BG,
    borderWidth: 2,
    borderColor: SELECTED_RING,
  },
});

export default BrushSizeRow;
