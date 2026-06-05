import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faMobileNotch } from "@fortawesome/pro-duotone-svg-icons";
import { faArrowRotateRight } from "@fortawesome/pro-solid-svg-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
} from "react-native-reanimated";
import { COLORS, FONTS } from "@/lib/design";
import { useT } from "@/lib/i18n/useT";
import { useUpsideDownHint } from "@/hooks/useUpsideDownHint";

/**
 * Friendly full-screen overlay shown when an iPhone is held PHYSICALLY
 * upside-down. A notched iPhone can't rotate its window to upside-down (Apple
 * forbids it on the phone idiom), so the app would otherwise just paint the UI
 * 180° rotated. Rather than fight UIKit, we detect the flip via the
 * accelerometer (useUpsideDownHint) and ask the kid to turn the phone back.
 *
 * Designed for ages 3-8: the ICON does the talking. A big phone repeatedly
 * ANIMATES from upside-down back to upright — literally demonstrating the
 * action — so a kid who can't read the text still understands. The text is a
 * short, playful title only (no wordy instructions a 3-year-old can't read).
 *
 * iPhone-only by construction — useUpsideDownHint returns false on iPad (which
 * genuinely rotates to upside-down) and on web/Android.
 *
 * TODO(upside-down-flip): a future version could instead rotate the whole UI
 * 180° so the app is fully usable upside-down (transform on the React root +
 * safe-area swap + per-Modal re-wrap + gesture-direction checks). Deferred as
 * not worth the complexity for an orientation Apple disables on iPhones; the
 * accelerometer signal here is exactly what that flip would reuse.
 */
const UpsideDownHint = () => {
  const isUpsideDown = useUpsideDownHint();
  const t = useT("mobile.upsideDownHint");

  // The phone icon DEMONSTRATES the action: it sits upside-down (180°), then
  // smoothly rotates upright (0°), pauses, and snaps back to upside-down to
  // repeat. A kid mirrors what they see — "oh, I turn it the other way".
  const spin = useSharedValue(0); // 0 → 1 over the loop
  // A gentle breathing pulse on the backdrop circle so the whole thing feels
  // alive and draws the eye.
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!isUpsideDown) return undefined;
    spin.value = withRepeat(
      withSequence(
        // hold upside-down briefly
        withDelay(400, withTiming(0, { duration: 0 })),
        // rotate upright (the demonstration)
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }),
        // hold upright, then reset for the next loop
        withDelay(700, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => {
      spin.value = 0;
      pulse.value = 0;
    };
  }, [isUpsideDown, spin, pulse]);

  // The overlay content is itself rotated 180° (styles.flipped) so it reads
  // upright for the person holding the inverted phone. To make the phone icon
  // APPEAR (to them) to rotate from upside-down → upright, its LOCAL rotation
  // goes 0° → 180° (which, plus the parent's 180°, the viewer sees as
  // 180° → 360°, i.e. upside-down → upright).
  const phoneStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(spin.value, [0, 1], [0, 180])}deg` }],
  }));
  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.06]) }],
  }));

  if (!isUpsideDown) return null;

  return (
    // Full-screen, opaque, above ALL content (incl. the floating settings gear).
    // Not interactive beyond blocking — the kid turns the phone, it dismisses.
    <Animated.View
      style={styles.overlay}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      pointerEvents="auto"
      accessibilityRole="alert"
      accessibilityLabel={t("title")}
    >
      {/* The overlay only shows when the phone is held PHYSICALLY upside-down,
          so the screen is painting everything 180° rotated relative to the
          person looking at it. Pre-rotate the overlay content 180° so the title
          + icon read the RIGHT way up FOR THEM (otherwise the message is upside
          down and useless). */}
      <View style={styles.flipped}>
        {/* Soft circle backdrop so the phone is unmistakably the hero. */}
        <Animated.View style={[styles.iconBackdrop, circleStyle]}>
          <Animated.View style={phoneStyle}>
            <FontAwesomeIcon
              icon={faMobileNotch}
              size={120}
              color={COLORS.crayonOrange}
            />
          </Animated.View>
          {/* A bold rotate arrow curling around the phone reinforces "spin me". */}
          <View style={styles.arrowBadge}>
            <FontAwesomeIcon
              icon={faArrowRotateRight}
              size={40}
              color={COLORS.white}
            />
          </View>
        </Animated.View>

        <Text style={styles.title}>{t("title")}</Text>
      </View>
    </Animated.View>
  );
};

const ICON_CIRCLE = 200;

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.bgCream,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    zIndex: 99999,
    elevation: 99999,
  },
  // Pre-rotate the whole message 180° so it reads upright for the person holding
  // the upside-down phone (the only time this overlay shows).
  flipped: {
    alignItems: "center",
    gap: 40,
    transform: [{ rotate: "180deg" }],
  },
  iconBackdrop: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    backgroundColor: COLORS.bgCreamDark,
    alignItems: "center",
    justifyContent: "center",
  },
  // Bold accent badge holding the rotate arrow, bottom-right of the phone.
  arrowBadge: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.crayonOrange,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.crayonOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 34,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
});

export default UpsideDownHint;
