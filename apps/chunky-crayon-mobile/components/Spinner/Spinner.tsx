import { useEffect } from "react";
import { View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
// DUOTONE faSpinnerThird — matches web's Loading.tsx (which uses the same
// duotone icon with --fa-primary-color: crayon-orange, --fa-secondary-color:
// crayon-teal at 0.6 opacity). RN FontAwesome supports the same treatment via
// the color / secondaryColor / secondaryOpacity props.
import { faSpinnerThird } from "@fortawesome/pro-duotone-svg-icons";
import { COLORS } from "@/lib/design";

type SpinnerProps = {
  style?: ViewStyle;
  size?: number;
  /**
   * Primary colour. Omit for the brand duotone (orange primary + teal
   * secondary, matching web). When set (e.g. white spinners inside a coloured
   * button), the spinner renders MONOTONE in that colour — a hardcoded
   * orange/teal duotone would vanish on an orange CTA. Pass `secondaryColor`
   * too for explicit duotone control.
   */
  color?: string;
  /** Secondary (back-layer) colour. Defaults: brand teal, or `color` when set. */
  secondaryColor?: string;
  /** Back-layer opacity. Web uses 0.6 for the brand duotone. */
  secondaryOpacity?: number;
};

const Spinner = ({
  style,
  size,
  color,
  secondaryColor,
  secondaryOpacity,
}: SpinnerProps) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 2000,
        easing: Easing.linear,
      }),
      -1, // -1 means the animation will repeat infinitely
      false, // If true, the animation will reverse on every repetition
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  // No explicit colour → web's brand duotone (orange + teal @ 0.6). Explicit
  // colour → monotone in that colour unless the caller also gives a secondary.
  // secondaryOrange === web --crayon-teal (#F1AE7E), the web loader's secondary.
  const primary = color ?? COLORS.crayonOrange;
  const secondary = secondaryColor ?? color ?? COLORS.secondaryOrange;
  const secondaryAlpha = secondaryOpacity ?? (color ? 1 : 0.6);

  return (
    <View className="justify-center items-center">
      <Animated.View style={animatedStyle}>
        <FontAwesomeIcon
          icon={faSpinnerThird}
          style={style}
          size={size || 48}
          color={primary}
          secondaryColor={secondary}
          secondaryOpacity={secondaryAlpha}
        />
      </Animated.View>
    </View>
  );
};

export default Spinner;
