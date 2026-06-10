import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import * as Sentry from "@sentry/react-native";
import { getLocales } from "expo-localization";
import { toast } from "@/components/Toaster";
import { useQueryClient } from "@tanstack/react-query";
import {
  identify as identifyAnalytics,
  reset as resetAnalytics,
  track,
} from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
// Facebook login was removed before store submission (the Meta SDK injects the
// Android AD_ID permission, which conflicts with Play's Designed for Families on
// a zero-ads kids app). The handler is kept as a no-op so call sites don't churn;
// re-add react-native-fbsdk-next here if FB login returns. See
// project_cc_mobile_store_submission.
import {
  signInWithGoogle,
  signInWithApple,
  sendMagicLink,
  verifyMagicLink,
  getAuthMe,
  registerDevice,
  type OAuthSignInResponse,
  type AuthMeResponse,
} from "@/api";
import {
  logout as clearAuthTokens,
  isAuthenticated as checkIsAuthenticated,
} from "@/lib/auth";

type AuthContextType = {
  isLoading: boolean;
  isAuthenticated: boolean;
  isLinked: boolean;
  user: AuthMeResponse["user"];
  signInWithGoogleHandler: () => Promise<OAuthSignInResponse | null>;
  signInWithAppleHandler: () => Promise<OAuthSignInResponse | null>;
  signInWithFacebookHandler: () => Promise<OAuthSignInResponse | null>;
  sendMagicLinkHandler: (email: string) => Promise<boolean>;
  handleMagicLinkCallback: (
    token: string,
  ) => Promise<OAuthSignInResponse | null>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  isLinked: false,
  user: null,
  signInWithGoogleHandler: async () => null,
  signInWithAppleHandler: async () => null,
  signInWithFacebookHandler: async () => null,
  sendMagicLinkHandler: async () => false,
  handleMagicLinkCallback: async () => null,
  signOut: async () => {},
  refreshAuth: async () => {},
});

