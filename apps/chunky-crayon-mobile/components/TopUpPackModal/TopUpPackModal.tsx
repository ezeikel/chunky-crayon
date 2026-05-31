import { useState, useCallback } from "react";
import { View, Text, Modal, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faXmark } from "@fortawesome/pro-solid-svg-icons";
import { PurchasesPackage } from "react-native-purchases";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Purchases from "react-native-purchases";
import ParentalGate from "../ParentalGate";
import Spinner from "../Spinner/Spinner";
import SquishyPressable from "@/components/SquishyPressable";
import CreditPackRow from "@/components/CreditPackRow";
import PaywallHero from "@/components/SubscriptionPaywallModal/PaywallHero";
import { useRefreshEntitlements } from "@/hooks/useEntitlements";

type TopUpPackModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Skip parental gate (e.g. when already behind a gated screen like Settings) */
  skipParentalGate?: boolean;
};

// Fallback credit amounts per product. The source of truth is the
// RevenueCat product's `metadata.credits` field — set
// `{ "credits": "100" }` etc. on each product in the RevenueCat
// dashboard, and `getCreditAmount()` below will read it at runtime.
// Lets us change credit grants without a binary release. This map is
// only consulted if the metadata field is missing / malformed, so dev
// builds keep working before the dashboard is configured.
const CREDIT_AMOUNT_FALLBACK: Record<string, number> = {
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

// Get credit amount from package. Prefers `product.metadata.credits`
// from the RevenueCat dashboard (canonical source); falls back to the
// hardcoded map for products without metadata configured.
function getCreditAmount(pkg: PurchasesPackage): number {
  // RevenueCat surfaces product metadata as a Record<string, unknown>
  // on `pkg.product.metadata`. Coerce to string before parsing so we
  // tolerate both number-typed and string-typed metadata values.
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
  return CREDIT_AMOUNT_FALLBACK[pkg.product.identifier] ?? 0;
}

const TopUpPackModal = ({
  visible,
  onClose,
  onSuccess,
  skipParentalGate = false,
}: TopUpPackModalProps) => {
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
          {/* Floating close button over the hero. */}
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
            {/* Same fanned coloring-page hero as the other paywalls. */}
            <PaywallHero play={visible} />

            <Text style={styles.title}>Top up your credits</Text>
            <Text style={styles.subtitle}>
              Add more credits to keep creating, without changing your plan.
            </Text>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Spinner size={36} color="#E46444" />
                <Text style={styles.loadingText}>Loading credit packs…</Text>
              </View>
            ) : packages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Credit packs are not available at the moment.
                </Text>
              </View>
            ) : (
              <View style={styles.packs}>
                {packages.map((pkg) => (
                  <CreditPackRow
                    key={pkg.identifier}
                    credits={getCreditAmount(pkg)}
                    price={formatPrice(pkg)}
                    isBestValue={pkg.identifier === "credits_500"}
                    disabled={isPurchasing}
                    onPress={() => handlePurchasePress(pkg)}
                  />
                ))}
              </View>
            )}

            <Text style={styles.legalText}>
              Credits are added to your account immediately after purchase.
              Credits do not expire.
            </Text>
          </ScrollView>

          {/* Loading overlay */}
          {isPurchasing && (
            <View style={styles.loadingOverlay}>
              <Spinner size={36} color="#FFFFFF" />
              <Text style={styles.loadingOverlayText}>Processing…</Text>
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
  closeButton: {
    // `top` set inline as insets.top + 8 so the X clears the status bar.
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
    gap: 14,
  },
  title: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 26,
    color: "#43342D",
    textAlign: "center",
    marginTop: 8,
  },
  subtitle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 15,
    color: "#6B5344",
    textAlign: "center",
    paddingHorizontal: 16,
    marginTop: -6,
  },
  packs: {
    gap: 14,
    marginTop: 6,
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
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 15,
    color: "#7A6F66",
    textAlign: "center",
  },
  legalText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
    paddingHorizontal: 8,
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

export default TopUpPackModal;
