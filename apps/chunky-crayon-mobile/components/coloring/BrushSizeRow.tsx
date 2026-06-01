import { View, StyleSheet } from "react-native";
import SquishyPressable from "@/components/SquishyPressable";
import { COLORING_BRUSH_SIZES } from "@/lib/coloring/palette";

/**
 * A row of 3 brush-size tiles, matching CC web's brush-size picker
 * (tablet/mobile treatment) exactly:
 *  - each tile is a rounded-24 square holding a centered filled CIRCLE
 *    dot whose diameter scales with the brush radius
 *    (web: dotSize = max(8, min(24, radius * 1.5)) → 8 / 18 / 24).
 *  - selected = solid orange (#E46444) + transparent border + soft
 *    orange glow, and the dot is WHITE.
 *  - unselected = white + #F0E9DC 2px border, and the dot is the current
 *    paint `color`.
 *
 * Radius 24, springy press (via SquishyPressable, scaleTo 0.95). The size
 * name ("Fine"/"Regular"/"Chunky") is the accessibility label; selection
 * is reported via accessibilityState.
 */

// Web coloring tokens (resolved CC values), matching ToolTile.tsx.
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

// Web: dotSize = max(8, min(24, radius * 1.5)) → 8 / 18 / 24 for 4 / 12 / 24.
const dotSizeForRadius = (radius: number) =>
  Math.max(8, Math.min(24, radius * 1.5));

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
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  selected: {
    backgroundColor: ACCENT,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  unselected: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: SURFACE_DARK,
  },
});

export default BrushSizeRow;
