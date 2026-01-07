import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import { Platform } from "react-native";

// RevenueCat API keys - Test Store for now, will add iOS/Android when apps are created
const REVENUECAT_API_KEYS = {
  ios:
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ||
    "test_kzLtZBdhgwAtzUNMzuNsPmyNeKB",
  android:
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ||
    "test_kzLtZBdhgwAtzUNMzuNsPmyNeKB",
};

let isConfigured = false;

/**
 * Initialize RevenueCat SDK
 * Should be called once at app startup
 */
export async function initializeRevenueCat(userId?: string): Promise<void> {
  if (isConfigured) {
    console.log("[RevenueCat] Already configured");
    return;
  }

  const apiKey =
    Platform.OS === "ios"
      ? REVENUECAT_API_KEYS.ios
      : REVENUECAT_API_KEYS.android;

  if (!apiKey) {
    console.error(
      "[RevenueCat] No API key configured for platform:",
      Platform.OS,
    );
    return;
  }

  try {
    // Enable debug logs in development
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    await Purchases.configure({
      apiKey,
      appUserID: userId, // Use our userId for cross-platform sync
    });

    isConfigured = true;
    console.log(
      "[RevenueCat] Configured successfully",
      userId ? `for user: ${userId}` : "anonymously",
    );
  } catch (error) {
    console.error("[RevenueCat] Configuration failed:", error);
    throw error;
  }
}

/**
 * Identify user with RevenueCat
 * Call this after user signs in to link purchases to their account
 */
export async function identifyUser(userId: string): Promise<CustomerInfo> {
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    console.log("[RevenueCat] User identified:", userId);
    return customerInfo;
  } catch (error) {
    console.error("[RevenueCat] Failed to identify user:", error);
    throw error;
  }
}

/**
 * Log out current user from RevenueCat
 * Creates a new anonymous user
 */
export async function logoutUser(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.logOut();
    console.log("[RevenueCat] User logged out");
    return customerInfo;
  } catch (error) {
    console.error("[RevenueCat] Failed to logout user:", error);
    throw error;
  }
}

/**
 * Get current customer info (subscription status, etc.)
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error("[RevenueCat] Failed to get customer info:", error);
    throw error;
  }
}

/**
 * Get current offerings (subscription packages)
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error("[RevenueCat] Failed to get offerings:", error);
    throw error;
  }
}

/**
 * Purchase a package
 */
export async function purchasePackage(
  packageToPurchase: PurchasesPackage,
): Promise<CustomerInfo> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    console.log("[RevenueCat] Purchase successful");
    return customerInfo;
  } catch (error: unknown) {
    // Check if user cancelled
    if (
      error &&
      typeof error === "object" &&
      "userCancelled" in error &&
      error.userCancelled
    ) {
      console.log("[RevenueCat] Purchase cancelled by user");
      throw error;
    }
    console.error("[RevenueCat] Purchase failed:", error);
    throw error;
  }
}

/**
 * Restore purchases
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    console.log("[RevenueCat] Purchases restored");
    return customerInfo;
  } catch (error) {
    console.error("[RevenueCat] Failed to restore purchases:", error);
    throw error;
  }
}

/**
 * Check if user has active "premium" entitlement
 */
export function hasActiveSubscription(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active["premium"] !== undefined;
}

/**
 * Get the active plan name from customer info
 */
export function getActivePlanName(customerInfo: CustomerInfo): string | null {
  const premiumEntitlement = customerInfo.entitlements.active["premium"];
  if (!premiumEntitlement) return null;

  const productId = premiumEntitlement.productIdentifier;

  // Map product ID to plan name
  // Product IDs: splash_sub_monthly_v1, rainbow_sub_monthly_v1, etc.
  if (productId.startsWith("splash_")) return "SPLASH";
  if (productId.startsWith("rainbow_")) return "RAINBOW";
  if (productId.startsWith("sparkle_")) return "SPARKLE";

  return null;
}

/**
 * Check if subscription is in trial period
 */
export function isInTrialPeriod(customerInfo: CustomerInfo): boolean {
  const premiumEntitlement = customerInfo.entitlements.active["premium"];
  if (!premiumEntitlement) return false;

  return premiumEntitlement.periodType === "TRIAL";
}

/**
 * Get subscription expiration date
 */
export function getExpirationDate(customerInfo: CustomerInfo): Date | null {
  const premiumEntitlement = customerInfo.entitlements.active["premium"];
  if (!premiumEntitlement || !premiumEntitlement.expirationDate) return null;

  return new Date(premiumEntitlement.expirationDate);
}
