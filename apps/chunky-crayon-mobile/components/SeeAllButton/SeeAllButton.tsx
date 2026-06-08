import { Pressable, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faArrowRight } from "@fortawesome/pro-solid-svg-icons";
import { tapMedium } from "@/utils/haptics";
import { COLORS } from "@/lib/design";

/**
 * The ONE "see all" affordance used across every section header (library,
 * recent creations, etc.). A circular arrow button — icon over text, so a
 * pre-reader gets "more this way" without reading. Replaces the old mixed
 * styles (big orange pill vs tiny "See all" text). ≥44pt tap target.
 */
type SeeAllButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
};

const SeeAllButton = ({ onPress, accessibilityLabel }: SeeAllButtonProps) => (
  <Pressable
    onPress={() => {
      tapMedium();
      onPress();
    }}
    hitSlop={8}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? "See all"}
    style={({ pressed }) => [styles.circle, pressed && styles.pressed]}
  >
    <FontAwesomeIcon
      icon={faArrowRight}
      size={18}
      color={COLORS.crayonOrange}
    />
  </Pressable>
);

const SIZE = 44;

const styles = StyleSheet.create({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: "rgba(228,100,68,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
});

export default SeeAllButton;
