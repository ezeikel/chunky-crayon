import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import {
  faCrown,
  faRainbow,
  faLockOpen,
  faBell,
  faCalendarCheck,
  faInfinity,
  faWandMagicSparkles,
  faTrophy,
  faStar,
} from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  useOfferings,
  usePurchase,
  isAnnualPackage,
  getPackagePlanName,
  formatPackagePrice,
} from "@/hooks/usePaywall";
import { PAYWALL_TRUST } from "@/lib/paywall/plans";
import { tapMedium, notifySuccess } from "@/utils/haptics";
import { COLORS, CRAYON } from "@/lib/design";
import type { PurchasesPackage } from "react-native-purchases";
import ParentalGate from "../ParentalGate";
import Spinner from "../Spinner/Spinner";
import SubscriptionPaywallModal from "../SubscriptionPaywallModal";

type OnboardingPaywallSlideProps = {
  onComplete: () => void;
  isActive?: boolean;
};

// Each feature carries its own crayon-duotone icon (no flat green checks).
const FEATURES: {
  icon: IconDefinition;
  primary: string;
  secondary: string;
  label: string;
}[] = [
  {
    icon: faInfinity,
    primary: CRAYON.blue.base,
    secondary: CRAYON.blue.light,
    label: "Unlimited coloring pages, anytime",
  },
  {
    icon: faWandMagicSparkles,
    primary: CRAYON.purple.dark,
    secondary: CRAYON.purple.light,
    label: "Magic Brush and color-by-voice",
  },
  {
    icon: faTrophy,
    primary: CRAYON.yellow.dark,
    secondary: CRAYON.yellow.base,
    label: "Daily challenges and sticker rewards",
  },
];

// "How your free trial works" — the trust/anxiety-reducer (Strava/TIDE pattern).
const TIMELINE: {
  icon: IconDefinition;
  primary: string;
  secondary: string;
  when: string;
  text: string;
}[] = [
  {
    icon: faLockOpen,
    primary: COLORS.crayonOrange,
    secondary: COLORS.secondaryOrange,
    when: "Today",
    text: "Unlock everything. Color as much as you like.",
  },
  {
    icon: faBell,
    primary: CRAYON.yellow.dark,
    secondary: CRAYON.yellow.base,
    when: "Day 5",
    text: "We'll remind you before your trial ends.",
  },
  {
    icon: faCalendarCheck,
    primary: CRAYON.green.base,
    secondary: CRAYON.green.light,
    when: "Day 7",
    text: "Your free week ends. Cancel anytime before then, no charge.",
  },
];

