import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetProvider } from "@swmansion/react-native-bottom-sheet";
import { Toaster } from "@/components/Toaster";
import UpsideDownHint from "@/components/UpsideDownHint/UpsideDownHint";
import {
  AuthProvider,
  ColoProvider,
  UserProvider,
  SubscriptionProvider,
} from "@/contexts";
import { FocusModeProvider } from "@/components/FocusMode";
import { useArtworkSync } from "@/hooks/useArtworkSync";

export const queryClient = new QueryClient();

/**
 * Renders nothing — just mounts the local→DB artwork sync worker app-wide.
 * Sits under AuthProvider (needs useAuth) so it can gate on the current user.
 */
const ArtworkSyncMount = () => {
  useArtworkSync();
  return null;
};

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SubscriptionProvider>
              <UserProvider>
                <ArtworkSyncMount />
                <ColoProvider>
                  <FocusModeProvider>{children}</FocusModeProvider>
                </ColoProvider>
              </UserProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </QueryClientProvider>
        {/* Brand-styled toast host. Sits under BottomSheetProvider so
            toasts render above any open sheet. ALL transient feedback
            lives here (no Alert.alert). Destructive confirms use
            ConfirmSheet (also a bottom sheet) so the experience stays
            in-app and brand-styled. */}
        <Toaster />
        {/* Friendly "turn me around" overlay when an iPhone is held physically
            upside-down (iOS won't rotate a notched iPhone's window there). Last
            child so it covers every screen + any open sheet. iPhone-only by
            construction (useUpsideDownHint is false on iPad / web / Android). */}
        <UpsideDownHint />
      </BottomSheetProvider>
    </GestureHandlerRootView>
  );
};

export default Providers;
