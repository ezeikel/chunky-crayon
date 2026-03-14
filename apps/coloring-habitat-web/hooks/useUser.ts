"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "@/app/actions/user";
import { useRouter } from "next/navigation";

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

const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isSignedIn = !!user;

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

  const canGenerate = isSignedIn ? hasEnoughCredits : false;

  const getBlockedReason = (): "not_signed_in" | "no_credits" | null => {
    if (canGenerate) return null;

    if (!isSignedIn) {
      return "not_signed_in";
    }

    return "no_credits";
  };

  return {
    user,
    isLoading,
    isSignedIn,
    hasEnoughCredits,
    hasActiveSubscription,
    handleAuthAction,
    canGenerate,
    blockedReason: getBlockedReason(),
  };
};

export default useUser;
