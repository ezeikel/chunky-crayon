import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCrown, faCheck, faRainbow } from "@fortawesome/pro-solid-svg-icons";
import {
  useOfferings,
  usePurchase,
  isAnnualPackage,
  getPackagePlanName,
  formatPackagePrice,
} from "@/hooks/usePaywall";
import type { PurchasesPackage } from "react-native-purchases";
import ParentalGate from "../ParentalGate";
import Paywall from "../Paywall";

type OnboardingPaywallSlideProps = {
  onComplete: () => void;
  isActive?: boolean;
};

const FEATURES = [
  "Unlimited AI coloring pages",
  "Magic Brush & voice creation",
  "Daily challenges & stickers",
];

const OnboardingPaywallSlide = ({
  onComplete,
  isActive = true,
}: OnboardingPaywallSlideProps) => {
  const { width } = useWindowDimensions();
  const { data: offering, isPending: isLoadingOfferings } = useOfferings();
  const purchaseMutation = usePurchase();

  const [showParentalGate, setShowParentalGate] = useState(false);
  const [showFullPaywall, setShowFullPaywall] = useState(false);
  const [hasBeenActive, setHasBeenActive] = useState(isActive);

  useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isActive, hasBeenActive]);

  // Find the Rainbow monthly package (primary CTA focus)
  const rainbowPackage = offering?.availablePackages?.find((pkg) => {
    const planName = getPackagePlanName(pkg);
    return planName === "RAINBOW" && !isAnnualPackage(pkg);
  });

  // Fallback to any Rainbow package
  const targetPackage =
    rainbowPackage ||
    offering?.availablePackages?.find(
      (pkg) => getPackagePlanName(pkg) === "RAINBOW",
    );

  const priceString = targetPackage
    ? `${formatPackagePrice(targetPackage)}/month`
    : "";

  const executePurchase = useCallback(
    async (pkg: PurchasesPackage) => {
      try {
        await purchaseMutation.mutateAsync(pkg);
        onComplete();
      } catch {
        // Error handled in mutation
      }
    },
    [purchaseMutation, onComplete],
  );

  const handleStartTrial = useCallback(() => {
    if (!targetPackage) return;
    setShowParentalGate(true);
  }, [targetPackage]);

  const handleParentalGateSuccess = useCallback(() => {
    setShowParentalGate(false);
    if (targetPackage) {
      executePurchase(targetPackage);
    }
  }, [targetPackage, executePurchase]);

  const handleParentalGateClose = useCallback(() => {
    setShowParentalGate(false);
  }, []);

  const handleSeeAllPlans = useCallback(() => {
    setShowFullPaywall(true);
  }, []);

  const handlePaywallClose = useCallback(() => {
    setShowFullPaywall(false);
  }, []);

  const handlePaywallSuccess = useCallback(() => {
    setShowFullPaywall(false);
    onComplete();
  }, [onComplete]);

  const isLoading = purchaseMutation.isPending;

  // CTA pulse animation — 3 subtle pulses after 800ms delay
  const ctaScale = useSharedValue(1);

  useEffect(() => {
    ctaScale.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1.03, { duration: 600 }),
          withTiming(1.0, { duration: 600 }),
        ),
        3,
      ),
    );
  }, [ctaScale]);

  const ctaPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  if (!hasBeenActive) {
    return <View style={[styles.container, { width }]} />;
  }

  return (
    <View style={[styles.container, { width }]}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.content}>
        {/* Crown icon */}
        <View style={styles.iconContainer}>
          <FontAwesomeIcon icon={faCrown} size={48} color="#FCD34D" />
        </View>

        <Text style={styles.title}>Start Your Free Week</Text>
        <Text style={styles.description}>
          Try everything free for 7 days. Cancel anytime.
        </Text>

        {/* Features list */}
        <View style={styles.featuresList}>
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <FontAwesomeIcon icon={faCheck} size={16} color="#10B981" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Plan badge */}
        {!isLoadingOfferings && targetPackage && (
          <Animated.View
            entering={FadeIn.duration(400).delay(300)}
            style={styles.planBadge}
          >
            <FontAwesomeIcon icon={faRainbow} size={16} color="#F9A8D4" />
            <Text style={styles.planBadgeText}>
              Rainbow Plan &middot; {priceString}
            </Text>
          </Animated.View>
        )}

        {/* CTA Buttons */}
        <View style={styles.ctaContainer}>
          {isLoadingOfferings ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#E46444" />
            </View>
          ) : (
            <>
              {/* Start Free Trial — with pulse animation */}
              <Animated.View style={ctaPulseStyle}>
                <Pressable
                  style={({ pressed }) => [
                    styles.trialButton,
                    pressed && styles.trialButtonPressed,
                    isLoading && styles.trialButtonDisabled,
                  ]}
                  onPress={handleStartTrial}
                  disabled={isLoading || !targetPackage}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.trialButtonText}>Start Free Trial</Text>
                  )}
                </Pressable>
              </Animated.View>

              {/* See All Plans */}
              <Pressable
                style={({ pressed }) => [
                  styles.seeAllButton,
                  pressed && styles.seeAllButtonPressed,
                ]}
                onPress={handleSeeAllPlans}
                disabled={isLoading}
              >
                <Text style={styles.seeAllButtonText}>See All Plans</Text>
              </Pressable>

              {/* Maybe Later */}
              <Pressable
                style={styles.skipButton}
                onPress={onComplete}
                disabled={isLoading}
              >
                <Text style={styles.skipButtonText}>Maybe Later</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Trial badge */}
        <View style={styles.trialNotice}>
          <Text style={styles.trialNoticeText}>
            7-day free trial &middot; Cancel anytime
          </Text>
        </View>
      </Animated.View>

      {/* Parental Gate - rendered at this level for correct layering */}
      <ParentalGate
        visible={showParentalGate}
        onClose={handleParentalGateClose}
        onSuccess={handleParentalGateSuccess}
        title="Parent Verification"
        subtitle="Please verify you are a parent to start a subscription"
      />

      {/* Full Paywall modal */}
      <Paywall
        visible={showFullPaywall}
        onClose={handlePaywallClose}
        onSuccess={handlePaywallSuccess}
        skipParentalGate={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  content: {
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(252, 211, 77, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 28,
    color: "#374151",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 34,
  },
  description: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 17,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 24,
  },
  featuresList: {
    alignSelf: "stretch",
    marginBottom: 20,
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  featureText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 16,
    color: "#374151",
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(249, 168, 212, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  planBadgeText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: "#6B7280",
  },
  ctaContainer: {
    width: "100%",
    gap: 12,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  trialButton: {
    backgroundColor: "#E46444",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  trialButtonPressed: {
    backgroundColor: "#D35A3A",
    transform: [{ scale: 0.98 }],
  },
  trialButtonDisabled: {
    opacity: 0.6,
  },
  trialButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 18,
    color: "#FFFFFF",
  },
  seeAllButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  seeAllButtonPressed: {
    backgroundColor: "#F9FAFB",
  },
  seeAllButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#6B7280",
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 15,
    color: "#9CA3AF",
  },
  trialNotice: {
    marginTop: 16,
  },
  trialNoticeText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
});

export default OnboardingPaywallSlide;
