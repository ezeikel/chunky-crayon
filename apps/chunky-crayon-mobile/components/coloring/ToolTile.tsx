import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { LinearGradient } from "expo-linear-gradient";
import { faSparkles } from "@fortawesome/pro-duotone-svg-icons";
import SquishyPressable from "@/components/SquishyPressable";
import Spinner from "@/components/Spinner/Spinner";

/**
 * A single coloring tool tile, matching CC web's current tool tiles
 * exactly:
 *  - regular: selected = solid orange (#E46444) + white icon + soft glow
 *    + transparent border; unselected = white + #F0E9DC border + #433A33
 *    icon.
 *  - magic (Magic Brush / Auto Color): purple→pink gradient
 *    (#C088A0 → #E58A93), a faSparkles badge top-right, disabled + a
 *    purple spinner until magicReady. Inactive-ready shows a 10%-tint
 *    gradient + purple icon.
 *
 * Radius 24, springy 200ms press (via SquishyPressable), icon-only (no
 * text label — web removed them; label is the accessibility name).
 * `size` is the square side; callers pass the per-tier tile size.
 */

// Web coloring tokens (resolved CC values).
const ACCENT = "#E46444";
const SURFACE_DARK = "#F0E9DC";
const TEXT_PRIMARY = "#433A33";
const MAGIC_FROM = "#C088A0";
const MAGIC_TO = "#E58A93";

type ToolTileProps = {
  icon: IconDefinition;
  label: string;
  selected: boolean;
  onPress: () => void;
  size?: number;
  /** Magic tools get the purple→pink gradient + sparkle badge. */
  isMagic?: boolean;
  /** Magic tools are disabled (with a spinner) until the region store is ready. */
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const ToolTile = ({
  icon,
  label,
  selected,
  onPress,
  size = 56,
  isMagic = false,
  loading = false,
  disabled = false,
  style,
}: ToolTileProps) => {
  const iconSize = Math.round(size * 0.42);
  // The magic tiles carry a sparkle badge in the top-right corner. Web sizes
  // the main glyph at FA `xl` (24px) and the sparkle at FA `lg` (~21px) — i.e.
  // the badge is ~0.89x the main glyph, and it overflows the corner
  // (`-top-2 -right-2`, 8px outside) with a drop shadow. Match that ratio +
  // overflow here (the badge sits on the wrapper, outside tileBase's clip).
  const sparkleSize = Math.round(iconSize * 0.89);
  const sparkleOffset = -Math.round(size * 0.13);

  // ─── Magic tile ───
  if (isMagic) {
    const showGradient = selected || loading;
    return (
      <SquishyPressable
        onPress={onPress}
        disabled={disabled || loading}
        scaleTo={0.95}
        accessibilityRole="button"
        accessibilityLabel={loading ? `${label} (getting ready)` : label}
        accessibilityState={{ selected, disabled: disabled || loading }}
        style={[{ width: size, height: size }, style]}
      >
        <View style={[styles.tileBase, loading && styles.dimmed]}>
          {showGradient ? (
            <LinearGradient
              colors={[MAGIC_FROM, MAGIC_TO]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fill}
            />
          ) : (
            <LinearGradient
              colors={[`${MAGIC_FROM}1A`, `${MAGIC_TO}1A`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.fill,
                { borderWidth: 2, borderColor: `${MAGIC_FROM}4D` },
              ]}
            />
          )}
          {loading ? (
            // Loading shows the full-strength gradient (showGradient), so the
            // spinner must be WHITE to read against it — a MAGIC_FROM (pink)
            // spinner on the pink gradient was invisible, making the tile look
            // like a blank pink box. Web's loading spinner is white too.
            // Sized to the full tool-glyph size (faSpinnerThird read too thin
            // at 0.9× a value that's already small) so it matches the weight
            // of web's size-xl spinner.
            <Spinner size={iconSize} color="#FFFFFF" />
          ) : (
            <FontAwesomeIcon
              icon={icon}
              size={iconSize}
              color={selected ? "#FFFFFF" : MAGIC_FROM}
            />
          )}
        </View>
        {/* Sparkle badge — rendered OUTSIDE tileBase (which clips) so it can
            overflow the corner like web's `-top-2 -right-2`. */}
        {!loading && (
          <FontAwesomeIcon
            icon={faSparkles}
            size={sparkleSize}
            color={selected ? "#FFFFFF" : MAGIC_FROM}
            style={[
              styles.sparkle,
              { top: sparkleOffset, right: sparkleOffset },
            ]}
          />
        )}
      </SquishyPressable>
    );
  }

  // ─── Regular tile ───
  return (
    <SquishyPressable
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      style={[{ width: size, height: size }, style]}
    >
      <View
        style={[
          styles.tileBase,
          // Regular tiles have no absolutely-positioned fill to clip (only the
          // magic tile's gradient needs that), so DON'T clip here — faFillDrip
          // (the Fill tool) has a wide viewBox with a drip in the bottom-right
          // corner that otherwise gets cut by the rounded-corner overflow.
          // Matches web, whose regular tool tiles aren't overflow-hidden.
          styles.tileVisible,
          selected ? styles.selected : styles.unselected,
        ]}
      >
        <FontAwesomeIcon
          icon={icon}
          size={iconSize}
          color={selected ? "#FFFFFF" : TEXT_PRIMARY}
        />
      </View>
    </SquishyPressable>
  );
};

const styles = StyleSheet.create({
  // Fill the fixed-size pressable parent. `flex: 1` collapsed to a ~4px
  // sliver here because the Animated.View pressable isn't a definite-height
  // flex container — fill both axes explicitly instead.
  tileBase: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  // Regular-tile override: don't clip, so a wide glyph (faFillDrip) isn't cut
  // at the rounded corner. The selected tile's bg/border come from
  // styles.selected/unselected, which paint inside the radius regardless.
  tileVisible: {
    overflow: "visible",
  },
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
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
  dimmed: {
    opacity: 0.6,
  },
  sparkle: {
    position: "absolute",
    // web's drop-shadow-sm on the sparkle marker
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
  },
});

export default ToolTile;
