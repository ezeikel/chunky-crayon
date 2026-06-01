import { View, StyleSheet } from "react-native";
import SquishyPressable from "@/components/SquishyPressable";
import {
  COLORING_PALETTE_VARIANTS,
  type PaletteVariant,
} from "@/lib/coloring/palette";

/**
 * The color picker grid for the coloring experience, matching CC web's
 * swatch grid exactly. Renders the 18 swatches of the currently selected
 * palette variant as round, tappable circles.
 *
 * Selected state (web tablet/mobile): a 2px orange (#E46444) ring sitting
 * 1px off the swatch, plus a white inner border on the swatch itself — so
 * the chosen colour reads as a haloed dot. Unselected: a 2px #F0E9DC
 * border. The near-white swatches additionally carry a light-gray border
 * so they stay visible on the cream surface.
 *
 * `columns` controls density to match web's responsive grid — phone 8,
 * tablet 10/12, sidebar 3 — sizing each swatch from the available width
 * via a flexBasis percentage so any column count lays out evenly with
 * uniform gaps. Each swatch is a SquishyPressable (scaleTo 0.9) with the
 * swatch name as its accessibility label.
 */

// Web coloring tokens (resolved CC values).
const ACCENT = "#E46444";
const SURFACE_DARK = "#F0E9DC";
// Near-white swatches need a visible edge on cream.
const LIGHT_SWATCH_BORDER = "#E0DACC";

const GAP = 6;
// Offset between the swatch and its orange ring when selected (web's 1px).
const RING_OFFSET = 1;

const isNearWhite = (hex: string) => {
  const normalized = hex.trim().toUpperCase();
  return (
    normalized === "#FFFFFF" ||
    normalized === "#FFFFF0" || // Ivory
    normalized === "#FFE8C7" // Cream
  );
};

type ColorSwatchGridProps = {
  variant: PaletteVariant;
  selectedColor: string;
  onSelect: (hex: string) => void;
  /** Swatches per row. Web: phone 8, tablet 10/12, sidebar 3. */
  columns?: number;
  /**
   * Fixed swatch diameter in px. When set, each cell is exactly this wide
   * (web's `size-10` = 40 in the sidebar) and the grid wraps to `columns`
   * fixed cells — so the swatches never shrink to dots in a narrow rail.
   * When omitted, cells flex to share the available width (used by the
   * wide horizontal toolbar where the row should fill the card).
   */
  swatchSize?: number;
};

const ColorSwatchGrid = ({
  variant,
  selectedColor,
  onSelect,
  columns = 8,
  swatchSize,
}: ColorSwatchGridProps) => {
  const swatches = COLORING_PALETTE_VARIANTS[variant];
  const selectedHex = selectedColor.trim().toUpperCase();
  const fixed = swatchSize != null;
  // Fixed mode: each cell is swatchSize + the GAP padding around it, and the
  // whole grid is exactly `columns` cells wide so it wraps cleanly. Flex
  // mode: cells share the row via a percentage basis.
  const flexBasis = `${100 / columns}%` as const;
  const cellSide = fixed ? swatchSize + GAP : undefined;
  const gridWidth = fixed ? columns * (swatchSize + GAP) : undefined;

  return (
    <View style={[styles.grid, fixed && { width: gridWidth }]}>
      {swatches.map((swatch) => {
        const selected = swatch.hex.trim().toUpperCase() === selectedHex;
        return (
          <View
            key={swatch.hex}
            style={[
              styles.cell,
              fixed ? { width: cellSide, height: cellSide } : { flexBasis },
            ]}
          >
            <SquishyPressable
              onPress={() => onSelect(swatch.hex)}
              scaleTo={0.9}
              accessibilityRole="button"
              accessibilityLabel={swatch.name}
              accessibilityState={{ selected }}
              style={fixed ? styles.pressableFixed : styles.pressable}
            >
              {/* Outer orange ring (only painted when selected) sits 1px
                  off the swatch via padding. */}
              <View style={[styles.ring, selected && styles.ringSelected]}>
                <View
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: swatch.hex,
                      borderColor: selected
                        ? "#FFFFFF"
                        : isNearWhite(swatch.hex)
                          ? LIGHT_SWATCH_BORDER
                          : SURFACE_DARK,
                    },
                  ]}
                />
              </View>
            </SquishyPressable>
          </View>
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
  cell: {
    padding: GAP / 2,
  },
  // Flex mode: width fills the %-basis cell, aspectRatio keeps it square.
  pressable: {
    width: "100%",
    aspectRatio: 1,
  },
  // Fixed mode: the cell is already a fixed square, so fill it directly.
  // (aspectRatio + width:100% inside a fixed-height parent collapses the
  // inner content to a sliver — fill both dimensions instead.)
  pressableFixed: {
    width: "100%",
    height: "100%",
  },
  // Fill the pressable parent. `flex: 1` collapsed the ring to a ~6px
  // sliver inside the Animated.View pressable (which isn't a definite-height
  // flex container) — fill both axes explicitly so the swatch is a full
  // round chip.
  ring: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "transparent",
    padding: RING_OFFSET,
  },
  ringSelected: {
    borderColor: ACCENT,
  },
  swatch: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    borderWidth: 2,
  },
});

export default ColorSwatchGrid;
