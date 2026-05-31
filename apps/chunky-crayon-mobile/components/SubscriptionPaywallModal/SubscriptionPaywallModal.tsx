import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faXmark, faShieldCheck } from "@fortawesome/pro-solid-svg-icons";
import { PurchasesPackage } from "react-native-purchases";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import SquishyPressable from "@/components/SquishyPressable";
import Spinner from "@/components/Spinner/Spinner";
import {
  useOfferings,
  usePurchase,
  useRestorePurchases,
  isAnnualPackage,
  getPackagePlanName,
} from "@/hooks/usePaywall";
import {
  PLAN_DISPLAY_ORDER,
  PLAN_DISPLAY_NAMES,
  RECOMMENDED_PLAN,
  PAYWALL_TRUST,
  getCreditsForPlan,
  type PlanKey,
} from "@/lib/paywall/plans";
import { formatPackagePrice } from "@/hooks/usePaywall";
import PaywallHero from "./PaywallHero";
import PaywallSocialProof from "./PaywallSocialProof";
import PlanRow from "./PlanRow";

/**
 * SubscriptionPaywallModal — the primary mobile paywall.
 *
 * Composition (top → bottom, Duolingo-style — no dead space): a fanned
 * coloring-page hero so the parent sees the product first; the headline;
 * quantified social proof + rotating parent testimonials; a
 * monthly/yearly toggle; three compact selectable PlanRows (Splash /
 * Rainbow / Sparkle, Rainbow pre-selected + flagged Most Popular); then
 * ONE big "Start 7-day free trial" CTA that buys the selected plan, with
 * trial microcopy + a money-back guarantee; and a restore + legal footer.
 * The body fades + rises in on open behind the hero fan.
 *
 * Plans come from RevenueCat's current offering (`useOfferings`); tapping
 * a card runs the IAP via `usePurchase`. ALL plan copy + trust stats live
 * in the shared `lib/paywall/plans` single source of truth — this file is
 * orchestration only. The hero art is bundled locally (paywall-assets),
 * never fetched at runtime.
 */

type SubscriptionPaywallModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /**
   * Subscriptions don't require the parental gate today — Apple's native
   * purchase sheet already requires Face ID / passcode. Accepted for
   * parity with the other paywall modals; may wire a soft gate later.
   */
  skipParentalGate?: boolean;
};

type BillingCycle = "monthly" | "annual";

