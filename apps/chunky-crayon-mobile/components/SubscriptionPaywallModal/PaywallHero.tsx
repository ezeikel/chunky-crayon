import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { PAYWALL_HERO_PAGES } from "@/lib/paywall/assets";

/**
 * The paywall hero: three real coloring pages fanned like photos pinned
 * to a wall, so the first thing a parent sees is the actual product —
 * "look what they'll make" — not a price list. Mirrors CC web's pricing
 * "anchor strip". The pages are bundled line art (see paywall-assets).
 *
 * Each page is a white "frame" (page + a hairline border + soft shadow)
 * tilted at a fixed angle, the centre one upright, larger and on top.
 * They spring in staggered (centre first, then the wings) when the modal
 * opens — the PTP entrance choreography adapted to a fan.
 */

const FRAMES = [
  // order: left wing, right wing, centre — centre rendered last = on top
  {
    src: PAYWALL_HERO_PAGES[1],
    rotate: "-9deg",
    translateX: -74,
    scale: 0.82,
    delay: 120,
  },
  {
    src: PAYWALL_HERO_PAGES[2],
    rotate: "9deg",
    translateX: 74,
    scale: 0.82,
    delay: 120,
  },
  {
    src: PAYWALL_HERO_PAGES[0],
    rotate: "0deg",
    translateX: 0,
    scale: 1,
    delay: 0,
  },
];

type FrameProps = {
  src: (typeof FRAMES)[number]["src"];
  rotate: string;
  translateX: number;
  scale: number;
  delay: number;
  /** Flips true when the modal opens — replays the fan each open. */
  play: boolean;
};

const HeroFrame = ({
  src,
  rotate,
  translateX,
  scale,
  delay,
  play,
}: FrameProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    // Fade + spring-scale into place; wings settle slightly after the
    // centre so the fan "opens". Re-keyed on `play` so the entrance
    // replays every time the modal opens (RN Modal keeps children
    // mounted, so a mount-only effect would only fire once).
    if (play) {
      progress.value = 0;
      progress.value = withDelay(delay, withTiming(1, { duration: 1 }));
    }
  }, [progress, delay, play]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: withTiming(p, { duration: 280 }),
      transform: [
        { translateX },
        { rotate },
        {
          scale: withSpring(p === 0 ? 0.7 : scale, {
            damping: 11,
            stiffness: 120,
          }),
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.frame, animatedStyle]}>
      <Image
        source={src}
        style={styles.page}
        contentFit="contain"
        transition={200}
      />
    </Animated.View>
  );
};

type PaywallHeroProps = {
  /** Pass the modal's `visible` so the fan replays on each open. */
  play: boolean;
};

const PaywallHero = ({ play }: PaywallHeroProps) => (
  <View style={styles.container} pointerEvents="none">
    {FRAMES.map((f, i) => (
      <HeroFrame key={i} {...f} play={play} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    height: 168,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  // White photo frame — page + a little matte + soft drop, so the line
  // art reads as a printed page, not a flat image.
  frame: {
    position: "absolute",
    width: 132,
    height: 132,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 7,
    borderWidth: 1,
    borderColor: "#F0E7DC",
    shadowColor: "#43342D",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  page: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
});

export default PaywallHero;
