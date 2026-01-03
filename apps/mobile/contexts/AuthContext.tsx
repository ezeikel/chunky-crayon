import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { LoginManager, AccessToken } from "react-native-fbsdk-next";
import {
  signInWithGoogle,
  signInWithApple,
  signInWithFacebook,
  sendMagicLink,
  verifyMagicLink,
  getAuthMe,
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

      if (!hasToken) {
        setIsAuthenticated(false);
        setIsLinked(false);
        setUser(null);
        return;
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

        // After successful OAuth, the user is authenticated and linked (has email)
        // Update state directly to avoid race conditions with refreshAuth
        setIsAuthenticated(true);
        setIsLinked(true);

        // Also refresh to get full user data (but state is already correct)
        await refreshAuth();

        // Invalidate profile queries so ProfileSwitcher loads fresh data
        queryClient.invalidateQueries({ queryKey: ["profiles"] });
        queryClient.invalidateQueries({ queryKey: ["activeProfile"] });

        return response;
      } catch (error: unknown) {
        console.error("Google sign-in error:", error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to sign in with Google";
        Alert.alert("Sign In Failed", message);
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

        // After successful OAuth, the user is authenticated and linked (has email)
        // Update state directly to avoid race conditions with refreshAuth
        setIsAuthenticated(true);
        setIsLinked(true);

        // Also refresh to get full user data (but state is already correct)
        await refreshAuth();

        // Invalidate profile queries so ProfileSwitcher loads fresh data
        queryClient.invalidateQueries({ queryKey: ["profiles"] });
        queryClient.invalidateQueries({ queryKey: ["activeProfile"] });

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
        Alert.alert("Sign In Failed", message);
        return null;
      } finally {
        setIsLoading(false);
      }
    }, [refreshAuth]);

  // Facebook Sign-In
  const signInWithFacebookHandler =
    useCallback(async (): Promise<OAuthSignInResponse | null> => {
      try {
        setIsLoading(true);

        // Request permissions from Facebook
        const result = await LoginManager.logInWithPermissions([
          "public_profile",
          "email",
        ]);

        if (result.isCancelled) {
          return null;
        }

        // Get the access token
        const data = await AccessToken.getCurrentAccessToken();

        if (!data?.accessToken) {
          throw new Error("No access token returned from Facebook");
        }

        // Send to our server
        const response = await signInWithFacebook(data.accessToken);

        // After successful OAuth, the user is authenticated and linked (has email)
        // Update state directly to avoid race conditions with refreshAuth
        setIsAuthenticated(true);
        setIsLinked(true);

        // Also refresh to get full user data (but state is already correct)
        await refreshAuth();

        // Invalidate profile queries so ProfileSwitcher loads fresh data
        queryClient.invalidateQueries({ queryKey: ["profiles"] });
        queryClient.invalidateQueries({ queryKey: ["activeProfile"] });

        return response;
      } catch (error: unknown) {
        console.error("Facebook sign-in error:", error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to sign in with Facebook";
        Alert.alert("Sign In Failed", message);
        return null;
      } finally {
        setIsLoading(false);
      }
    }, [refreshAuth]);

  // Send Magic Link
  const sendMagicLinkHandler = useCallback(
    async (email: string): Promise<boolean> => {
      try {
        setIsLoading(true);
        const response = await sendMagicLink(email);

        if (response.success) {
          Alert.alert(
            "Check Your Email",
            "We sent a sign-in link to your email. Tap it to sign in!",
          );
          return true;
        }

        Alert.alert("Error", response.error || "Failed to send magic link");
        return false;
      } catch (error: unknown) {
        console.error("Magic link error:", error);
        const message =
          error instanceof Error ? error.message : "Failed to send magic link";
        Alert.alert("Error", message);
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

        return response;
      } catch (error: unknown) {
        console.error("Magic link verification error:", error);
        Alert.alert(
          "Sign In Failed",
          "The magic link is invalid or expired. Please try again.",
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshAuth],
  );

  // Sign Out
  const signOut = useCallback(async () => {
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

      // Reset state
      setIsAuthenticated(false);
      setIsLinked(false);
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const value: AuthContextType = {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
