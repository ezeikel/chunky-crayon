import { View, StyleSheet, type DimensionValue } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import SquishyPressable from "@/components/SquishyPressable";
import {
  PALETTE_VARIANTS,
  PALETTE_VARIANT_ICONS,
  type PaletteVariant,
} from "@/lib/coloring/palette";
import { useT } from "@/lib/i18n/useT";

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
  const t = useT("mobile.coloring.palette");
  // Icon sized to match the tools-rail icons (24px) so the left-panel
  // variant icons read at the same scale as the right-panel tool icons.
  const iconSize = Math.round(pillHeight * 0.5);
  // Each pill is exactly 1/columns of the row, with the gap applied as
  // per-pill padding INSIDE the slot (not row `gap`) — so `columns` × the
  // %-basis sums to exactly 100% and never wraps. (Row `gap` + a 50% basis
  // overflowed 100% and made the 2-up grid stack 1-per-row.)
  const basis = `${100 / columns}%` as DimensionValue;

  return (
    <View style={styles.row}>
      {PALETTE_VARIANTS.map((variant, i) => {
        const isSelected = variant === selected;
        const col = i % columns;
        return (
          <SquishyPressable
            key={variant}
            onPress={() => onSelect(variant)}
            scaleTo={0.96}
            accessibilityRole="button"
            accessibilityLabel={t(variant)}
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.pillSlot,
              {
                flexBasis: basis,
                maxWidth: basis,
                paddingLeft: col === 0 ? 0 : GAP / 2,
                paddingRight: col === columns - 1 ? 0 : GAP / 2,
                marginBottom: GAP,
              },
            ]}
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
  },
  pillSlot: {
    flexGrow: 0,
    flexShrink: 0,
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
