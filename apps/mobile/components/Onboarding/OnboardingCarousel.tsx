import { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  FadeIn,
  FadeInDown,
  ZoomIn,
} from "react-native-reanimated";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faPalette,
  faSparkles,
  faShieldCheck,
  faLock,
  faStar,
  faPaw,
  faArrowRight,
} from "@fortawesome/pro-solid-svg-icons";
import OnboardingSlide from "./OnboardingSlide";
import OnboardingPaywallSlide from "./OnboardingPaywallSlide";
import OnboardingColoringSlide from "./OnboardingColoringSlide";

const SLIDE_COUNT = 5;
const COLORING_SLIDE_INDEX = 3;
const PAYWALL_SLIDE_INDEX = 4;

type OnboardingCarouselProps = {
  onComplete: () => void;
};

const OnboardingCarousel = ({ onComplete }: OnboardingCarouselProps) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / width);
      setActiveIndex(index);
    },
    [width],
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      scrollRef.current?.scrollTo({ x: index * width, animated: true });
    },
    [width],
  );

  const handleNext = useCallback(() => {
    if (activeIndex < SLIDE_COUNT - 1) {
      scrollToIndex(activeIndex + 1);
    }
  }, [activeIndex, scrollToIndex]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const isPaywallSlide = activeIndex === PAYWALL_SLIDE_INDEX;
  const isColoringSlide = activeIndex === COLORING_SLIDE_INDEX;

  const handleColoringDone = useCallback(() => {
    scrollToIndex(PAYWALL_SLIDE_INDEX);
  }, [scrollToIndex]);

  return (
    <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={styles.container}>
      {/* Skip button — hidden on coloring and paywall slides */}
      {!isPaywallSlide && !isColoringSlide && (
        <Pressable
          style={[styles.skipButton, { top: insets.top + 12 }]}
          onPress={handleSkip}
        >
          <Animated.Text style={styles.skipButtonText}>Skip</Animated.Text>
        </Pressable>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        scrollEnabled={scrollEnabled}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Slide 1: Creativity — Floating Bob */}
        <OnboardingSlide
          title="Endless Creativity, Zero Mess"
          description="Your child creates unique coloring pages by speaking, drawing, or snapping a photo. AI brings their imagination to life."
          renderVisual={() => <FloatingIcons />}
          isActive={activeIndex === 0}
        />

        {/* Slide 2: Safety — Staggered Entrance */}
        <OnboardingSlide
          title="Safe, Simple, Made for Little Hands"
          description="No ads, no social features, no data collection. Designed for ages 3-8. You stay in control."
          isActive={activeIndex === 1}
          renderVisual={() => (
            <View style={styles.safetyVisual}>
              <Animated.View
                entering={FadeIn.duration(500).springify()}
                style={styles.shieldContainer}
              >
                <Animated.View entering={ZoomIn.duration(500).springify()}>
                  <FontAwesomeIcon
                    icon={faShieldCheck}
                    size={64}
                    color="#10B981"
                  />
                </Animated.View>
              </Animated.View>
              <View style={styles.badgeRow}>
                <Animated.View
                  entering={FadeInDown.delay(400).duration(400)}
                  style={styles.safeBadge}
                >
                  <FontAwesomeIcon icon={faLock} size={14} color="#6B7280" />
                </Animated.View>
                <Animated.View
                  entering={FadeInDown.delay(600).duration(400)}
                  style={styles.safeBadge}
                >
                  <FontAwesomeIcon icon={faStar} size={14} color="#6B7280" />
                </Animated.View>
              </View>
            </View>
          )}
        />

        {/* Slide 3: Colo — Sequential Dot Fill */}
        <OnboardingSlide
          title="Watch Them Grow with Colo"
          description="Colo evolves as your child colors! Earn stickers, complete daily challenges, and unlock new stages."
          isActive={activeIndex === 2}
          renderVisual={() => (
            <View style={styles.coloVisual}>
              <Animated.View
                entering={ZoomIn.duration(500).springify()}
                style={styles.coloCircle}
              >
                <FontAwesomeIcon icon={faPaw} size={48} color="#E46444" />
              </Animated.View>
              <View style={styles.stageIndicators}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <StageDot key={i} index={i} />
                ))}
              </View>
            </View>
          )}
        />

        {/* Slide 4: Interactive Coloring */}
        <OnboardingColoringSlide
          onComplete={handleColoringDone}
          onSkip={handleSkip}
          setScroll={setScrollEnabled}
          isActive={activeIndex === COLORING_SLIDE_INDEX}
        />

        {/* Slide 5: Paywall */}
        <OnboardingPaywallSlide
          onComplete={onComplete}
          isActive={activeIndex === PAYWALL_SLIDE_INDEX}
        />
      </ScrollView>

      {/* Bottom area: dots + next button (hidden on coloring and paywall) */}
      {!isPaywallSlide && !isColoringSlide && (
        <View
          style={[styles.bottomArea, { paddingBottom: insets.bottom + 24 }]}
        >
          {/* Pagination dots */}
          <View style={styles.dotsContainer}>
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <PaginationDot key={i} active={i === activeIndex} />
            ))}
          </View>

          {/* Next button */}
          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              pressed && styles.nextButtonPressed,
            ]}
            onPress={handleNext}
          >
            <FontAwesomeIcon icon={faArrowRight} size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      {/* Dots-only on paywall slide */}
      {isPaywallSlide && (
        <View
          style={[styles.dotsOnlyArea, { paddingBottom: insets.bottom + 16 }]}
        >
          <View style={styles.dotsContainer}>
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <PaginationDot key={i} active={i === activeIndex} />
            ))}
          </View>
        </View>
      )}
    </LinearGradient>
  );
};

