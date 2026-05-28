import { useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faXmark, faStar, faCheck } from "@fortawesome/pro-solid-svg-icons";
import { PurchasesPackage } from "react-native-purchases";
import {
  useOfferings,
  usePurchase,
  useRestorePurchases,
  isAnnualPackage,
  formatPackagePrice,
  formatAnnualMonthlyPrice,
  getPackagePlanName,
} from "@/hooks/usePaywall";

/**
 * SubscriptionPaywallModal — the primary mobile paywall.
 *
 * Renders the Splash / Rainbow / Sparkle plan grid with a monthly /
 * yearly toggle. Tap a plan → RevenueCat IAP via the existing
 * `usePurchase()` mutation. Restore-purchases link at the footer for
 * users coming back on a new device.
 *
 * Plans are pulled from RevenueCat's current offering (which the
 * existing `useOfferings()` hook fetches). Each plan needs both a
 * monthly + annual package configured against the same product family
 * (RevenueCat aliases `$rc_monthly` / `$rc_annual` for the default
 * tier; explicit `splash_monthly` / `splash_annual` etc. for the other
 * two — see ~/.claude/plans/mobile-paywall-scaffold.md).
 *
 * Prices come from the store (App Store / Play Store via RevenueCat).
 * The only thing hardcoded is which plan gets the "Most Popular" badge
 * (Rainbow — matches CC web). Credit grants per plan come from
 * `product.metadata.credits` first, fall back to a built-in map.
 * Same pattern as TopUpPackModal / ColorAsYouGoModal.
 */

type SubscriptionPaywallModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /**
   * Subscriptions don't require the parental gate today — Apple's
   * native purchase sheet already requires Face ID / passcode. Prop is
   * accepted for parity with the other paywall modals and may be wired
   * up later if we want a kid-friendly soft gate.
   */
  skipParentalGate?: boolean;
};

type BillingCycle = "monthly" | "annual";

const CREDITS_PER_PLAN_FALLBACK: Record<string, number> = {
  SPLASH: 250,
  RAINBOW: 500,
  SPARKLE: 1000,
};

