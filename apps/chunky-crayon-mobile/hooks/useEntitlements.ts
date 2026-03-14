import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  getEntitlements,
  type EntitlementsResponse,
  type PlanName,
  type PlanFeatures,
} from "@/api";

/**
 * Hook to get user's subscription entitlements from our backend
 * This is the source of truth for subscription status
 */
export function useEntitlements() {
  return useQuery({
    queryKey: ["entitlements"],
    queryFn: async (): Promise<EntitlementsResponse> => {
      return getEntitlements();
    },
    staleTime: 60 * 1000, // 1 minute - subscription status doesn't change often
    retry: 2,
  });
}

/**
 * Hook to check if user has an active subscription
 */
export function useHasSubscription(): boolean {
  const { data } = useEntitlements();
  return data?.hasAccess ?? false;
}

/**
 * Hook to get current plan name
 */
export function usePlanName(): PlanName {
  const { data } = useEntitlements();
  return data?.plan ?? "FREE";
}

/**
 * Hook to get user's available credits
 */
export function useCredits(): number {
  const { data } = useEntitlements();
  return data?.credits ?? 0;
}

/**
 * Hook to get plan features
 */
export function usePlanFeatures(): PlanFeatures | null {
  const { data } = useEntitlements();
  return data?.features ?? null;
}

/**
 * Hook to check if user can perform a specific action
 */
export function useCanPerformAction(action: keyof PlanFeatures): boolean {
  const features = usePlanFeatures();
  if (!features) return false;

  const value = features[action];
  return typeof value === "boolean" ? value : value > 0;
}

/**
 * Hook to refresh entitlements after purchase or other changes
 */
export function useRefreshEntitlements() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["entitlements"] });
    queryClient.invalidateQueries({ queryKey: ["revenuecat", "customerInfo"] });
  }, [queryClient]);
}

/**
 * Helper to determine if user should see paywall
 */
export function useShouldShowPaywall(): {
  shouldShow: boolean;
  isLoading: boolean;
  reason: "no_subscription" | "no_credits" | "feature_locked" | null;
} {
  const { data, isLoading } = useEntitlements();

  if (isLoading) {
    return { shouldShow: false, isLoading: true, reason: null };
  }

  if (!data?.hasAccess) {
    return { shouldShow: true, isLoading: false, reason: "no_subscription" };
  }

  if (data.credits <= 0) {
    return { shouldShow: true, isLoading: false, reason: "no_credits" };
  }

  return { shouldShow: false, isLoading: false, reason: null };
}

/**
 * Get subscription status display text
 */
export function getSubscriptionStatusText(
  entitlements: EntitlementsResponse | undefined,
): string {
  if (!entitlements) return "Loading...";
  if (!entitlements.hasAccess) return "No subscription";
  if (entitlements.isTrialing) return "Trial active";
  if (entitlements.isCancelled) return "Cancelled (access until period end)";

  switch (entitlements.status) {
    case "ACTIVE":
      return "Active";
    case "PAST_DUE":
      return "Payment issue";
    case "PAUSED":
      return "Paused";
    default:
      return entitlements.status;
  }
}

/**
 * Get formatted expiration date
 */
export function getFormattedExpirationDate(
  entitlements: EntitlementsResponse | undefined,
): string | null {
  if (!entitlements?.expiresAt) return null;

  const date = new Date(entitlements.expiresAt);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Re-export types for convenience
export type { EntitlementsResponse, PlanName, PlanFeatures };
