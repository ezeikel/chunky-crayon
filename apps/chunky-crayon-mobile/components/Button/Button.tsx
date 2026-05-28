import { useCallback } from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  View,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { FONTS, COLORS } from "@/lib/design";
import { tapLight } from "@/utils/haptics";
import { playPop } from "@/utils/sounds";

/**
 * Mobile port of packages/coloring-ui/src/Button.tsx — the chunky
 * crayon button that anchors CC's look. Single shared component so we
 * stop hand-rolling inline Pressables with drifting styles.
 *
 * Mirrors web's API: same variant names (default / secondary /
 * destructive / success / outline / neutral / outline-muted / ghost /
 * link) and size names (default / sm / lg / icon).
 *
 * The signature chunky "lift": brand variants render a hard-offset
 * bottom-drop shadow in the variant's dark shade that sits 6px below
 * the button face, and the whole button presses DOWN to a 3px lift +
 * 2px translateY on touch — so it reads like a physical key being
 * pushed. Flat variants (outline / ghost / link) skip the lift.
 *
 * Animations are Reanimated (UI thread), never RN Animated. Press also
 * fires light haptic + pop sound — web's "multisensory press feedback"
 * for kids, which RN gives us natively. Both can be muted per the
 * sound manager; haptics respect the device setting.
 */

export type ButtonVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "success"
  | "outline"
  | "neutral"
  | "outline-muted"
  | "ghost"
  | "link";

export type ButtonSize = "default" | "sm" | "lg" | "icon";

type ButtonProps = {
  label?: string;
  /** Optional leading element (icon). */
  leading?: React.ReactNode;
  /** Optional trailing element. */
  trailing?: React.ReactNode;
  /** Custom children replace the label Text entirely. */
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onPress?: () => void;
  /** Mute the press sound for this button (haptic still fires). */
  silent?: boolean;
  /** Stretch the button face to fill its container's width. */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

// Per-variant face colour, text colour, and (for chunky variants) the
// dark bottom-lift colour. Values are the exact web tokens — see
// lib/design/colors.ts. `lift` true = chunky 6px→3px drop; false = flat.
type VariantSpec = {
  bg: string;
  fg: string;
  lift: boolean;
  bottom?: string;
  borderColor?: string;
  borderWidth?: number;
};

const VARIANTS: Record<ButtonVariant, VariantSpec> = {
  default: {
    bg: COLORS.crayonOrange,
    fg: "#FFFFFF",
    lift: true,
    bottom: "#D04725",
  },
  // web "secondary" = highlight (pink) face, error-dark bottom
  secondary: { bg: "#E68991", fg: "#FFFFFF", lift: true, bottom: "#D4545E" },
  destructive: { bg: "#E68991", fg: "#FFFFFF", lift: true, bottom: "#D4545E" },
  success: { bg: "#8CAF5A", fg: "#FFFFFF", lift: true, bottom: "#6C8A42" },
  neutral: {
    bg: COLORS.textPrimary,
    fg: "#FFFFFF",
    lift: true,
    bottom: "#2A211C",
  },
  outline: {
    bg: "#FFFFFF",
    fg: COLORS.crayonOrange,
    lift: false,
    borderColor: COLORS.crayonOrange,
    borderWidth: 2,
  },
  "outline-muted": {
    bg: "#FFFFFF",
    fg: COLORS.textPrimary,
    lift: false,
    borderColor: COLORS.bgCreamDark,
    borderWidth: 2,
  },
  ghost: { bg: "transparent", fg: COLORS.textPrimary, lift: false },
  link: { bg: "transparent", fg: COLORS.crayonOrange, lift: false },
};

const SIZES: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; fontSize: number }
> = {
  default: { height: 48, paddingHorizontal: 24, fontSize: 16 },
  sm: { height: 40, paddingHorizontal: 16, fontSize: 14 },
  lg: { height: 56, paddingHorizontal: 32, fontSize: 18 },
  icon: { height: 48, paddingHorizontal: 0, fontSize: 16 },
};

// Web's bounce-in easing — cubic-bezier(0.34, 1.56, 0.64, 1). The 1.56
// overshoot is what gives the press its springy pop.
const BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);
const PRESS_MS = 120;

const Button = ({
  label,
  leading,
  trailing,
  children,
  variant = "default",
  size = "default",
  disabled = false,
  onPress,
  silent = false,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
}: ButtonProps) => {
  const spec = VARIANTS[variant];
  const dims = SIZES[size];

  // pressed: 0 (rest) → 1 (down). Drives translateY + lift collapse.
  const pressed = useSharedValue(0);

  const liftRest = spec.lift ? 6 : 0;
  const liftActive = spec.lift ? 3 : 0;

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * 2 }],
  }));

  const shadowStyle = useAnimatedStyle(() => {
    if (!spec.lift) return {};
    // Interpolate the chunky bottom-drop from liftRest → liftActive.
    const offset = liftRest - pressed.value * (liftRest - liftActive);
    return {
      shadowOffset: { width: 0, height: offset },
      shadowOpacity: 1,
      shadowRadius: 0,
    };
  });

  const handlePressIn = useCallback(() => {
    pressed.value = withTiming(1, { duration: PRESS_MS, easing: BOUNCE });
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = withTiming(0, { duration: PRESS_MS, easing: BOUNCE });
  }, [pressed]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    tapLight();
    if (!silent) playPop();
    onPress?.();
  }, [disabled, silent, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={[fullWidth && styles.fullWidth, style]}
    >
      {/* Outer wrapper holds the chunky bottom shadow (shadowColor =
          the variant's dark shade), so the shadow stays put while the
          inner face translates down on press. */}
      <Animated.View
        style={[
          spec.lift && { shadowColor: spec.bottom, borderRadius: 24 },
          fullWidth && styles.fullWidth,
          shadowStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.face,
            {
              backgroundColor: spec.bg,
              height: dims.height,
              paddingHorizontal: dims.paddingHorizontal,
              width:
                size === "icon" ? dims.height : fullWidth ? "100%" : undefined,
              borderColor: spec.borderColor,
              borderWidth: spec.borderWidth ?? 0,
              opacity: disabled ? 0.5 : 1,
            },
            // Flat variants get a soft drop instead of the chunky lift.
            !spec.lift && variant !== "ghost" && variant !== "link"
              ? styles.softShadow
              : null,
            faceStyle,
          ]}
        >
          {leading ? <View style={styles.slot}>{leading}</View> : null}
          {children ?? (
            <Text
              style={[
                styles.label,
                {
                  color: spec.fg,
                  fontSize: dims.fontSize,
                  textDecorationLine: variant === "link" ? "underline" : "none",
                },
                textStyle,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          )}
          {trailing ? <View style={styles.slot}>{trailing}</View> : null}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  face: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 24, // web --radius-coloring-button 1.5rem
  },
  label: {
    fontFamily: FONTS.bold,
  },
  slot: {
    alignItems: "center",
    justifyContent: "center",
  },
  softShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 3,
  },
  fullWidth: {
    width: "100%",
  },
});

export default Button;