function getCreditsForPlan(pkg: PurchasesPackage): number {
  const meta = (
    pkg.product as PurchasesPackage["product"] & {
      metadata?: Record<string, unknown>;
    }
  ).metadata;
  const fromMetadata = meta?.credits;
  if (fromMetadata != null) {
    const parsed = Number(fromMetadata);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return CREDITS_PER_PLAN_FALLBACK[getPackagePlanName(pkg)] ?? 0;
}

const PLAN_DISPLAY_ORDER = ["SPLASH", "RAINBOW", "SPARKLE"] as const;

const PLAN_COPY: Record<
  string,
  { title: string; tagline: string; isBestValue: boolean }
> = {
  SPLASH: {
    title: "Splash",
    tagline: "For casual colorers and young artists",
    isBestValue: false,
  },
  RAINBOW: {
    title: "Rainbow",
    tagline: "Fun for the whole family",
    isBestValue: true,
  },
  SPARKLE: {
    title: "Sparkle",
    tagline: "For color enthusiasts",
    isBestValue: false,
  },
};

const SubscriptionPaywallModal = ({
  visible,
  onClose,
  onSuccess,
}: SubscriptionPaywallModalProps) => {
  const insets = useSafeAreaInsets();
  const { data: offering, isLoading } = useOfferings();
  const purchaseMutation = usePurchase();
  const restoreMutation = useRestorePurchases();

  const [cycle, setCycle] = useState<BillingCycle>("annual");

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

  const handlePurchase = useCallback(
    async (pkg: PurchasesPackage) => {
      try {
        await purchaseMutation.mutateAsync(pkg);
        onSuccess?.();
        onClose();
      } catch {
        // usePurchase shows the toast on its own; modal stays open so
        // the user can try a different plan.
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
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <FontAwesomeIcon icon={faXmark} size={24} color="#64748B" />
          </Pressable>
          <Text style={styles.title}>Unlock unlimited creativity</Text>
          <Text style={styles.subtitle}>
            Choose a plan and create as many coloring pages as you like.
          </Text>

          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => setCycle("monthly")}
              style={[
                styles.toggleButton,
                cycle === "monthly" && styles.toggleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  cycle === "monthly" && styles.toggleTextActive,
                ]}
              >
                Monthly
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setCycle("annual")}
              style={[
                styles.toggleButton,
                cycle === "annual" && styles.toggleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  cycle === "annual" && styles.toggleTextActive,
                ]}
              >
                Yearly
              </Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>Save 17%</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={styles.loadingText}>Loading plans…</Text>
            </View>
          ) : (
            <View style={styles.plansContainer}>
              {PLAN_DISPLAY_ORDER.map((planName) => {
                const plans = plansByName[planName];
                const pkg = cycle === "annual" ? plans?.annual : plans?.monthly;
                if (!pkg) return null;

                const copy = PLAN_COPY[planName];
                const credits = getCreditsForPlan(pkg);
                const annualMonthlyPrice = formatAnnualMonthlyPrice(pkg);

                return (
                  <Pressable
                    key={planName}
                    style={[
                      styles.planCard,
                      copy.isBestValue && styles.bestValuePlanCard,
                    ]}
                    onPress={() => handlePurchase(pkg)}
                    disabled={isPurchasing}
                  >
                    {copy.isBestValue && (
                      <View style={styles.bestValueBadge}>
                        <FontAwesomeIcon
                          icon={faStar}
                          size={10}
                          color="#FFFFFF"
                        />
                        <Text style={styles.bestValueText}>Most Popular</Text>
                      </View>
                    )}

                    <Text style={styles.planTitle}>{copy.title}</Text>
                    <Text style={styles.planTagline}>{copy.tagline}</Text>

                    <View style={styles.planPriceRow}>
                      <Text style={styles.planPrice}>
                        {formatPackagePrice(pkg)}
                      </Text>
                      <Text style={styles.planCycle}>
                        /{cycle === "annual" ? "year" : "month"}
                      </Text>
                    </View>
                    {annualMonthlyPrice && (
                      <Text style={styles.planEffectivePrice}>
                        {annualMonthlyPrice}
                      </Text>
                    )}

                    <View style={styles.planFeatureRow}>
                      <FontAwesomeIcon
                        icon={faCheck}
                        size={14}
                        color="#22C55E"
                      />
                      <Text style={styles.planFeatureText}>
                        {credits} credits / month
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Pressable
            onPress={handleRestore}
            style={styles.restoreButton}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color="#7A6F66" />
            ) : (
              <Text style={styles.restoreText}>Restore purchases</Text>
            )}
          </Pressable>

          <Text style={styles.legalText}>
            Subscriptions renew automatically. Cancel anytime in{" "}
            <Text style={styles.legalBold}>Settings</Text>.
          </Text>
        </ScrollView>

        {isPurchasing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
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
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  closeButton: {
    position: "absolute",
    top: 8,
    right: 12,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 26,
    color: "#3D2C1E",
    textAlign: "center",
    marginTop: 8,
  },
  subtitle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 15,
    color: "#6B5344",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: "#F3EBE0",
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginTop: 8,
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
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 16,
  },
  plansContainer: {
    gap: 12,
  },
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: "#F5EDE6",
    gap: 6,
  },
  bestValuePlanCard: {
    borderColor: "#7C3AED",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  bestValueBadge: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    backgroundColor: "#7C3AED",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  bestValueText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  planTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 20,
    color: "#3D2C1E",
  },
  planTagline: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    color: "#6B5344",
  },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 6,
  },
  planPrice: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 26,
    color: "#3D2C1E",
  },
  planCycle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#6B5344",
  },
  planEffectivePrice: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 12,
    color: "#7A6F66",
  },
  planFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  planFeatureText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#3D2C1E",
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
  restoreButton: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
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
