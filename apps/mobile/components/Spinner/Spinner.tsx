import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import tw from "twrnc";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faSpinnerThird } from "@fortawesome/pro-regular-svg-icons";

type SpinnerProps = {
  style?: Record<string, unknown>;
  size?: number;
};

const Spinner = ({ style, size }: SpinnerProps) => {
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
    <View style={tw`justify-center items-center`}>
      <Animated.View style={animatedStyle}>
        <FontAwesomeIcon
          icon={faSpinnerThird}
          style={tw.style(`text-[#FF8A65]`, {
            ...style,
          })}
          size={size || 48}
        />
      </Animated.View>
    </View>
  );
};

export default Spinner;
