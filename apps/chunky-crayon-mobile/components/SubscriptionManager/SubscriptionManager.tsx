import { useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faXmark,
  faCheck,
  faSparkles,
  faDroplet,
  faRainbow,
  faCoins,
  faArrowUpRight,
  faRotate,
  faCrown,
  faGem,
} from "@fortawesome/pro-solid-svg-icons";
import {
  useEntitlements,
  useRefreshEntitlements,
  getFormattedExpirationDate,
  type PlanName,
} from "@/hooks/useEntitlements";
import { useRestorePurchases } from "@/hooks/usePaywall";
import Paywall from "../Paywall";
import CreditPackModal from "../CreditPackModal";
import Spinner from "../Spinner/Spinner";

type SubscriptionManagerProps = {
  visible: boolean;
  onClose: () => void;
};

const PLAN_ICONS = {
  SPLASH: faDroplet,
  RAINBOW: faRainbow,
  SPARKLE: faSparkles,
};

const PLAN_COLORS = {
  SPLASH: "#7DD3FC",
  RAINBOW: "#F9A8D4",
  SPARKLE: "#FCD34D",
};

const PLAN_DISPLAY_NAMES: Record<PlanName, string> = {
  FREE: "Free",
  SPLASH: "Splash",
  RAINBOW: "Rainbow",
  SPARKLE: "Sparkle",
};