const OnboardingPaywallSlide = ({
  onComplete,
  isActive = true,
}: OnboardingPaywallSlideProps) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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

  const executePurchase = useCallback(
    async (pkg: PurchasesPackage) => {
      try {
        await purchaseMutation.mutateAsync(pkg);
        notifySuccess(); // celebrate the conversion before advancing
        onComplete();
      } catch {
        // Error handled in mutation (the error toast also buzzes)
      }
    },
    [purchaseMutation, onComplete],
  );

  const handleStartTrial = useCallback(() => {
    if (!targetPackage) return;
    tapMedium(); // reward the primary CTA tap
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

  // iPad: a 360pt column looks lost on a 13" screen. Widen the card and split
  // content into two columns (info on the left, plan + CTAs on the right) so
  // the paywall uses the space, like desktop. Phone stays single-column with a
  // scrolling body + a pinned full-width CTA footer.
  const isTablet = width >= 768;
  const pricePerMonth = targetPackage ? formatPackagePrice(targetPackage) : "";

  // ── Shared scroll/info block: crown → headline → subhead → features →
  //    timeline → trust rating. Same content phone + iPad; only the wrapper
  //    (ScrollView vs infoColumn) differs.
  const infoBlock = (
    <>
      <View
        style={[styles.iconContainer, isTablet && styles.iconContainerTablet]}
      >
        <FontAwesomeIcon
          icon={faCrown}
          size={48}
          color={CRAYON.yellow.dark}
          secondaryColor={CRAYON.yellow.base}
          secondaryOpacity={1}
        />
      </View>

      <Text style={[styles.title, isTablet && styles.titleTablet]}>
        Unlimited coloring, free for a week
      </Text>
      <Text style={[styles.description, isTablet && styles.descriptionTablet]}>
        Then pick the plan that fits after they fall in love.
      </Text>

      {/* Features — each with its own crayon-duotone icon */}
      <View style={styles.featuresList}>
        {FEATURES.map((feature) => (
          <View key={feature.label} style={styles.featureRow}>
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: `${feature.primary}1F` },
              ]}
            >
              <FontAwesomeIcon
                icon={feature.icon}
                size={15}
                color={feature.primary}
                secondaryColor={feature.secondary}
                secondaryOpacity={1}
              />
            </View>
            <Text style={styles.featureText}>{feature.label}</Text>
          </View>
        ))}
      </View>

      {/* How your free trial works — timeline (trust/anxiety reducer) */}
      <View style={styles.timeline}>
        {TIMELINE.map((step, i) => (
          <View key={step.when} style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View
                style={[
                  styles.timelineDot,
                  { backgroundColor: `${step.primary}1F` },
                ]}
              >
                <FontAwesomeIcon
                  icon={step.icon}
                  size={14}
                  color={step.primary}
                  secondaryColor={step.secondary}
                  secondaryOpacity={1}
                />
              </View>
              {i < TIMELINE.length - 1 && (
                <View style={styles.timelineConnector} />
              )}
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineWhen}>{step.when}</Text>
              <Text style={styles.timelineText}>{step.text}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Trust / social proof — real rating from PAYWALL_TRUST (shared w/ web). */}
      <View style={styles.trustLine}>
        <Text style={styles.trustLead}>Loved by families</Text>
        <FontAwesomeIcon
          icon={faStar}
          size={13}
          color={CRAYON.yellow.dark}
          secondaryColor={CRAYON.yellow.base}
          secondaryOpacity={1}
        />
        <Text style={styles.trustRating}>{PAYWALL_TRUST.averageRating}</Text>
        <Text style={styles.trustReviews}>
          ({PAYWALL_TRUST.reviewCount} reviews)
        </Text>
      </View>
    </>
  );

  // ── Shared action block: price anchor → primary CTA → secondary links →
  //    fine print. Phone pins this in the footer; iPad puts it in actionColumn.
  // Fetched but no package available (expected when RevenueCat has no offering
  // for the running bundle — e.g. the `.internal`/`.dev` preview/dev variants,
  // which aren't registered RC apps; only the prod bundle is. Resolves normally
  // on a real TestFlight/App Store build). Show a friendly note + a way past the
  // paywall rather than a dead, permanently-disabled "Start My Free Week".
  const offeringsUnavailable = !isLoadingOfferings && !targetPackage;

  const actionBlock = isLoadingOfferings ? (
    <View style={styles.loadingContainer}>
      <Spinner size={24} color="#E46444" />
    </View>
  ) : offeringsUnavailable ? (
    <View style={styles.loadingContainer}>
      <Text style={styles.unavailableText}>
        Plans aren&apos;t available right now. You can start coloring and
        upgrade later.
      </Text>
      <Pressable
        onPress={onComplete}
        accessibilityRole="button"
        accessibilityLabel="Continue to the app"
        style={styles.unavailableContinue}
      >
        <Text style={styles.unavailableContinueText}>Continue</Text>
      </Pressable>
    </View>
  ) : (
    <>
      {/* Plan + price anchor — price is bold so it reads as the offer anchor. */}
      {targetPackage && (
        <Animated.View
          entering={FadeIn.duration(400).delay(300)}
          style={styles.priceAnchor}
        >
          <FontAwesomeIcon
            icon={faRainbow}
            size={16}
            color="#F472B6"
            secondaryColor="#F9A8D4"
            secondaryOpacity={1}
          />
          <Text style={styles.priceAnchorPlan}>Rainbow Plan</Text>
          <Text style={styles.priceAnchorPrice}>{pricePerMonth}/mo</Text>
        </Animated.View>
      )}

      {/* Primary CTA — full-width, the visual hero, with the 3-pulse nudge. */}
      <Animated.View style={[styles.ctaPulseWrap, ctaPulseStyle]}>
        <Pressable
          style={({ pressed }) => [
            styles.trialButton,
            pressed && styles.trialButtonPressed,
            isLoading && styles.trialButtonDisabled,
          ]}
          onPress={handleStartTrial}
          disabled={isLoading || !targetPackage}
          accessibilityRole="button"
          accessibilityLabel="Start my free week"
        >
          {isLoading ? (
            <Spinner size={20} color="#FFFFFF" />
          ) : (
            <Text style={styles.trialButtonText}>Start My Free Week</Text>
          )}
        </Pressable>
      </Animated.View>

      {/* Secondary actions — one quiet row, both ethical escapes visible. */}
      <View style={styles.secondaryRow}>
        <Pressable
          style={styles.secondaryLink}
          onPress={handleSeeAllPlans}
          disabled={isLoading}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryLinkText}>See all plans</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryLink}
          onPress={onComplete}
          disabled={isLoading}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryLinkText}>Maybe later</Text>
        </Pressable>
      </View>

      {/* Fine print — no-surprise reassurance, read at tap-time. */}
      <Text style={styles.finePrint}>
        No charge today.{pricePerMonth ? ` Then ${pricePerMonth}/mo` : ""} after
        your free week. Cancel anytime in Settings. {PAYWALL_TRUST.guarantee}.
      </Text>
    </>
  );

  return (
    <View style={[styles.container, { width }]}>
      <Animated.View
        entering={FadeIn.duration(600)}
        style={[styles.content, isTablet && styles.contentTablet]}
      >
        {isTablet ? (
          // iPAD: two columns, vertically centered (unchanged architecture).
          <>
            <View style={styles.infoColumn}>{infoBlock}</View>
            <View style={styles.actionColumn}>{actionBlock}</View>
          </>
        ) : (
          // PHONE: ONE vertical scroll — the whole column flows in natural order
          // (crown → … → trust → price → CTA → links → fine print). flexGrow:1 +
          // space-between fills the screen with the CTA group near the bottom on
          // tall phones, and scrolls as one piece on short ones. No absolute
          // footer + no height measurement, so nothing can overlap (the old
          // sticky footer was pinned to a shrink-wrapped content box and floated
          // over the timeline).
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: insets.top + 12,
                paddingBottom: insets.bottom + 16,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoGroup}>{infoBlock}</View>
            <View style={styles.actionGroup}>{actionBlock}</View>
          </ScrollView>
        )}
      </Animated.View>

      {/* Parental Gate - rendered at this level for correct layering */}
      <ParentalGate
        visible={showParentalGate}
        onClose={handleParentalGateClose}
        onSuccess={handleParentalGateSuccess}
        title="Parent Verification"
        subtitle="Please verify you are a parent to start a subscription"
      />

      {/* "See All Plans" → full subscription plan grid. The user is a
          non-subscriber mid-onboarding, so this is always the
          subscription modal (never a top-up surface). */}
      <SubscriptionPaywallModal
        visible={showFullPaywall}
        onClose={handlePaywallClose}
        onSuccess={handlePaywallSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // flex:1 only — the phone path centers via the ScrollView content + footer,
  // the iPad path centers via contentTablet. No global center/padding here, so
  // tall content can scroll instead of overflow-clipping top + bottom.
  container: {
    flex: 1,
  },
  // Fill height so the inner ScrollView takes the remaining space and the footer
  // pins to the bottom. iPad overrides flexDirection to row via contentTablet.
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
  },
  // iPad: widen + lay the two columns side by side, vertically centered.
  contentTablet: {
    maxWidth: 760,
    flexDirection: "row",
    alignItems: "center",
    gap: 48,
    paddingHorizontal: 32,
  },
  infoColumn: {
    flex: 1,
    alignItems: "flex-start",
  },
  actionColumn: {
    flex: 1,
    alignItems: "stretch",
  },
  // Phone: ONE scroll holding the whole column. flexGrow:1 + space-between fills
  // the viewport with the info group at the top and the action group at the
  // bottom on tall phones, and scrolls as one piece on short phones.
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  // Top cluster — crown → headline → features → timeline → trust.
  infoGroup: {
    alignSelf: "stretch",
    alignItems: "center",
  },
  // Bottom cluster — price anchor → CTA → secondary links → fine print.
  // Full-width so the CTA stays a full-width hero; a min gap from the info group.
  actionGroup: {
    alignSelf: "stretch",
    marginTop: 14,
  },
  // Sized so the whole single-column paywall fits ABOVE the fold on a standard
  // phone (the CTA must be visible without scrolling). The crown + section
  // margins below are the reclaimed vertical budget.
  iconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(252, 211, 77, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  // On tablet the info column is left-aligned, so the crown sits left too.
  iconContainerTablet: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 16,
  },
  title: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 26,
    color: "#374151",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 32,
  },
  titleTablet: {
    textAlign: "left",
    fontSize: 32,
    lineHeight: 38,
  },
  description: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 16,
  },
  descriptionTablet: {
    textAlign: "left",
  },
  featuresList: {
    alignSelf: "stretch",
    marginBottom: 14,
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    fontFamily: "TondoTrial-Regular",
    fontSize: 16,
    color: "#374151",
  },
  // Trial timeline
  timeline: {
    alignSelf: "stretch",
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
  },
  timelineRail: {
    alignItems: "center",
    width: 34,
  },
  timelineDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineConnector: {
    flex: 1,
    width: 2,
    minHeight: 10,
    backgroundColor: "#E5E7EB",
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 10,
  },
  timelineWhen: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 15,
    color: "#374151",
  },
  timelineText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    color: "#6B7280",
    marginTop: 1,
    lineHeight: 18,
  },
  // Trust / rating line — closes the scroll body just before the footer.
  trustLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "center",
    marginTop: 2,
    marginBottom: 4,
  },
  trustLead: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    color: "#6B7280",
    marginRight: 2,
  },
  trustRating: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 13,
    color: "#374151",
  },
  trustReviews: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    color: "#9CA3AF",
  },
  // Plan + price anchor — sits directly above the CTA. Price is bold so it
  // reads as the offer anchor the CTA confirms.
  priceAnchor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(249, 168, 212, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 12,
  },
  priceAnchorPlan: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#6B7280",
  },
  priceAnchorPrice: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: "#374151",
  },
  ctaPulseWrap: {
    alignSelf: "stretch",
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  unavailableText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 15,
    color: "#7A6F66",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 14,
  },
  unavailableContinue: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    backgroundColor: "#E46444",
  },
  unavailableContinueText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#FFFFFF",
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
  // One quiet row: See all plans (left) · Maybe later (right). Both ≥44pt tall
  // for tap, demoted to text links so they don't compete with the CTA.
  secondaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  secondaryLink: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    minHeight: 44,
    justifyContent: "center",
  },
  secondaryLinkText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 15,
    color: "#9CA3AF",
  },
  finePrint: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 17,
    marginTop: 2,
  },
});

export default OnboardingPaywallSlide;
