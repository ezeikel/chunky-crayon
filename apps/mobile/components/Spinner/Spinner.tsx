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
import { faSpinnerThird } from "@fortawesome/pro-solid-svg-icons";
import { COLORS } from "@/lib/design";

type SpinnerProps = {
  style?: ViewStyle;
  size?: number;
  color?: string;
};

const Spinner = ({ style, size, color }: SpinnerProps) => {
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

  return (
    <View className="justify-center items-center">
      <Animated.View style={animatedStyle}>
        <FontAwesomeIcon
          icon={faSpinnerThird}
          style={style}
          size={size || 48}
          color={color || COLORS.primaryLight}
        />
      </Animated.View>
    </View>
  );
};

export default Spinner;
