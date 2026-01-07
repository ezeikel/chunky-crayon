import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CustomerInfo } from "react-native-purchases";
import {
  initializeRevenueCat,
  identifyUser,
  logoutUser,
  getCustomerInfo,
  hasActiveSubscription,
  getActivePlanName,
  isInTrialPeriod,
} from "@/lib/revenuecat";
import { useAuth } from "./AuthContext";

type SubscriptionContextType = {
  isInitialized: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  hasSubscription: boolean;
  planName: string | null;
  isTrialing: boolean;
  refreshSubscription: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  isInitialized: false,
  isLoading: true,
  customerInfo: null,
  hasSubscription: false,
  planName: null,
  isTrialing: false,
  refreshSubscription: async () => {},
});

export const useSubscription = () => useContext(SubscriptionContext);

type SubscriptionProviderProps = {
  children: ReactNode;
};

export const SubscriptionProvider = ({
  children,
}: SubscriptionProviderProps) => {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  // Initialize RevenueCat on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize without user ID first (anonymous)
        await initializeRevenueCat();
        setIsInitialized(true);

        // Get initial customer info
        const info = await getCustomerInfo();
        setCustomerInfo(info);
      } catch (error) {
        console.error("[SubscriptionContext] Failed to initialize:", error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Identify user with RevenueCat when they sign in
  useEffect(() => {
    const syncUser = async () => {
      if (!isInitialized) return;

      try {
        setIsLoading(true);

        if (isAuthenticated && user?.id) {
          // User is signed in - identify them with RevenueCat
          const info = await identifyUser(user.id);
          setCustomerInfo(info);
        } else {
          // User signed out - reset to anonymous
          const info = await logoutUser();
          setCustomerInfo(info);
        }

        // Invalidate entitlements query to refresh from our backend
        queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      } catch (error) {
        console.error("[SubscriptionContext] Failed to sync user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    syncUser();
  }, [isInitialized, isAuthenticated, user?.id, queryClient]);

  // Refresh subscription status
  const refreshSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      const info = await getCustomerInfo();
      setCustomerInfo(info);

      // Also invalidate entitlements from our backend
      queryClient.invalidateQueries({ queryKey: ["entitlements"] });
    } catch (error) {
      console.error(
        "[SubscriptionContext] Failed to refresh subscription:",
        error,
      );
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  // Derived subscription state from customer info
  const hasSubscription = customerInfo
    ? hasActiveSubscription(customerInfo)
    : false;
  const planName = customerInfo ? getActivePlanName(customerInfo) : null;
  const isTrialing = customerInfo ? isInTrialPeriod(customerInfo) : false;

  const value: SubscriptionContextType = {
    isInitialized,
    isLoading,
    customerInfo,
    hasSubscription,
    planName,
    isTrialing,
    refreshSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export default SubscriptionProvider;
