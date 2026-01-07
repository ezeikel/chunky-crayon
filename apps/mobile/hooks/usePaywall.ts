import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { PurchasesPackage, PurchasesOffering } from "react-native-purchases";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  getCustomerInfo,
} from "@/lib/revenuecat";

/**
 * Hook to get available subscription offerings/packages
 */
export function useOfferings() {
  return useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async (): Promise<PurchasesOffering | null> => {
      return getOfferings();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to handle purchasing a subscription package
 */
export function usePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageToPurchase: PurchasesPackage) => {
      return purchasePackage(packageToPurchase);
    },
    onSuccess: () => {
      // Invalidate customer info to refresh subscription status
      queryClient.invalidateQueries({
        queryKey: ["revenuecat", "customerInfo"],
      });
      // Also invalidate entitlements from our API
      queryClient.invalidateQueries({ queryKey: ["entitlements"] });
    },
    onError: (error: unknown) => {
      // Don't show alert if user cancelled
      if (
        error &&
        typeof error === "object" &&
        "userCancelled" in error &&
        error.userCancelled
      ) {
        return;
      }

      Alert.alert(
        "Purchase Failed",
        "There was an error processing your purchase. Please try again.",
      );
    },
  });
}

/**
 * Hook to restore previous purchases
 */
export function useRestorePurchases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return restorePurchases();
    },
    onSuccess: (customerInfo) => {
      // Invalidate customer info to refresh subscription status
      queryClient.invalidateQueries({
        queryKey: ["revenuecat", "customerInfo"],
      });
      // Also invalidate entitlements from our API
      queryClient.invalidateQueries({ queryKey: ["entitlements"] });

      // Check if any subscriptions were restored
      const hasSubscription =
        customerInfo.entitlements.active["premium"] !== undefined;

      if (hasSubscription) {
        Alert.alert(
          "Purchases Restored",
          "Your subscription has been restored successfully!",
        );
      } else {
        Alert.alert(
          "No Purchases Found",
          "No previous purchases were found to restore.",
        );
      }
    },
    onError: () => {
      Alert.alert(
        "Restore Failed",
        "There was an error restoring your purchases. Please try again.",
      );
    },
  });
}

/**
 * Hook to get RevenueCat customer info directly
 * Useful for checking subscription status from the store
 */
export function useCustomerInfo() {
  return useQuery({
    queryKey: ["revenuecat", "customerInfo"],
    queryFn: async () => {
      return getCustomerInfo();
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Package display info helpers
 */
export function getPackageDisplayName(pkg: PurchasesPackage): string {
  // Use RevenueCat's package identifier to determine display name
  switch (pkg.identifier) {
    case "$rc_monthly":
      return "Rainbow Monthly";
    case "$rc_annual":
      return "Rainbow Annual";
    case "splash_monthly":
      return "Splash Monthly";
    case "splash_annual":
      return "Splash Annual";
    case "sparkle_monthly":
      return "Sparkle Monthly";
    case "sparkle_annual":
      return "Sparkle Annual";
    default:
      return pkg.product.title;
  }
}

export function getPackagePlanName(
  pkg: PurchasesPackage,
): "SPLASH" | "RAINBOW" | "SPARKLE" {
  const productId = pkg.product.identifier;
  if (productId.startsWith("splash_")) return "SPLASH";
  if (productId.startsWith("sparkle_")) return "SPARKLE";
  return "RAINBOW"; // Default
}

export function isAnnualPackage(pkg: PurchasesPackage): boolean {
  return pkg.identifier.includes("annual") || pkg.identifier === "$rc_annual";
}

export function formatPackagePrice(pkg: PurchasesPackage): string {
  return pkg.product.priceString;
}

export function formatAnnualMonthlyPrice(pkg: PurchasesPackage): string | null {
  if (!isAnnualPackage(pkg)) return null;

  const monthlyPrice = pkg.product.price / 12;
  // Format with currency symbol from the original price string
  const currencySymbol = pkg.product.priceString.replace(/[\d.,\s]/g, "");
  return `${currencySymbol}${monthlyPrice.toFixed(2)}/mo`;
}