const PLAN_FEATURES_LIST: Record<"SPLASH" | "RAINBOW" | "SPARKLE", string[]> = {
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

const MANAGE_SUBSCRIPTION_URLS = {
  ios: "https://apps.apple.com/account/subscriptions",
  android: "https://play.google.com/store/account/subscriptions",
};

const SubscriptionManager = ({
  visible,
  onClose,
}: SubscriptionManagerProps) => {
  const { data: entitlements, isPending } = useEntitlements();
  const refreshEntitlements = useRefreshEntitlements();
  const restorePurchases = useRestorePurchases();

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [creditPackVisible, setCreditPackVisible] = useState(false);

  const hasSubscription = entitlements?.hasAccess ?? false;
  const plan = entitlements?.plan ?? "FREE";
  const credits = entitlements?.credits ?? 0;
  const expirationDate = getFormattedExpirationDate(entitlements);
  const isTopPlan = plan === "SPARKLE";

  const handleClose = useCallback(() => {
    refreshEntitlements();
    onClose();
  }, [refreshEntitlements, onClose]);

  const handleSubscribe = useCallback(() => {
    setPaywallVisible(true);
  }, []);

  const handleBuyCredits = useCallback(() => {
    setCreditPackVisible(true);
  }, []);

  // No parental gate needed — Settings screen already gates access
  const handleRestore = useCallback(() => {
    restorePurchases.mutate();
  }, [restorePurchases]);

  const handleManageSubscription = useCallback(() => {
    const url = Platform.select(MANAGE_SUBSCRIPTION_URLS);
    if (url) Linking.openURL(url);
  }, []);

  const handlePaywallClose = useCallback(() => {
    setPaywallVisible(false);
    refreshEntitlements();
  }, [refreshEntitlements]);

  const handleCreditPackClose = useCallback(() => {
    setCreditPackVisible(false);
    refreshEntitlements();
  }, [refreshEntitlements]);

  const renderStatusBadge = () => {
    if (!hasSubscription) return null;

    let bgColor = "#DEF7EC";
    let textColor = "#03543F";
    let label = "Active";

    if (entitlements?.isTrialing) {
      bgColor = "#E8DEFC";
      textColor = "#5B21B6";
      label = "Trial";
    } else if (entitlements?.isCancelled) {
      bgColor = "#FEF3C7";
      textColor = "#92400E";
      label = "Cancelled";
    } else if (entitlements?.status === "PAST_DUE") {
      bgColor = "#FEE2E2";
      textColor = "#991B1B";
      label = "Payment Issue";
    }

    return (
      <View style={[styles.badge, { backgroundColor: bgColor }]}>
        <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
      </View>
    );
  };

  const renderPlanCard = () => {
    const planColor =
      plan !== "FREE"
        ? PLAN_COLORS[plan as keyof typeof PLAN_COLORS]
        : "#9CA3AF";
    const planIcon =
      plan !== "FREE" ? PLAN_ICONS[plan as keyof typeof PLAN_ICONS] : faCrown;

    return (
      <View style={styles.planCard}>
        <View style={styles.planCardHeader}>
          <View
            style={[
              styles.planIconContainer,
              { backgroundColor: `${planColor}30` },
            ]}
          >
            <FontAwesomeIcon icon={planIcon} size={24} color={planColor} />
          </View>
          <View style={styles.planInfo}>
            <View style={styles.planNameRow}>
              <Text style={styles.planName}>
                {PLAN_DISPLAY_NAMES[plan]} Plan
              </Text>
              {renderStatusBadge()}
            </View>
            {hasSubscription && expirationDate && (
              <Text style={styles.planDetail}>
                {entitlements?.isCancelled ? "Access until" : "Renews"}{" "}
                {expirationDate}
              </Text>
            )}
            {!hasSubscription && (
              <Text style={styles.planDetail}>
                {entitlements ? "No active subscription" : ""}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.creditsRow}>
          <FontAwesomeIcon icon={faCoins} size={16} color="#F1AE7E" />
          <Text style={styles.creditsText}>
            {credits} credit{credits !== 1 ? "s" : ""} available
          </Text>
        </View>
      </View>
    );
  };

  const renderFeaturesList = () => {
    if (!hasSubscription || plan === "FREE") return null;
    const features =
      PLAN_FEATURES_LIST[plan as keyof typeof PLAN_FEATURES_LIST];
    if (!features) return null;

    return (
      <View style={styles.featuresCard}>
        <Text style={styles.featuresTitle}>Your Plan Includes</Text>
        {features.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <FontAwesomeIcon icon={faCheck} size={14} color="#22C55E" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Subscription & Credits</Text>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <FontAwesomeIcon icon={faXmark} size={20} color="#6B7280" />
          </Pressable>
        </View>

        {isPending ? (
          <View style={styles.loadingContainer}>
            <Spinner size={40} />
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {renderPlanCard()}

            {hasSubscription && renderFeaturesList()}

            {/* Action Buttons */}
            <View style={styles.actionsSection}>
              {!hasSubscription && (
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleSubscribe}
                >
                  <FontAwesomeIcon icon={faGem} size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Subscribe Now</Text>
                </Pressable>
              )}

              {hasSubscription && !isTopPlan && (
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleSubscribe}
                >
                  <FontAwesomeIcon
                    icon={faArrowUpRight}
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.primaryButtonText}>Upgrade Plan</Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleBuyCredits}
              >
                <FontAwesomeIcon icon={faCoins} size={18} color="#E46444" />
                <Text style={styles.secondaryButtonText}>Buy Credits</Text>
              </Pressable>

              {hasSubscription && (
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleManageSubscription}
                >
                  <FontAwesomeIcon
                    icon={faArrowUpRight}
                    size={18}
                    color="#E46444"
                  />
                  <Text style={styles.secondaryButtonText}>
                    Manage Subscription
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Restore Purchases */}
            <Pressable
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={restorePurchases.isPending}
            >
              {restorePurchases.isPending ? (
                <Spinner size={16} color="#9CA3AF" />
              ) : (
                <>
                  <FontAwesomeIcon icon={faRotate} size={14} color="#9CA3AF" />
                  <Text style={styles.restoreText}>Restore Purchases</Text>
                </>
              )}
            </Pressable>

            {/* Legal Footer */}
            <Text style={styles.legalText}>
              Subscriptions auto-renew unless cancelled at least 24 hours before
              the end of the current period. Manage or cancel anytime in your{" "}
              {Platform.OS === "ios" ? "App Store" : "Play Store"} settings.
            </Text>
          </ScrollView>
        )}
      </View>

      {/* Sub-modals rendered inside parent Modal so they layer correctly on iOS */}
      <Paywall
        visible={paywallVisible}
        onClose={handlePaywallClose}
        skipParentalGate
      />
      <CreditPackModal
        visible={creditPackVisible}
        onClose={handleCreditPackClose}
        skipParentalGate
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFAF5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 20,
    color: "#374151",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  // Plan Card
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  planCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  planInfo: {
    flex: 1,
  },
  planNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planName: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 20,
    color: "#374151",
  },
  planDetail: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 12,
  },
  creditsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  creditsText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#374151",
  },
  // Features Card
  featuresCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  featuresTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#374151",
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  featureText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 15,
    color: "#374151",
  },
  // Actions
  actionsSection: {
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#E46444",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 17,
    color: "#FFFFFF",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E46444",
  },
  secondaryButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 17,
    color: "#E46444",
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  // Restore
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginBottom: 16,
  },
  restoreText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#9CA3AF",
  },
  // Legal
  legalText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
});

export default SubscriptionManager;
