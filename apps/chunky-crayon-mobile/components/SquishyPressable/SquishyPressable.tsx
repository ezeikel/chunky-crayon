import { useCallback } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import { tapLight } from "@/utils/haptics";

/**
 * The one press primitive every tappable in the app builds on, so the
 * whole UI shares a single "squishy" press feel: a quick spring-eased
 * scale-down + a light haptic on touch.
 *
 * Why a primitive (not just per-component animation): cards, tiles,
 * chips, list rows and the shared Button were each hand-rolling (or
 * skipping) press feedback, so the feel drifted. Wrapping them all in
 * SquishyPressable makes the squish consistent and the haptic automatic.
 *
 * Two ways to use it:
 *   1. Plain — wrap any content; it scales on press (default 0.95).
 *        <SquishyPressable onPress={...}><Card/></SquishyPressable>
 *   2. With extra press-driven visuals — pass a render function as
 *      `children` to read the shared `pressed` value (0→1) and layer your
 *      own animation on top of the scale. The chunky Button uses this to
 *      drive its lift-collapse + translateY from the same press state
 *      instead of a second state machine.
 *        <SquishyPressable scaleTo={0.97}>
 *          {(pressed) => <Animated.View style={liftStyle(pressed)} .../>}
 *        </SquishyPressable>
 *
 * Animation is Reanimated (UI thread), never RN Animated. Haptic uses the
 * shared `tapLight` helper and respects the device setting.
 */

// Web's bounce-in easing — cubic-bezier(0.34, 1.56, 0.64, 1). The 1.56
// overshoot gives the press its springy pop; shared with Button so the
// scale and the lift ease identically.
export const SQUISH_BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);
export const SQUISH_PRESS_MS = 120;

type SquishyPressableProps = {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** Scale at full press. Default 0.95; Button uses ~0.97 (subtler). */
  scaleTo?: number;
  /** Fire the light haptic on press-in. Default true. */
  haptic?: boolean;
  /**
   * Children, or a render function receiving the `pressed` shared value
   * (0 at rest → 1 fully pressed) so callers can layer press-driven
   * visuals on top of the scale.
   */
  children?:
    | React.ReactNode
    | ((pressed: SharedValue<number>) => React.ReactNode);
  /** Layout/positioning only — keep visuals on the children (RN-shadow
   *  + transform on the same node can clash; see Button). */
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: "button" | "link" | "none";
  accessibilityLabel?: string;
  accessibilityState?: { disabled?: boolean; selected?: boolean };
  hitSlop?: number;
};

const SquishyPressable = ({
  onPress,
  onLongPress,
  disabled = false,
  scaleTo = 0.95,
  haptic = true,
  children,
  style,
  accessibilityRole = "button",
  accessibilityLabel,
  accessibilityState,
  hitSlop,
}: SquishyPressableProps) => {
  // pressed: 0 (rest) → 1 (down). Shared with children via render-prop.
  const pressed = useSharedValue(0);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
  }));

  const handlePressIn = useCallback(() => {
    pressed.value = withTiming(1, {
      duration: SQUISH_PRESS_MS,
      easing: SQUISH_BOUNCE,
    });
    if (haptic) tapLight();
  }, [pressed, haptic]);

  const handlePressOut = useCallback(() => {
    pressed.value = withTiming(0, {
      duration: SQUISH_PRESS_MS,
      easing: SQUISH_BOUNCE,
    });
  }, [pressed]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    onPress?.();
  }, [disabled, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, ...accessibilityState }}
      hitSlop={hitSlop}
      style={style}
    >
      <Animated.View style={scaleStyle}>
        {typeof children === "function" ? children(pressed) : children}
      </Animated.View>
    </Pressable>
  );
};

export default SquishyPressable;
