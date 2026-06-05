import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faWandMagicSparkles } from "@fortawesome/pro-duotone-svg-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import Spinner from "@/components/Spinner/Spinner";
import { COLORS, FONTS } from "@/lib/design";

/**
 * Shown on the coloring-image detail screen while a freshly-created page is
 * still GENERATING on the worker (the pending/worker create flow). The screen
 * polls the row (useColoringImage refetchInterval) and swaps this out for the
 * canvas the moment the worker flips the row to READY.
 *
 * Kid-friendly: a gently pulsing wand medallion + a reassuring line + spinner,
 * on the app's warm cream gradient. No emoji (FA duotone per the brand).
 */
const GeneratingScreen = () => {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const medallionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={styles.root}>
      <View style={styles.center}>
        <Animated.View style={[styles.medallion, medallionStyle]}>
          <FontAwesomeIcon
            icon={faWandMagicSparkles}
            size={44}
            color={COLORS.crayonOrange}
            secondaryColor={COLORS.yellow}
            secondaryOpacity={1}
          />
        </Animated.View>
        <Text style={styles.title}>Making your coloring page…</Text>
        <Text style={styles.subtitle}>
          Hang tight! Your picture is on its way.
        </Text>
        <Spinner color={COLORS.crayonOrange} size={28} />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  medallion: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(228,100,68,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
});

export default GeneratingScreen;
