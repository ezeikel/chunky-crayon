'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser } from '@/app/actions/user';
import { useRouter } from 'next/navigation';
import { SubscriptionStatus } from '@chunky-crayon/db/types';
import { useGuestMode } from './useGuestMode';
import { useParentalGateSafe } from '@/components/ParentalGate';

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

  // Guest mode for anonymous users
  const guestMode = useGuestMode(isSignedIn);

  const fetchUser = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData as User);
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Parental gate for sensitive routes (billing, pricing)
  // Uses safe version that returns null if outside ParentalGateProvider
  const parentalGate = useParentalGateSafe();

  const handleAuthAction = useCallback(
    (action: 'signin' | 'billing' | 'pricing') => {
      // Map actions to their correct routes
      const routeMap: Record<typeof action, string> = {
        signin: '/signin',
        billing: '/account/billing',
        pricing: '/pricing',
      };

      const targetPath = routeMap[action];

      // Only billing needs parental gate (pricing is for logged-out users)
      if (action === 'billing' && parentalGate) {
        parentalGate.openGate(targetPath);
      } else {
        router.push(targetPath);
      }
    },
    [router, parentalGate],
  );

  const hasActiveSubscription = user?.subscriptions?.some(
    (sub) => sub.status === SubscriptionStatus.ACTIVE,
  );

  const hasEnoughCredits = user?.credits ? user.credits >= 5 : false;

  // Can generate if:
  // 1. Signed in with enough credits, OR
  // 2. Guest with remaining free generations
  const canGenerate = isSignedIn ? hasEnoughCredits : guestMode.canGenerate;

  // Determine the reason user can't generate (for UI messaging)
  const getBlockedReason = ():
    | 'not_signed_in'
    | 'no_credits'
    | 'guest_limit_reached'
    | null => {
    if (canGenerate) return null;

    if (!isSignedIn) {
      // Guest who has exhausted free generations
      return 'guest_limit_reached';
    }

    // Signed in but no credits
    return 'no_credits';
  };

  return {
    user,
    isLoading,
    isSignedIn,
    hasEnoughCredits,
    hasActiveSubscription,
    handleAuthAction,
    // Guest mode properties
    isGuest: guestMode.isGuest,
    guestGenerationsRemaining: guestMode.generationsRemaining,
    guestGenerationsUsed: guestMode.generationsUsed,
    maxGuestGenerations: guestMode.maxGenerations,
    incrementGuestGeneration: guestMode.incrementGeneration,
    resetGuestData: guestMode.resetGuestData,
    // Combined convenience properties
    canGenerate,
    blockedReason: getBlockedReason(),
  };
};

export default useUser;
