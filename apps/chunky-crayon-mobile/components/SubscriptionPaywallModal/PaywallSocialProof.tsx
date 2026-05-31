import { useEffect, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faStar } from "@fortawesome/pro-solid-svg-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
import { PAYWALL_TRUST } from "@/lib/paywall/plans";

/**
 * Social proof: a quantified stat line up top, plus one rotating
 * parent testimonial that fades + slides through a few quotes. This is
 * the single biggest trust lever for an AI-skeptical parent deciding
 * whether to pay — so it sits right under the hero, above the plans.
 *
 * Rotating-testimonial motion is the PTP pattern (cross-fade + slide
 * every few seconds) adapted to CC's warmer palette. Copy is parent-
 * voiced and deliberately AI-free per brand rules — it's about the
 * outcome (a calm, happy kid), not the technology.
 */

const ROTATION_MS = 4500;
const FADE_MS = 260;

type Testimonial = {
  quote: string;
  name: string;
  tint: string;
  tintDark: string;
};

// Warm crayon-palette tints (no purple, per brand). `tint` backs the
// avatar bubble; `tintDark` is the legible initial on top of it.
const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "“My daughter asks for a new page every morning. Worth every penny.”",
    name: "Sarah, mom of 2",
    tint: "#E68991", // crayon pink
    tintDark: "#B85763",
  },
  {
    quote: "“Twenty minutes of happy quiet while I make dinner. Worth it.”",
    name: "James, dad of 3",
    tint: "#5A9EE2", // crayon blue
    tintDark: "#2E6DA8",
  },
  {
    quote: "“They each have their own profile and never run out of pages.”",
    name: "Priya, mom of 3",
    tint: "#FAC342", // crayon yellow
    tintDark: "#B5832A",
  },
];

const ROW_HEIGHT = 56;

type RowProps = {
  item: Testimonial;
  index: number;
  current: SharedValue<number>;
};

const TestimonialRow = ({ item, index, current }: RowProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const isActive = current.value === index;
    return {
      opacity: withTiming(isActive ? 1 : 0, { duration: FADE_MS }),
      zIndex: isActive ? 2 : 1,
    };
  });

  // First letter of the name as the avatar initial (e.g. "Sarah, mom of
  // 2" → "S") so the bubble reads as a real person, not a placeholder dot.
  const initial = item.name.trim().charAt(0).toUpperCase();

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      <View style={[styles.avatar, { backgroundColor: `${item.tint}33` }]}>
        <Text style={[styles.avatarInitial, { color: item.tintDark }]}>
          {initial}
        </Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.quote} numberOfLines={2}>
          {item.quote}
        </Text>
        <Text style={styles.name}>{item.name}</Text>
      </View>
    </Animated.View>
  );
};

const PaywallSocialProof = () => {
  const current = useSharedValue(0);

  const advance = useCallback(() => {
    current.value = (current.value + 1) % TESTIMONIALS.length;
  }, [current]);

  useEffect(() => {
    const id = setInterval(() => {
      // tiny fade choreography handled per-row by opacity; just advance
      // the active index on the JS thread.
      runOnJS(advance)();
    }, ROTATION_MS);
    return () => clearInterval(id);
  }, [advance]);

  return (
    <View style={styles.container}>
      {/* Rating + review count — kept in sync with web. */}
      <View style={styles.ratingRow}>
        <View style={styles.stars}>
          {[0, 1, 2, 3, 4].map((i) => (
            <FontAwesomeIcon key={i} icon={faStar} size={13} color="#FBBF24" />
          ))}
        </View>
        <Text style={styles.ratingText}>
          {PAYWALL_TRUST.averageRating} from {PAYWALL_TRUST.reviewCount} reviews
        </Text>
      </View>

      <View style={styles.carousel}>
        {TESTIMONIALS.map((t, i) => (
          <TestimonialRow key={i} item={t} index={i} current={current} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stars: {
    flexDirection: "row",
    gap: 1,
  },
  ratingText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    color: "#6B5344",
  },
  carousel: {
    height: ROW_HEIGHT,
  },
  row: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  quote: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    lineHeight: 17,
    color: "#3D2C1E",
  },
  name: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 12,
    color: "#7A6F66",
  },
});

export default PaywallSocialProof;
