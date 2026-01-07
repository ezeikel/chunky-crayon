import { useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
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
};

// Plan features for display
const PLAN_FEATURES: Record<"SPLASH" | "RAINBOW" | "SPARKLE", string[]> = {
  SPLASH: [
    "250 credits/month",
    "3 profiles",
    "Magic Brush",
    "Voice input",
    "Camera input",
  ],
  RAINBOW: [
    "500 credits/month",
    "5 profiles",
    "Everything in Splash",
    "Priority support",
    "Credit rollover",
  ],
  SPARKLE: [
    "1,000 credits/month",
    "10 profiles",
    "Everything in Rainbow",
    "Commercial use",
    "2x credit rollover",
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

const Paywall = ({ visible, onClose, onSuccess }: PaywallProps) => {
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

  // Handle purchase initiation (requires parental gate)
  const handlePurchasePress = useCallback((pkg: PurchasesPackage) => {
    setSelectedPackage(pkg);
    setPendingAction("purchase");
    setShowParentalGate(true);
  }, []);

  // Handle restore press (requires parental gate)
  const handleRestorePress = useCallback(() => {
    setPendingAction("restore");
    setShowParentalGate(true);
  }, []);

  // Execute purchase after parental gate success
  const handleParentalGateSuccess = useCallback(async () => {
    setShowParentalGate(false);

    if (pendingAction === "purchase" && selectedPackage) {
      try {
        await purchaseMutation.mutateAsync(selectedPackage);
        onSuccess?.();
        onClose();
      } catch (error) {
        // Error handled in mutation
      }
    } else if (pendingAction === "restore") {
      try {
        const customerInfo = await restoreMutation.mutateAsync();
        if (customerInfo.entitlements.active["premium"]) {
          onSuccess?.();
          onClose();
        }
      } catch (error) {
        // Error handled in mutation
      }
    }

    setPendingAction(null);
    setSelectedPackage(null);
  }, [
    pendingAction,
    selectedPackage,
    purchaseMutation,
    restoreMutation,
    onSuccess,
    onClose,
  ]);

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
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
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
                {(["RAINBOW", "SPLASH", "SPARKLE"] as const).map((planName) => {
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
                        <Text style={styles.planName}>{planName}</Text>
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
                              <Text style={styles.priceLabel}>Annual</Text>
                              <Text style={styles.priceAmount}>
                                {formatPackagePrice(annualPkg)}
                              </Text>
                              <Text style={styles.priceSubtext}>
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

                {/* Trial info */}
                <View style={styles.trialInfo}>
                  <Text style={styles.trialText}>
                    Start with a 7-day free trial. Cancel anytime.
                  </Text>
                </View>
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

            <Text style={styles.legalText}>
              Payment will be charged to your Apple ID account. Subscription
              automatically renews unless cancelled at least 24 hours before the
              end of the current period.
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
      </Modal>

      {/* Parental Gate */}
      <ParentalGate
        visible={showParentalGate}
        onClose={handleParentalGateClose}
        onSuccess={handleParentalGateSuccess}
        title="Parent Verification"
        subtitle="Please verify you are a parent to make this purchase"
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFAF5",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 16,
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
  },
  recommendedCard: {
    borderWidth: 2,
    borderColor: "#7C3AED",
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
    textTransform: "capitalize",
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
  trialInfo: {
    alignItems: "center",
    paddingVertical: 16,
  },
  trialText: {
    fontSize: 14,
    color: "#7C3AED",
    fontWeight: "500",
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
