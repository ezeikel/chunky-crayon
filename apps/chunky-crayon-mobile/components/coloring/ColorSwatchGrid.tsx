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
};

const ColorSwatchGrid = ({
  variant,
  selectedColor,
  onSelect,
  columns = 8,
}: ColorSwatchGridProps) => {
  const swatches = COLORING_PALETTE_VARIANTS[variant];
  // Reserve the gaps between columns, then split the rest evenly.
  const flexBasis = `${100 / columns}%` as const;
  const selectedHex = selectedColor.trim().toUpperCase();

  return (
    <View style={styles.grid}>
      {swatches.map((swatch) => {
        const selected = swatch.hex.trim().toUpperCase() === selectedHex;
        return (
          <View key={swatch.hex} style={[styles.cell, { flexBasis }]}>
            <SquishyPressable
              onPress={() => onSelect(swatch.hex)}
              scaleTo={0.9}
              accessibilityRole="button"
              accessibilityLabel={swatch.name}
              accessibilityState={{ selected }}
              style={styles.pressable}
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
  pressable: {
    width: "100%",
    aspectRatio: 1,
  },
  ring: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "transparent",
    padding: RING_OFFSET,
  },
  ringSelected: {
    borderColor: ACCENT,
  },
  swatch: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 2,
  },
});

export default ColorSwatchGrid;