/** Slide 1: Three icons floating with staggered bob animation */
const FloatingIcons = () => {
  const palette = useSharedValue(0);
  const sparkles = useSharedValue(0);
  const star = useSharedValue(0);

  useEffect(() => {
    palette.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1250 }),
        withTiming(8, { duration: 1250 }),
      ),
      -1,
      true,
    );
    sparkles.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 1500 }),
          withTiming(6, { duration: 1500 }),
        ),
        -1,
        true,
      ),
    );
    star.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(-10, { duration: 1000 }),
          withTiming(10, { duration: 1000 }),
        ),
        -1,
        true,
      ),
    );
  }, [palette, sparkles, star]);

  const paletteStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: palette.value }],
  }));
  const sparklesStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sparkles.value }],
  }));
  const starStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: star.value }],
  }));

  return (
    <View style={styles.visualComposition}>
      <Animated.View
        style={[styles.floatingIcon, styles.floatingIcon1, paletteStyle]}
      >
        <FontAwesomeIcon icon={faPalette} size={40} color="#E46444" />
      </Animated.View>
      <Animated.View
        style={[styles.floatingIcon, styles.floatingIcon2, sparklesStyle]}
      >
        <FontAwesomeIcon icon={faSparkles} size={32} color="#FCD34D" />
      </Animated.View>
      <Animated.View
        style={[styles.floatingIcon, styles.floatingIcon3, starStyle]}
      >
        <FontAwesomeIcon icon={faStar} size={28} color="#F1AE7E" />
      </Animated.View>
    </View>
  );
};

/** Slide 3: Individual stage dot that fills in with delay based on index */
const StageDot = ({ index }: { index: number }) => {
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withDelay(index * 300, withTiming(1, { duration: 400 }));
  }, [fill, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor:
      fill.value > 0.5
        ? `rgba(228, 100, 68, ${fill.value})`
        : `rgba(229, 231, 235, ${1 - fill.value + fill.value})`,
    transform: [{ scale: 0.8 + fill.value * 0.2 }],
  }));

  return <Animated.View style={[styles.stageCircle, animatedStyle]} />;
};

const PaginationDot = ({ active }: { active: boolean }) => {
  const animatedWidth = useSharedValue(active ? 24 : 8);
  const animatedOpacity = useSharedValue(active ? 1 : 0.3);

  // Update animation values when active state changes
  animatedWidth.value = withTiming(active ? 24 : 8, { duration: 200 });
  animatedOpacity.value = withTiming(active ? 1 : 0.3, { duration: 200 });

  const animatedStyle = useAnimatedStyle(() => ({
    width: animatedWidth.value,
    opacity: animatedOpacity.value,
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: "absolute",
    right: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#9CA3AF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  bottomArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  dotsOnlyArea: {
    alignItems: "center",
    paddingTop: 8,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E46444",
  },
  nextButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E46444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonPressed: {
    backgroundColor: "#D35A3A",
    transform: [{ scale: 0.95 }],
  },
  // Slide 1 visuals
  visualComposition: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingIcon: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(228, 100, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingIcon1: {
    top: 10,
    left: 10,
    backgroundColor: "rgba(228, 100, 68, 0.12)",
  },
  floatingIcon2: {
    top: 0,
    right: 10,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(252, 211, 77, 0.15)",
  },
  floatingIcon3: {
    bottom: 10,
    left: 50,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(241, 174, 126, 0.15)",
  },
  // Slide 2 visuals
  safetyVisual: {
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  shieldContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 16,
  },
  safeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(107, 114, 128, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Slide 3 visuals
  coloVisual: {
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  coloCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(228, 100, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  stageIndicators: {
    flexDirection: "row",
    gap: 8,
  },
  stageCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
  },
});

export default OnboardingCarousel;
