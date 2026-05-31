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
            <Spinner size={Math.round(iconSize * 0.9)} color={MAGIC_FROM} />
          ) : (
            <>
              <FontAwesomeIcon
                icon={icon}
                size={iconSize}
                color={selected ? "#FFFFFF" : MAGIC_FROM}
              />
              <FontAwesomeIcon
                icon={faSparkles}
                size={Math.round(iconSize * 0.5)}
                color={selected ? "#FFFFFF" : MAGIC_FROM}
                style={styles.sparkle}
              />
            </>
          )}
        </View>
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
  tileBase: {
    flex: 1,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
    top: 4,
    right: 4,
  },
});

export default ToolTile;
