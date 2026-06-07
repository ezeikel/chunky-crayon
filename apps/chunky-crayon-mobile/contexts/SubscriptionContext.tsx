import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CustomerInfo } from "react-native-purchases";
import {
  initializeRevenueCat,
  identifyUser,
  logoutUser,
  getCustomerInfo,
} from "@/lib/revenuecat";
import { useEntitlements } from "@/hooks/useEntitlements";
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
  const { user } = useAuth();
  // The AUTHORITATIVE entitlement source: our backend's /entitlements, which
  // reads the shared `subscriptions` table (BOTH Stripe-web and RevenueCat-
  // mobile rows, keyed on user.id). RevenueCat's customerInfo only knows about
  // App Store purchases, so deriving hasSubscription from it would wrongly
  // report a web (Stripe) subscriber as NOT subscribed. Source the derived
  // state from here; keep RC customerInfo only for RC-specific needs.
  const { data: entitlements } = useEntitlements();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  // The DB userId RevenueCat is currently configured with — lets us tell
  // "first configure" from "id changed (anon→email after login merge)" from
  // "signed out". null until the first configure.
  const rcUserIdRef = useRef<string | null>(null);

  // Configure RevenueCat with the device's DB userId — anonymous (device) OR
  // email user — so RC's app_user_id == our DB user.id. This makes an
  // anonymous purchase's webhook event key directly on the device's anon user
  // (the webhook matches OR:[{id},{revenuecatUserId}]) instead of minting an
  // orphan $RCAnonymousID user nothing reconciles. We deliberately do NOT
  // configure RC anonymously first — we wait for user.id to exist (AuthContext
  // registers the device at cold start so user.id is populated up front).
  useEffect(() => {
    const sync = async () => {
      const userId = user?.id;

      // Sign-out: we previously identified a user and now have none → reset RC
      // back to a fresh anonymous customer. (Distinct from the initial
      // pre-register window, where rcUserIdRef is still null and we no-op.)
      if (!userId) {
        if (rcUserIdRef.current && isInitialized) {
          try {
            setIsLoading(true);
            const info = await logoutUser();
            setCustomerInfo(info);
            rcUserIdRef.current = null;
            queryClient.invalidateQueries({ queryKey: ["entitlements"] });
          } catch (error) {
            console.error("[SubscriptionContext] Failed to log out RC:", error);
          } finally {
            setIsLoading(false);
          }
        }
        return;
      }

      try {
        setIsLoading(true);

        if (!isInitialized) {
          // First configure — anchor RC on the DB userId directly.
          await initializeRevenueCat(userId);
          setIsInitialized(true);
          rcUserIdRef.current = userId;
          setCustomerInfo(await getCustomerInfo());
        } else if (rcUserIdRef.current !== userId) {
          // userId changed (anon → email after the login merge). logIn aliases
          // the RC customer so a purchase made under the anon id transfers.
          const info = await identifyUser(userId);
          setCustomerInfo(info);
          rcUserIdRef.current = userId;
        }

        queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      } catch (error) {
        console.error("[SubscriptionContext] Failed to sync RC user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    sync();
  }, [user?.id, isInitialized, queryClient]);

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

  // Derived subscription state from the AUTHORITATIVE backend entitlements
  // (not RC customerInfo) so a web Stripe subscriber is correctly recognised
  // on mobile. customerInfo stays available above for any RC-specific use.
  const hasSubscription = entitlements?.hasAccess ?? false;
  // Only surface a plan name when actually subscribed (matches the prior
  // null-when-no-sub semantics; avoids a consumer reading "FREE" as a plan).
  const planName = hasSubscription ? (entitlements?.plan ?? null) : null;
  const isTrialing = entitlements?.isTrialing ?? false;

  const value = useMemo<SubscriptionContextType>(
    () => ({
      isInitialized,
      isLoading,
      customerInfo,
      hasSubscription,
      planName,
      isTrialing,
      refreshSubscription,
    }),
    [
      isInitialized,
      isLoading,
      customerInfo,
      hasSubscription,
      planName,
      isTrialing,
      refreshSubscription,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export default SubscriptionProvider;
