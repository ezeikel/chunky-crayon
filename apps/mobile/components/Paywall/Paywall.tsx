import { useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faXmark,
  faCrown,
  faCheck,
  faSparkles,
  faDroplet,
  faRainbow,
  faRotate,
} from "@fortawesome/pro-solid-svg-icons";
import { PurchasesPackage } from "react-native-purchases";
import {
  useOfferings,
  usePurchase,
  useRestorePurchases,
  getPackageDisplayName,
  getPackagePlanName,
  isAnnualPackage,
  formatPackagePrice,
  formatAnnualMonthlyPrice,
} from "@/hooks/usePaywall";
import ParentalGate from "../ParentalGate";

type PaywallProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Skip parental gate (e.g. when already behind a gated screen like Settings) */
  skipParentalGate?: boolean;
};

// Plan taglines matching web pricing page
const PLAN_TAGLINES = {
  SPLASH: "Great for occasional creators",
  RAINBOW: "Perfect for creative families",
  SPARKLE: "For serious creators",
};

// Plan features aligned with web pricing page
const PLAN_FEATURES: Record<"SPLASH" | "RAINBOW" | "SPARKLE", string[]> = {
  SPLASH: [
    "250 credits/month (~50 pages)",
    "All platform features",
    "Credits reset monthly",
  ],
  RAINBOW: [
    "500 credits/month (~100 pages)",
    "All platform features",
    "Unused credits roll over (1 month)",
    "Priority support",
  ],
  SPARKLE: [
    "1,000 credits/month (~200 pages)",
    "All platform features",
    "Extended rollover (2 months)",
    "Commercial use license",
  ],
};

const PLAN_ICONS = {
  SPLASH: faDroplet,
  RAINBOW: faRainbow,
  SPARKLE: faSparkles,
};

const PLAN_COLORS = {
  SPLASH: "#7DD3FC", // sky-300
  RAINBOW: "#F9A8D4", // pink-300
  SPARKLE: "#FCD34D", // amber-300
};

const PLAN_DISPLAY_NAMES = {
  SPLASH: "Splash",
  RAINBOW: "Rainbow",
  SPARKLE: "Sparkle",
};

