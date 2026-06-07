import { View, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { COLORS } from "@/lib/design";
import { tapMedium } from "@/utils/haptics";
import {
  ONBOARDING_SCENES,
  type OnboardingScene,
} from "@/constants/onboardingScenes";

/**
 * Label-free scene picker for onboarding — a set of duotone scene-icon chips
 * (balloon = party, rocket = space, fish = sea, palm = jungle). Tap a chip to
 * load that welcome scene onto a fresh canvas. Lives OFF the canvas (in the
 * bottom sheet on phone, the left rail on iPad) so swipes never get eaten as
 * coloring strokes. No text — it's a kids app; the icons speak for themselves.
 *
 * `direction` lays the chips in a row (phone bottom sheet) or column (iPad rail).
 */
type SceneIconPickerProps = {
  activeId: string;
  onSelect: (scene: OnboardingScene) => void;
  direction?: "row" | "column";
};

const CHIP = 52;

const SceneIconPicker = ({
  activeId,
  onSelect,
  direction = "row",
}: SceneIconPickerProps) => (
  <View
    style={[
      styles.container,
      direction === "column" ? styles.column : styles.row,
    ]}
    accessibilityRole="tablist"
  >
    {ONBOARDING_SCENES.map((scene) => (
      <SceneChip
        key={scene.id}
        scene={scene}
        active={scene.id === activeId}
        onPress={() => {
          if (scene.id !== activeId) tapMedium();
          onSelect(scene);
        }}
      />
    ))}
  </View>
);

const SceneChip = ({
  scene,
  active,
  onPress,
}: {
  scene: OnboardingScene;
  active: boolean;
  onPress: () => void;
}) => {
  const scale = useSharedValue(active ? 1.08 : 1);
  scale.value = withSpring(active ? 1.08 : 1, { damping: 12, stiffness: 180 });
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${scene.label} scene`}
    >
      <Animated.View
        style={[
          styles.chip,
          { backgroundColor: `${scene.iconPrimary}1F` },
          active && styles.chipActive,
          animatedStyle,
        ]}
      >
        <FontAwesomeIcon
          icon={scene.icon}
          size={24}
          color={scene.iconPrimary}
          secondaryColor={scene.iconSecondary}
          secondaryOpacity={1}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  column: {
    flexDirection: "column",
    gap: 12,
  },
  chip: {
    width: CHIP,
    height: CHIP,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  chipActive: {
    borderColor: COLORS.crayonOrange,
  },
});

export default SceneIconPicker;