const SubscriptionPaywallModal = ({
  visible,
  onClose,
  onSuccess,
}: SubscriptionPaywallModalProps) => {
  const insets = useSafeAreaInsets();
  const { data: offering } = useOfferings();
  const purchaseMutation = usePurchase();
  const restoreMutation = useRestorePurchases();

  const [cycle, setCycle] = useState<BillingCycle>("annual");
  // Which plan the rows have selected — the single bottom CTA buys this
  // one. Defaults to the recommended plan (Rainbow) so the highest-LTV
  // option is pre-selected, matching the Duolingo / Universe pattern.
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(RECOMMENDED_PLAN);

  // Staggered body entrance — fades + rises in just after the hero fan
  // springs open, so the eye lands hero → copy → plans.
  const bodyProgress = useSharedValue(0);
  useEffect(() => {
    if (visible) {
      bodyProgress.value = 0;
      bodyProgress.value = withDelay(
        220,
        withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
      );
    }
  }, [visible, bodyProgress]);

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: bodyProgress.value,
    transform: [{ translateY: (1 - bodyProgress.value) * 18 }],
  }));

  const plansByName: Record<
    string,
    { monthly?: PurchasesPackage; annual?: PurchasesPackage }
  > = {};
  for (const pkg of offering?.availablePackages ?? []) {
    const plan = getPackagePlanName(pkg);
    if (!plansByName[plan]) plansByName[plan] = {};
    if (isAnnualPackage(pkg)) plansByName[plan].annual = pkg;
    else plansByName[plan].monthly = pkg;
  }

  // The package the single bottom CTA will buy: the selected plan at the
  // current billing cycle.
  const selectedPlans = plansByName[selectedPlan];
  const selectedPkg =
    cycle === "annual" ? selectedPlans?.annual : selectedPlans?.monthly;

  // Whether any plan has a package for the current cycle — drives the
  // loader-vs-rows branch so an errored/empty offering shows the loader,
  // never a blank gap.
  const hasPlans = PLAN_DISPLAY_ORDER.some((planKey) => {
    const plans = plansByName[planKey];
    return cycle === "annual" ? plans?.annual : plans?.monthly;
  });

  const handlePurchase = useCallback(
    async (pkg: PurchasesPackage) => {
      try {
        await purchaseMutation.mutateAsync(pkg);
        onSuccess?.();
        onClose();
      } catch {
        // usePurchase shows the toast; modal stays open to retry.
      }
    },
    [purchaseMutation, onSuccess, onClose],
  );

  const handleRestore = useCallback(async () => {
    try {
      await restoreMutation.mutateAsync();
    } catch {
      // useRestorePurchases handles its own toasts.
    }
  }, [restoreMutation]);

  const isPurchasing = purchaseMutation.isPending;
  const isRestoring = restoreMutation.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Close button floats over the hero so the hero owns the top. */}
        <SquishyPressable
          onPress={onClose}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          style={[styles.closeButton, { top: insets.top + 8 }]}
        >
          <View style={styles.closeCircle}>
            <FontAwesomeIcon icon={faXmark} size={20} color="#6B5344" />
          </View>
        </SquishyPressable>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero — fanned coloring pages, springs in on each open. */}
          <PaywallHero play={visible} />

          <Animated.View style={[styles.body, bodyStyle]}>
            <Text style={styles.title}>Unlock unlimited coloring</Text>
            <Text style={styles.subtitle}>
              Make as many pages as they like. Print them or color on screen.
            </Text>

            <PaywallSocialProof />

            {/* Monthly / yearly toggle + trial banner. */}
            <View style={styles.toggleRow}>
              {(["monthly", "annual"] as BillingCycle[]).map((key) => {
                const active = cycle === key;
                return (
                  <SquishyPressable
                    key={key}
                    onPress={() => setCycle(key)}
                    scaleTo={0.96}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={styles.toggleItem}
                  >
                    <View
                      style={[
                        styles.toggleButton,
                        active && styles.toggleButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.toggleText,
                          active && styles.toggleTextActive,
                        ]}
                      >
                        {key === "monthly" ? "Monthly" : "Yearly"}
                      </Text>
                      {key === "annual" && (
                        <View style={styles.saveBadge}>
                          <Text style={styles.saveBadgeText}>
                            2 months free
                          </Text>
                        </View>
                      )}
                    </View>
                  </SquishyPressable>
                );
              })}
            </View>

            {/* Compact selectable plan rows. Show the loader whenever
                there are no plans to render yet — loading OR an
                errored/empty offering — so we never leave a blank gap
                (RevenueCat can resolve to error with no data). */}
            {hasPlans ? (
              <View style={styles.plans}>
                {PLAN_DISPLAY_ORDER.map((planKey: PlanKey) => {
                  const plans = plansByName[planKey];
                  const pkg =
                    cycle === "annual" ? plans?.annual : plans?.monthly;
                  if (!pkg) return null;
                  return (
                    <PlanRow
                      key={planKey}
                      planKey={planKey}
                      pkg={pkg}
                      cycle={cycle}
                      credits={getCreditsForPlan(pkg)}
                      isBestValue={planKey === RECOMMENDED_PLAN}
                      isSelected={selectedPlan === planKey}
                      onPress={() => setSelectedPlan(planKey)}
                    />
                  );
                })}
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <Spinner size={36} color="#E46444" />
                <Text style={styles.loadingText}>Loading plans…</Text>
              </View>
            )}

            {/* ONE big trial-framed CTA — buys the selected plan. */}
            {hasPlans && selectedPkg && (
              <View style={styles.ctaBlock}>
                <SquishyPressable
                  onPress={() => handlePurchase(selectedPkg)}
                  disabled={isPurchasing}
                  scaleTo={0.97}
                  accessibilityRole="button"
                  accessibilityLabel={`Start 7-day free trial of ${PLAN_DISPLAY_NAMES[selectedPlan]}`}
                  style={styles.ctaPressable}
                >
                  <View style={styles.cta}>
                    <Text style={styles.ctaText}>Start 7-day free trial</Text>
                  </View>
                </SquishyPressable>
                <Text style={styles.ctaMicrocopy}>
                  Then {formatPackagePrice(selectedPkg)}/
                  {cycle === "annual" ? "year" : "month"}. Cancel any time
                  before then.
                </Text>
                <View style={styles.guaranteeRow}>
                  <FontAwesomeIcon
                    icon={faShieldCheck}
                    size={14}
                    color="#E46444"
                  />
                  <Text style={styles.guaranteeText}>
                    {PAYWALL_TRUST.guarantee}
                  </Text>
                </View>
              </View>
            )}

            <SquishyPressable
              onPress={handleRestore}
              disabled={isRestoring}
              scaleTo={0.96}
              accessibilityRole="button"
              accessibilityLabel="Restore purchases"
              style={styles.restoreButton}
            >
              {isRestoring ? (
                <Spinner size={18} color="#7A6F66" />
              ) : (
                <Text style={styles.restoreText}>Restore purchases</Text>
              )}
            </SquishyPressable>

            <Text style={styles.legalText}>
              Subscriptions renew automatically. Cancel any time in{" "}
              <Text style={styles.legalBold}>Settings</Text>.
            </Text>

            <View style={styles.legalLinks}>
              <SquishyPressable
                onPress={() =>
                  Linking.openURL("https://chunkycrayon.com/terms")
                }
                scaleTo={0.94}
                accessibilityRole="link"
                accessibilityLabel="Terms of Service"
              >
                <Text style={styles.legalLink}>Terms of Service</Text>
              </SquishyPressable>
              <Text style={styles.legalDot}>·</Text>
              <SquishyPressable
                onPress={() =>
                  Linking.openURL("https://chunkycrayon.com/privacy")
                }
                scaleTo={0.94}
                accessibilityRole="link"
                accessibilityLabel="Privacy Policy"
              >
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </SquishyPressable>
            </View>
          </Animated.View>
        </ScrollView>

        {isPurchasing && (
          <View style={styles.loadingOverlay}>
            <Spinner size={36} color="#FFFFFF" />
            <Text style={styles.loadingOverlayText}>Processing…</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFAF5",
  },
  closeButton: {
    // `top` is set inline as insets.top + 8 so the X clears the status
    // bar (absolute children sit in the border box, above the container's
    // safe-area paddingTop, so a fixed top would collide with the clock /
    // battery).
    position: "absolute",
    right: 12,
    zIndex: 10,
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(67,52,45,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  body: {
    gap: 16,
    marginTop: 12,
  },
  title: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 26,
    color: "#3D2C1E",
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 15,
    color: "#6B5344",
    textAlign: "center",
    paddingHorizontal: 16,
    marginTop: -8,
  },
  toggleRow: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: "#F3EBE0",
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  toggleItem: {
    borderRadius: 999,
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toggleButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: "#7A6F66",
  },
  toggleTextActive: {
    color: "#3D2C1E",
  },
  saveBadge: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  saveBadgeText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  plans: {
    gap: 14,
    marginTop: 4,
  },
  ctaBlock: {
    gap: 10,
    marginTop: 4,
  },
  ctaPressable: {
    width: "100%",
  },
  cta: {
    backgroundColor: "#E46444",
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D04725",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
  },
  ctaText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 18,
    color: "#FFFFFF",
  },
  ctaMicrocopy: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 12,
    color: "#7A6F66",
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#7A6F66",
  },
  guaranteeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  guaranteeText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 13,
    color: "#6B5344",
  },
  restoreButton: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: "center",
  },
  restoreText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: "#7A6F66",
    textDecorationLine: "underline",
  },
  legalText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  legalBold: {
    fontFamily: "TondoTrial-Bold",
    color: "#7A6F66",
  },
  legalLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  legalLink: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 13,
    color: "#72625A",
  },
  legalDot: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingOverlayText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
});

export default SubscriptionPaywallModal;