const Paywall = ({
  visible,
  onClose,
  onSuccess,
  skipParentalGate = false,
}: PaywallProps) => {
  const insets = useSafeAreaInsets();
  const { data: offering, isLoading: isLoadingOfferings } = useOfferings();
  const purchaseMutation = usePurchase();
  const restoreMutation = useRestorePurchases();

  const [selectedPackage, setSelectedPackage] =
    useState<PurchasesPackage | null>(null);
  const [showParentalGate, setShowParentalGate] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "purchase" | "restore" | null
  >(null);

  // Group packages by plan
  const packagesByPlan = useCallback(() => {
    if (!offering?.availablePackages) return {};

    const grouped: Record<string, PurchasesPackage[]> = {};

    offering.availablePackages.forEach((pkg) => {
      const planName = getPackagePlanName(pkg);
      if (!grouped[planName]) {
        grouped[planName] = [];
      }
      grouped[planName].push(pkg);
    });

    return grouped;
  }, [offering]);

  // Execute a purchase directly (no gate)
  const executePurchase = useCallback(
    async (pkg: PurchasesPackage) => {
      try {
        await purchaseMutation.mutateAsync(pkg);
        onSuccess?.();
        onClose();
      } catch (error) {
        // Error handled in mutation
      }
    },
    [purchaseMutation, onSuccess, onClose],
  );

  // Execute a restore directly (no gate)
  const executeRestore = useCallback(async () => {
    try {
      const customerInfo = await restoreMutation.mutateAsync();
      if (customerInfo.entitlements.active["premium"]) {
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      // Error handled in mutation
    }
  }, [restoreMutation, onSuccess, onClose]);

  // Handle purchase initiation
  const handlePurchasePress = useCallback(
    (pkg: PurchasesPackage) => {
      if (skipParentalGate) {
        executePurchase(pkg);
        return;
      }
      setSelectedPackage(pkg);
      setPendingAction("purchase");
      setShowParentalGate(true);
    },
    [skipParentalGate, executePurchase],
  );

  // Handle restore press
  const handleRestorePress = useCallback(() => {
    if (skipParentalGate) {
      executeRestore();
      return;
    }
    setPendingAction("restore");
    setShowParentalGate(true);
  }, [skipParentalGate, executeRestore]);

  // Execute action after parental gate success
  const handleParentalGateSuccess = useCallback(async () => {
    setShowParentalGate(false);

    if (pendingAction === "purchase" && selectedPackage) {
      await executePurchase(selectedPackage);
    } else if (pendingAction === "restore") {
      await executeRestore();
    }

    setPendingAction(null);
    setSelectedPackage(null);
  }, [pendingAction, selectedPackage, executePurchase, executeRestore]);

  const handleParentalGateClose = useCallback(() => {
    setShowParentalGate(false);
    setPendingAction(null);
    setSelectedPackage(null);
  }, []);

  const isLoading = purchaseMutation.isPending || restoreMutation.isPending;
  const grouped = packagesByPlan();

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={onClose}
      >
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <FontAwesomeIcon icon={faXmark} size={24} color="#64748B" />
            </Pressable>
            <View style={styles.titleContainer}>
              <FontAwesomeIcon icon={faCrown} size={28} color="#FCD34D" />
              <Text style={styles.title}>Unlock Premium</Text>
            </View>
            <Text style={styles.subtitle}>
              Create unlimited coloring pages with Magic Brush, voice input, and
              more!
            </Text>
            <View style={styles.trialBanner}>
              <Text style={styles.trialBannerText}>
                7-day free trial on all plans — cancel anytime
              </Text>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {isLoadingOfferings ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text style={styles.loadingText}>Loading plans...</Text>
              </View>
            ) : (
              <>
                {/* Plan cards */}
                {(["SPLASH", "RAINBOW", "SPARKLE"] as const).map((planName) => {
                  const packages = grouped[planName];
                  if (!packages?.length) return null;

                  const monthlyPkg = packages.find((p) => !isAnnualPackage(p));
                  const annualPkg = packages.find((p) => isAnnualPackage(p));
                  const displayPkg = annualPkg || monthlyPkg;
                  if (!displayPkg) return null;

                  const isRecommended = planName === "RAINBOW";

                  return (
                    <View
                      key={planName}
                      style={[
                        styles.planCard,
                        isRecommended && styles.recommendedCard,
                      ]}
                    >
                      {isRecommended && (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedText}>
                            Most Popular
                          </Text>
                        </View>
                      )}

                      <View style={styles.planHeader}>
                        <View
                          style={[
                            styles.planIconContainer,
                            { backgroundColor: PLAN_COLORS[planName] },
                          ]}
                        >
                          <FontAwesomeIcon
                            icon={PLAN_ICONS[planName]}
                            size={20}
                            color="#FFFFFF"
                          />
                        </View>
                        <View>
                          <Text style={styles.planName}>
                            {PLAN_DISPLAY_NAMES[planName]}
                          </Text>
                          <Text style={styles.planTagline}>
                            {PLAN_TAGLINES[planName]}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.features}>
                        {PLAN_FEATURES[planName].map((feature, index) => (
                          <View key={index} style={styles.featureRow}>
                            <FontAwesomeIcon
                              icon={faCheck}
                              size={14}
                              color="#10B981"
                            />
                            <Text style={styles.featureText}>{feature}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Pricing options */}
                      <View style={styles.pricingContainer}>
                        {annualPkg && (
                          <Pressable
                            style={[styles.priceButton, styles.annualButton]}
                            onPress={() => handlePurchasePress(annualPkg)}
                            disabled={isLoading}
                          >
                            <View style={styles.priceButtonContent}>
                              <Text
                                style={[
                                  styles.priceLabel,
                                  { color: "rgba(255,255,255,0.8)" },
                                ]}
                              >
                                Annual
                              </Text>
                              <Text
                                style={[
                                  styles.priceAmount,
                                  { color: "#FFFFFF" },
                                ]}
                              >
                                {formatPackagePrice(annualPkg)}
                              </Text>
                              <Text
                                style={[
                                  styles.priceSubtext,
                                  { color: "rgba(255,255,255,0.7)" },
                                ]}
                              >
                                {formatAnnualMonthlyPrice(annualPkg)}
                              </Text>
                            </View>
                            <View style={styles.saveBadge}>
                              <Text style={styles.saveText}>Save 17%</Text>
                            </View>
                          </Pressable>
                        )}

                        {monthlyPkg && (
                          <Pressable
                            style={styles.priceButton}
                            onPress={() => handlePurchasePress(monthlyPkg)}
                            disabled={isLoading}
                          >
                            <View style={styles.priceButtonContent}>
                              <Text style={styles.priceLabel}>Monthly</Text>
                              <Text style={styles.priceAmount}>
                                {formatPackagePrice(monthlyPkg)}
                              </Text>
                              <Text style={styles.priceSubtext}>/month</Text>
                            </View>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* Spacer for bottom scroll padding */}
                <View style={{ height: 8 }} />
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleRestorePress}
              disabled={isLoading}
              style={styles.restoreButton}
            >
              <FontAwesomeIcon icon={faRotate} size={16} color="#64748B" />
              <Text style={styles.restoreText}>Restore Purchases</Text>
            </Pressable>

            <View style={styles.legalLinks}>
              <Pressable
                onPress={() =>
                  Linking.openURL("https://chunkycrayon.com/terms")
                }
              >
                <Text style={styles.legalLink}>Terms of Service</Text>
              </Pressable>
              <Text style={styles.legalDot}>&middot;</Text>
              <Pressable
                onPress={() =>
                  Linking.openURL("https://chunkycrayon.com/privacy")
                }
              >
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </Pressable>
            </View>

            <Text style={styles.legalText}>
              Payment will be charged to your{" "}
              {Platform.OS === "ios" ? "Apple ID" : "Google Play"} account.
              Subscription automatically renews unless cancelled at least 24
              hours before the end of the current period.
            </Text>
          </View>

          {/* Loading overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingOverlayText}>Processing...</Text>
            </View>
          )}
        </View>

        {/* Parental Gate rendered inside Modal so it layers correctly on iOS */}
        <ParentalGate
          visible={showParentalGate}
          onClose={handleParentalGateClose}
          onSuccess={handleParentalGateSuccess}
          title="Parent Verification"
          subtitle="Please verify you are a parent to make this purchase"
        />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFAF5",
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 16,
  },
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "visible",
  },
  recommendedCard: {
    borderWidth: 2,
    borderColor: "#7C3AED",
    marginTop: 12,
  },
  recommendedBadge: {
    position: "absolute",
    top: -12,
    left: "50%",
    marginLeft: -50,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  planIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  planName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  planTagline: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  features: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: "#475569",
  },
  pricingContainer: {
    gap: 10,
  },
  priceButton: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  annualButton: {
    backgroundColor: "#7C3AED",
  },
  priceButtonContent: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 2,
  },
  priceSubtext: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  saveBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  trialBanner: {
    backgroundColor: "#F0EBFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
  },
  trialBannerText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#7C3AED",
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginBottom: 16,
  },
  restoreText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  legalLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  legalLink: {
    fontSize: 13,
    color: "#7C3AED",
    fontWeight: "500",
  },
  legalDot: {
    fontSize: 13,
    color: "#94A3B8",
  },
  legalText: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlayText: {
    color: "#FFFFFF",
    marginTop: 12,
    fontSize: 16,
  },
});

export default Paywall;