export const useAuth = () => useContext(AuthContext);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [user, setUser] = useState<AuthMeResponse["user"]>(null);

  // Configure Google Sign-In
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
  }, []);

  // Refresh auth state from server
  const refreshAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const hasToken = await checkIsAuthenticated();

      // Fresh install with no token yet: register the device NOW so the
      // anonymous DB user exists and `user.id` is populated at the end of this
      // first refresh — deterministically, rather than waiting for an
      // incidental API call to trigger ensureRegistered later. This is what
      // lets SubscriptionContext anchor RevenueCat on the DB userId at cold
      // start (no throwaway $RCAnonymousID).
      if (!hasToken) {
        await registerDevice();
      }

      const authData = await getAuthMe();
      setIsAuthenticated(authData.authenticated);
      setIsLinked(authData.isLinked);
      setUser(authData.user);
    } catch (error) {
      console.error("Failed to refresh auth:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize auth state on mount
  React.useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // Keep Sentry + PostHog identity in sync with the auth user so every
  // crash/error AND every analytics event is attributable to a person/device
  // (which kid's iPad). `user.id` is the DB user id (the registered device OR
  // signed-in account) — the SAME id web uses, so web↔mobile and guest→account
  // collapse onto one person. Fires on every sign-in path (sets `user`) and on
  // logout (clears it). Mirrors web's UserIdentify. (Plan/credits person props
  // refresh from entitlements elsewhere; here we set what `user` carries.)
  const hasIdentifiedRef = React.useRef(false);
  React.useEffect(() => {
    if (user) {
      // An anonymous device user has no email AND (now) no name — the backend
      // stopped defaulting it to the "Mobile User" placeholder, so an anon
      // person shows as its distinct_id (= DB user.id) in PostHog, like web's
      // anonymous persons. `has_account` (email present) is the queryable
      // anonymous-vs-signed-in discriminator — segment on THAT, never the label.
      const hasAccount = !!user.email;

      Sentry.setUser({
        id: user.id,
        email: user.email ?? undefined,
        username: user.name ?? undefined,
      });
      identifyAnalytics(user.id, {
        // null (not undefined) so the analytics helper actively $unsets these on
        // the PostHog person when absent — clears the legacy "Mobile User" name
        // / stale email rather than leaving it stuck. has_account/is_anonymous
        // are the labels to segment on, never `name`.
        email: user.email ?? null,
        name: user.name ?? null,
        credits: user.credits,
        locale: getLocales()[0]?.languageTag,
        has_account: hasAccount,
        is_anonymous: !hasAccount,
      });
      hasIdentifiedRef.current = true;
    } else if (hasIdentifiedRef.current) {
      // Only reset on an actual logout transition (was identified → null), not
      // the initial null before auth resolves — that would wipe the anonymous
      // session PostHog is already capturing.
      Sentry.setUser(null);
      resetAnalytics();
      hasIdentifiedRef.current = false;
    }
  }, [user]);

  // Google Sign-In
  const signInWithGoogleHandler =
    useCallback(async (): Promise<OAuthSignInResponse | null> => {
      try {
        setIsLoading(true);

        // Check if Google Play Services are available
        await GoogleSignin.hasPlayServices();

        // Sign in with Google
        const userInfo = await GoogleSignin.signIn();
        const idToken = userInfo.data?.idToken;

        if (!idToken) {
          throw new Error("No ID token returned from Google");
        }

        // Send to our server
        const response = await signInWithGoogle(idToken);

        track(ANALYTICS_EVENTS.AUTH_SIGN_IN_COMPLETED, { method: "google" });

        // After successful OAuth, the user is authenticated and linked (has email)
        // Update state directly to avoid race conditions with refreshAuth
        setIsAuthenticated(true);
        setIsLinked(true);

        // Also refresh to get full user data (but state is already correct)
        await refreshAuth();

        // Invalidate profile queries so ProfileSwitcher loads fresh data
        queryClient.invalidateQueries({ queryKey: ["profiles"] });
        queryClient.invalidateQueries({ queryKey: ["activeProfile"] });
        // Re-pull saved artworks: the server merge (handleMobileOAuthSignIn) just
        // re-pointed the anon user's artworks onto this email account, so the
        // My Art tab must refetch to show the reconciled DB rows. (Phase 3's
        // login trigger also flushes any still-local drawings to DB right now.)
        queryClient.invalidateQueries({ queryKey: ["savedArtworks"] });

        return response;
      } catch (error: unknown) {
        console.error("Google sign-in error:", error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to sign in with Google";
        toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    }, [refreshAuth]);

  // Apple Sign-In
  const signInWithAppleHandler =
    useCallback(async (): Promise<OAuthSignInResponse | null> => {
      try {
        setIsLoading(true);

        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          ],
        });

        if (!credential.identityToken) {
          throw new Error("No identity token returned from Apple");
        }

        // Send to our server
        const response = await signInWithApple(credential.identityToken, {
          givenName: credential.fullName?.givenName ?? undefined,
          familyName: credential.fullName?.familyName ?? undefined,
        });

        track(ANALYTICS_EVENTS.AUTH_SIGN_IN_COMPLETED, { method: "apple" });

        // After successful OAuth, the user is authenticated and linked (has email)
        // Update state directly to avoid race conditions with refreshAuth
        setIsAuthenticated(true);
        setIsLinked(true);

        // Also refresh to get full user data (but state is already correct)
        await refreshAuth();

        // Invalidate profile queries so ProfileSwitcher loads fresh data
        queryClient.invalidateQueries({ queryKey: ["profiles"] });
        queryClient.invalidateQueries({ queryKey: ["activeProfile"] });
        // Re-pull saved artworks: the server merge (handleMobileOAuthSignIn) just
        // re-pointed the anon user's artworks onto this email account, so the
        // My Art tab must refetch to show the reconciled DB rows. (Phase 3's
        // login trigger also flushes any still-local drawings to DB right now.)
        queryClient.invalidateQueries({ queryKey: ["savedArtworks"] });

        return response;
      } catch (error: unknown) {
        // Don't show error if user cancelled
        if (error instanceof Error && error.message.includes("cancelled")) {
          return null;
        }

        console.error("Apple sign-in error:", error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to sign in with Apple";
        toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    }, [refreshAuth]);

  // Facebook Sign-In — REMOVED before store submission (the Meta SDK injected
  // the Android AD_ID permission, conflicting with Play's Designed for Families
  // on this zero-ads kids app). The FB button is feature-flag-gated off so this
  // never runs in production; kept as a no-op to preserve the context shape
  // without churning call sites. Restore the real handler (and the dependency)
  // if FB login returns. `signInWithFacebook` (api.ts) stays for that future.
  const signInWithFacebookHandler =
    useCallback(async (): Promise<OAuthSignInResponse | null> => {
      toast.error("Facebook sign-in isn't available right now");
      return null;
    }, []);

  // Send Magic Link
  const sendMagicLinkHandler = useCallback(
    async (email: string): Promise<boolean> => {
      try {
        setIsLoading(true);
        const response = await sendMagicLink(email);

        if (response.success) {
          toast.success("Check your email — we sent a sign-in link!");
          return true;
        }

        toast.error(response.error || "Failed to send magic link");
        return false;
      } catch (error: unknown) {
        console.error("Magic link error:", error);
        const message =
          error instanceof Error ? error.message : "Failed to send magic link";
        toast.error(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Handle Magic Link Callback (from deep link)
  const handleMagicLinkCallback = useCallback(
    async (token: string): Promise<OAuthSignInResponse | null> => {
      try {
        setIsLoading(true);
        const response = await verifyMagicLink(token);

        // After successful magic link verification, user is authenticated and linked
        // Update state directly to avoid race conditions with refreshAuth
        setIsAuthenticated(true);
        setIsLinked(true);

        // Also refresh to get full user data (but state is already correct)
        await refreshAuth();

        // Invalidate profile queries so ProfileSwitcher loads fresh data
        queryClient.invalidateQueries({ queryKey: ["profiles"] });
        queryClient.invalidateQueries({ queryKey: ["activeProfile"] });
        // Re-pull saved artworks: the server merge (handleMobileOAuthSignIn) just
        // re-pointed the anon user's artworks onto this email account, so the
        // My Art tab must refetch to show the reconciled DB rows. (Phase 3's
        // login trigger also flushes any still-local drawings to DB right now.)
        queryClient.invalidateQueries({ queryKey: ["savedArtworks"] });

        return response;
      } catch (error: unknown) {
        console.error("Magic link verification error:", error);
        toast.error("The magic link is invalid or expired. Please try again.");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshAuth],
  );

  // Sign Out
  const signOut = useCallback(async () => {
    track(ANALYTICS_EVENTS.AUTH_SIGN_OUT);

    try {
      setIsLoading(true);

      // Sign out from Google if signed in
      try {
        await GoogleSignin.signOut();
      } catch {
        // Ignore if not signed in with Google
      }

      // Clear local tokens
      await clearAuthTokens();

      // Drop the email-user's DB-backed caches so the app reverts to the
      // anonymous "ghost" state (PTP model): the My Art tab falls back to the
      // on-device collection, profile/user chrome resets. The local MMKV
      // artwork store is deliberately NOT cleared — it's the device's
      // collection and survives sign-out; the next sign-in re-pulls + dedups it.
      queryClient.removeQueries({ queryKey: ["savedArtworks"] });
      queryClient.removeQueries({ queryKey: ["user"] });
      queryClient.removeQueries({ queryKey: ["profiles"] });
      queryClient.removeQueries({ queryKey: ["activeProfile"] });

      // Reset state
      setIsAuthenticated(false);
      setIsLinked(false);
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  // Periodic token validity check (every 10 minutes)
  React.useEffect(() => {
    const checkTokenValidity = async () => {
      const hasToken = await checkIsAuthenticated();
      if (!hasToken) return;

      try {
        // Attempt to fetch auth state - will fail if token is invalid
        await getAuthMe();
      } catch (error) {
        console.log("Token validation failed, signing out");
        await signOut();
      }
    };

    const interval = setInterval(checkTokenValidity, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [signOut]);

  const value = useMemo<AuthContextType>(
    () => ({
      isLoading,
      isAuthenticated,
      isLinked,
      user,
      signInWithGoogleHandler,
      signInWithAppleHandler,
      signInWithFacebookHandler,
      sendMagicLinkHandler,
      handleMagicLinkCallback,
      signOut,
      refreshAuth,
    }),
    [
      isLoading,
      isAuthenticated,
      isLinked,
      user,
      signInWithGoogleHandler,
      signInWithAppleHandler,
      signInWithFacebookHandler,
      sendMagicLinkHandler,
      handleMagicLinkCallback,
      signOut,
      refreshAuth,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
