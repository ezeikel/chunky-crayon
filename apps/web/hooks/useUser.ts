'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser } from '@/app/actions/user';
import { useRouter } from 'next/navigation';
import { SubscriptionStatus } from '@prisma/client';

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

  const handleAuthAction = useCallback(
    (action: 'signin' | 'billing') => {
      router.push(`/${action}`);
    },
    [router],
  );

  const hasActiveSubscription = user?.subscriptions?.some(
    (sub) => sub.status === SubscriptionStatus.ACTIVE,
  );

  return {
    user,
    isLoading,
    isSignedIn: !!user,
    hasEnoughCredits: user?.credits ? user.credits >= 5 : false,
    hasActiveSubscription,
    handleAuthAction,
  };
};

export default useUser;
