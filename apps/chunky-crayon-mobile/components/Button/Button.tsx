import { useCallback } from "react";
import {
  Text,
  StyleSheet,
  View,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import SquishyPressable from "@/components/SquishyPressable";
import { FONTS, COLORS } from "@/lib/design";
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
 * Built on the shared `SquishyPressable` primitive so every button
 * inherits the app-wide squishy press feel: SquishyPressable owns the
 * Pressable, the press-state shared value, the scale-down (here a subtle
 * 0.97 layered UNDER the chunky lift) and the light haptic; Button reads
 * the exposed `pressed` value to drive its own lift-collapse + 2px
 * translateY on top. So the button looks exactly as before but the press
 * machinery is shared, not hand-rolled.
 *
 * Animations are Reanimated (UI thread), never RN Animated. Press also
 * fires light haptic (via SquishyPressable) + pop sound — web's
 * "multisensory press feedback" for kids. Sound can be muted per the
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
  /** Style merged onto the inner face View — e.g. to override icon-button
   *  size (the face owns width/height, the outer Pressable does not). */
  faceStyle?: StyleProp<ViewStyle>;
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

// Subtle scale layered UNDER the chunky lift — Button keeps its
// signature press-down/lift look and gains a small squish (0.97) so it
// feels springier, without becoming a plain scale button.
const BUTTON_SCALE_TO = 0.97;

// The lifted stack (outer chunky-shadow wrapper + inner face), driven by
// SquishyPressable's `pressed` value. Split into its own component because
// the lift/translateY animated styles use hooks that must run at the top
// level of a component — the parent passes `pressed` down from the
// render-prop.
type ButtonFaceProps = {
  pressed: SharedValue<number>;
  spec: VariantSpec;
  dims: (typeof SIZES)[ButtonSize];
  variant: ButtonVariant;
  size: ButtonSize;
  hasLift: boolean;
  disabled: boolean;
  fullWidth: boolean;
  faceStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  label?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
};

const ButtonFace = ({
  pressed,
  spec,
  dims,
  variant,
  size,
  hasLift,
  disabled,
  fullWidth,
  faceStyle,
  textStyle,
  label,
  leading,
  trailing,
  children,
}: ButtonFaceProps) => {
  const liftRest = hasLift ? 6 : 0;
  const liftActive = hasLift ? 3 : 0;

  const pressTransform = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * 2 }],
  }));

  const shadowStyle = useAnimatedStyle(() => {
    // When NOT lifted, EXPLICITLY zero the shadow props rather than returning
    // {}. The same Button instance re-renders with a new variant when a tile
    // toggles default→outline-muted (the create-form mode selector reuses 4
    // persistent Buttons), and returning {} leaves the previously-applied
    // shadowOpacity:1 / shadowOffset on the native view — which, once the
    // wrapper's coloured shadowColor is gone, renders as a stale BLACK drop
    // (the "previously-selected" ghost shadow). Zeroing clears it.
    if (!hasLift) {
      return {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      };
    }
    // Interpolate the chunky bottom-drop from liftRest → liftActive.
    const offset = liftRest - pressed.value * (liftRest - liftActive);
    return {
      shadowOffset: { width: 0, height: offset },
      shadowOpacity: 1,
      shadowRadius: 0,
    };
  });

  return (
    // Outer wrapper holds the chunky bottom shadow (shadowColor = the
    // variant's dark shade), so the shadow stays put while the inner face
    // translates down on press.
    <Animated.View
      style={[
        hasLift && { shadowColor: spec.bottom, borderRadius: 24 },
        fullWidth && styles.fullWidth,
        // Fade the whole button (face + chunky bottom lift) when disabled,
        // matching web's `disabled:opacity-50`. Opacity on the OUTER wrapper
        // so the lift shadow dims with the face, not just the face alone.
        disabled && { opacity: 0.5 },
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
          },
          // Flat variants get a soft drop instead of the chunky lift.
          !spec.lift && variant !== "ghost" && variant !== "link"
            ? styles.softShadow
            : null,
          pressTransform,
          // Caller face overrides (e.g. icon-button size) win last.
          faceStyle,
        ]}
      >
        {leading ? <View style={styles.slot}>{leading}</View> : null}
        {/* Only render the label Text when there's actually a label. An
            icon-only button (size="icon", leading only, no label/children)
            must NOT emit an empty <Text> — with the face's `gap: 8` that
            phantom node pushes the icon off-center. */}
        {children ??
          (label != null ? (
            <Text
              style={[
                styles.label,
                {
                  color: spec.fg,
                  fontSize: dims.fontSize,
                  // Match web: the link variant underlines only on hover
                  // (`hover:underline`), so at rest it has NO underline. Touch
                  // has no hover, so mobile mirrors web's rest state — plain.
                  textDecorationLine: "none",
                },
                textStyle,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          ) : null)}
        {trailing ? <View style={styles.slot}>{trailing}</View> : null}
      </Animated.View>
    </Animated.View>
  );
};

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
  faceStyle,
  textStyle,
  accessibilityLabel,
}: ButtonProps) => {
  const spec = VARIANTS[variant];
  const dims = SIZES[size];

  // Disabled buttons KEEP their chunky bottom lift — web only fades them via
  // `disabled:opacity-50`, the `[--lift:6px]` bottom-drop stays. So a disabled
  // chunky button still shows its dark bottom border at 50% opacity. (The face
  // `opacity: 0.5` fades the whole stack, lift included, to match.)
  const hasLift = spec.lift;

  // SquishyPressable owns the press state, scale + haptic. Button layers
  // its lift/translateY on top via the exposed `pressed` value, and adds
  // the pop sound (haptic already fired by the primitive).
  const handlePress = useCallback(() => {
    if (disabled) return;
    if (!silent) playPop();
    onPress?.();
  }, [disabled, silent, onPress]);

  return (
    <SquishyPressable
      onPress={handlePress}
      disabled={disabled}
      scaleTo={BUTTON_SCALE_TO}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[fullWidth && styles.fullWidth, style]}
    >
      {(pressed) => (
        <ButtonFace
          pressed={pressed}
          spec={spec}
          dims={dims}
          variant={variant}
          size={size}
          hasLift={hasLift}
          disabled={disabled}
          fullWidth={fullWidth}
          faceStyle={faceStyle}
          textStyle={textStyle}
          label={label}
          leading={leading}
          trailing={trailing}
          children={children}
        />
      )}
    </SquishyPressable>
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
    // Web's flat variants use `shadow-[0_4px_14px_-10px_rgb(0_0_0/0.16)]` — the
    // -10px SPREAD nearly cancels the 14px blur, so on small elements (the
    // create-form mode tiles) it renders as essentially NO shadow, just a hint
    // of separation. RN has no shadow-spread, and any non-trivial radius pools
    // darkly at the tile's hard corners — which read as the black halo. So keep
    // it to a 1px hairline at very low opacity: a whisper of lift, no halo.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
    elevation: 1,
  },
  fullWidth: {
    width: "100%",
  },
});

export default Button;
