import { View, StyleSheet, type DimensionValue } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import SquishyPressable from "@/components/SquishyPressable";
import {
  PALETTE_VARIANTS,
  PALETTE_VARIANT_ICONS,
  PALETTE_VARIANT_LABELS,
  type PaletteVariant,
} from "@/lib/coloring/palette";

/**
 * Row of four icon-only palette-variant pills (realistic / pastel / cute
 * / surprise), matching CC web's variant picker exactly:
 *  - selected = solid orange (#E46444) fill + white icon + soft orange
 *    glow + transparent border.
 *  - unselected = white + #F0E9DC 2px border + #433A33 icon.
 *
 * Radius 24, springy press (via SquishyPressable), icon-only (the label
 * is the accessibility name). The four pills fill the width as an even
 * row; `columns` controls how many sit per row before wrapping (web uses
 * 4-across at all tiers; the desktop sidebar wraps to a 2x2 grid — pass
 * columns={2} for that).
 */

// Web coloring tokens (resolved CC values) — match ToolTile.tsx.
const ACCENT = "#E46444";
const SURFACE_DARK = "#F0E9DC";
const TEXT_PRIMARY = "#433A33";

const GAP = 8;

type PaletteVariantPillsProps = {
  selected: PaletteVariant;
  onSelect: (variant: PaletteVariant) => void;
  /** Pills per row before wrapping. Default 4 (single row). Use 2 for the 2x2 sidebar grid. */
  columns?: number;
  /** Height of each pill. Default 48. */
  pillHeight?: number;
};

const PaletteVariantPills = ({
  selected,
  onSelect,
  columns = 4,
  pillHeight = 48,
}: PaletteVariantPillsProps) => {
  const iconSize = Math.round(pillHeight * 0.4);
  // Each row distributes its pills evenly; with wrapping, a fractional
  // basis keeps `columns` per row regardless of how many pills there are.
  const basis = `${100 / columns}%` as DimensionValue;

  return (
    <View style={styles.row}>
      {PALETTE_VARIANTS.map((variant) => {
        const isSelected = variant === selected;
        return (
          <SquishyPressable
            key={variant}
            onPress={() => onSelect(variant)}
            scaleTo={0.96}
            accessibilityRole="button"
            accessibilityLabel={PALETTE_VARIANT_LABELS[variant]}
            accessibilityState={{ selected: isSelected }}
            style={[styles.pillSlot, { flexBasis: basis, maxWidth: basis }]}
          >
            <View
              style={[
                styles.pillBase,
                { height: pillHeight },
                isSelected ? styles.selected : styles.unselected,
              ]}
            >
              <FontAwesomeIcon
                icon={PALETTE_VARIANT_ICONS[variant]}
                size={iconSize}
                color={isSelected ? "#FFFFFF" : TEXT_PRIMARY}
              />
            </View>
          </SquishyPressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    gap: GAP,
  },
  pillSlot: {
    flexGrow: 1,
    flexShrink: 1,
  },
  pillBase: {
    width: "100%",
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

export default PaletteVariantPills;
