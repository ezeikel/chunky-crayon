"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "@/app/actions/user";
import { useRouter } from "next/navigation";
import { useGuestMode } from "@/hooks/useGuestMode";

type User = {
  id: string;
  email: string;
  name: string | null;
  credits: number;
  subscriptions?: {
    id: string;
    planName: string;
    status: string;
  }[];
};

type BlockedReason =
  | "not_signed_in"
  | "no_credits"
  | "guest_limit_reached"
  | null;

const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isSignedIn = !!user;
  const isGuest = !isSignedIn;

  const guestMode = useGuestMode();

  const fetchUser = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData as User);
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleAuthAction = useCallback(
    (action: "signin" | "billing" | "pricing") => {
      const routeMap: Record<typeof action, string> = {
        signin: "/signin",
        billing: "/account/billing",
        pricing: "/pricing",
      };

      router.push(routeMap[action]);
    },
    [router],
  );

  const hasActiveSubscription = user?.subscriptions?.some(
    (sub) => sub.status === "ACTIVE",
  );

  const hasEnoughCredits = user?.credits ? user.credits >= 5 : false;

  // Signed-in users: check credits. Guests: check daily free limit.
  const canGenerate = isSignedIn ? hasEnoughCredits : guestMode.canGenerate;

  const remainingGenerations = isSignedIn
    ? (user?.credits ?? 0)
    : guestMode.remainingGenerations;

  const getBlockedReason = (): BlockedReason => {
    if (canGenerate) return null;

    if (!isSignedIn) {
      // Guest who has exhausted daily free generations
      return guestMode.canGenerate ? "not_signed_in" : "guest_limit_reached";
    }

    return "no_credits";
  };

  return {
    user,
    isLoading,
    isSignedIn,
    isGuest,
    hasEnoughCredits,
    hasActiveSubscription,
    handleAuthAction,
    canGenerate,
    blockedReason: getBlockedReason(),
    remainingGenerations,
    // Expose guest mode helpers for callers that need them
    recordGuestGeneration: guestMode.recordGeneration,
    hasUsedFreeGeneration: guestMode.hasUsedFreeGeneration,
  };
};

export default useUser;
