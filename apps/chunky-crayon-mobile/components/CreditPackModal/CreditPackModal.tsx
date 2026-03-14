import { useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faXmark, faCoins, faStar } from "@fortawesome/pro-solid-svg-icons";
import { PurchasesPackage } from "react-native-purchases";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Purchases from "react-native-purchases";
import ParentalGate from "../ParentalGate";
import { useRefreshEntitlements } from "@/hooks/useEntitlements";

type CreditPackModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Skip parental gate (e.g. when already behind a gated screen like Settings) */
  skipParentalGate?: boolean;
};

// Credit amounts per product
const CREDIT_AMOUNTS: Record<string, number> = {
  credits_100_v1: 100,
  credits_500_v1: 500,
  credits_1000_v1: 1000,
};

// Hook to fetch credit packs offering
function useCreditPacksOffering() {
  return useQuery({
    queryKey: ["revenuecat", "creditPacks"],
    queryFn: async () => {
      const offerings = await Purchases.getOfferings();
      return offerings.all["credits"] ?? null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to purchase a credit pack
function usePurchaseCreditPack() {
  const queryClient = useQueryClient();
  const refreshEntitlements = useRefreshEntitlements();

  return useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    },
    onSuccess: () => {
      // Refresh entitlements to get updated credit count
      refreshEntitlements();
      queryClient.invalidateQueries({ queryKey: ["revenuecat"] });
    },
  });
}

// Format price for display
function formatPrice(pkg: PurchasesPackage): string {
  return pkg.product.priceString;
}

// Get credit amount from package
function getCreditAmount(pkg: PurchasesPackage): number {
  const identifier = pkg.product.identifier;
  return CREDIT_AMOUNTS[identifier] ?? 0;
}

const CreditPackModal = ({
  visible,
  onClose,
  onSuccess,
  skipParentalGate = false,
}: CreditPackModalProps) => {
  const insets = useSafeAreaInsets();
  const { data: offering, isLoading } = useCreditPacksOffering();
  const purchaseMutation = usePurchaseCreditPack();

  const [selectedPackage, setSelectedPackage] =
    useState<PurchasesPackage | null>(null);
  const [showParentalGate, setShowParentalGate] = useState(false);

  // Execute a purchase directly (no gate)
  const executePurchase = useCallback(
    async (pkg: PurchasesPackage) => {
      try {
        await purchaseMutation.mutateAsync(pkg);
        onSuccess?.();
        onClose();
      } catch (error) {
        console.error("Credit pack purchase failed:", error);
      }
    },
    [purchaseMutation, onSuccess, onClose],
  );

  // Handle purchase initiation
  const handlePurchasePress = useCallback(
    (pkg: PurchasesPackage) => {
      if (skipParentalGate) {
        executePurchase(pkg);
        return;
      }
      setSelectedPackage(pkg);
      setShowParentalGate(true);
    },
    [skipParentalGate, executePurchase],
  );

  // Execute purchase after parental gate success
  const handleParentalGateSuccess = useCallback(async () => {
    setShowParentalGate(false);

    if (selectedPackage) {
      await executePurchase(selectedPackage);
    }

    setSelectedPackage(null);
  }, [selectedPackage, executePurchase]);

  const handleParentalGateClose = useCallback(() => {
    setShowParentalGate(false);
    setSelectedPackage(null);
  }, []);

  const packages = offering?.availablePackages ?? [];
  const isPurchasing = purchaseMutation.isPending;

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
              <FontAwesomeIcon icon={faCoins} size={28} color="#FCD34D" />
              <Text style={styles.title}>Get More Credits</Text>
            </View>
            <Text style={styles.subtitle}>
              Top up your credits to keep creating amazing coloring pages!
            </Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text style={styles.loadingText}>Loading credit packs...</Text>
              </View>
            ) : packages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Credit packs are not available at the moment.
                </Text>
              </View>
            ) : (
              <View style={styles.packagesContainer}>
                {packages.map((pkg) => {
                  const credits = getCreditAmount(pkg);
                  const isBestValue = pkg.identifier === "credits_500";

                  return (
                    <Pressable
                      key={pkg.identifier}
                      style={[
                        styles.packageCard,
                        isBestValue && styles.bestValueCard,
                      ]}
                      onPress={() => handlePurchasePress(pkg)}
                      disabled={isPurchasing}
                    >
                      {isBestValue && (
                        <View style={styles.bestValueBadge}>
                          <FontAwesomeIcon
                            icon={faStar}
                            size={10}
                            color="#FFFFFF"
                          />
                          <Text style={styles.bestValueText}>Best Value</Text>
                        </View>
                      )}

                      <View style={styles.packageContent}>
                        <View style={styles.creditsContainer}>
                          <FontAwesomeIcon
                            icon={faCoins}
                            size={24}
                            color="#FCD34D"
                          />
                          <Text style={styles.creditsAmount}>{credits}</Text>
                          <Text style={styles.creditsLabel}>credits</Text>
                        </View>

                        <View style={styles.priceContainer}>
                          <Text style={styles.priceText}>
                            {formatPrice(pkg)}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.legalText}>
              Credits are added to your account immediately after purchase.
              Credits do not expire.
            </Text>
          </View>

          {/* Loading overlay */}
          {isPurchasing && (
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
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 16,
    textAlign: "center",
  },
  packagesContainer: {
    gap: 16,
    paddingTop: 16,
  },
  packageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bestValueCard: {
    borderWidth: 2,
    borderColor: "#7C3AED",
  },
  bestValueBadge: {
    position: "absolute",
    top: -12,
    left: "50%",
    marginLeft: -45,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bestValueText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  packageContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  creditsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  creditsAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
  },
  creditsLabel: {
    fontSize: 16,
    color: "#64748B",
  },
  priceContainer: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  legalText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
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

export default CreditPackModal;
