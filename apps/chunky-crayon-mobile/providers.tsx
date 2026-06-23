import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetProvider } from "@swmansion/react-native-bottom-sheet";
import { PostHogProvider } from "posthog-react-native";
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
import { posthog } from "@/lib/posthog";

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
  // The shared data/UI provider stack. PostHogProvider wraps this on Android;
  // on iOS it doesn't exist at all (see below).
  const tree = (
    /* QueryClientProvider (+ the auth/user/colo data providers) must wrap
       BottomSheetProvider, NOT the other way around. @swmansion's
       ModalBottomSheet PORTALS its content up to the BottomSheetProvider
       host — so any sheet that renders React-Query / context consumers
       (e.g. the Create sheet's form → useEntitlements) needs those providers
       ABOVE the sheet host, or it crashes with "No QueryClient set". */
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <UserProvider>
            <ArtworkSyncMount />
            <ColoProvider>
              <FocusModeProvider>
                <BottomSheetProvider>
                  {children}
                  {/* Toast host — under BottomSheetProvider so toasts render
                    above any open sheet. ALL transient feedback lives here
                    (no Alert.alert). Destructive confirms use ConfirmSheet. */}
                  <Toaster />
                  {/* "Turn me around" overlay for a physically-inverted
                    iPhone. Last child so it covers every screen + sheet. */}
                  <UpsideDownHint />
                </BottomSheetProvider>
              </FocusModeProvider>
            </ColoProvider>
          </UserProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* iOS: NO PostHogProvider. Apple's Kids Category (Guideline 1.3) bars a
          Kids app from third-party analytics SDKs that can collect/transmit
          device or identifiable info, so on iOS `posthog` is null (see
          lib/posthog) and we mount the tree without any analytics provider —
          no autocapture, no session replay, nothing leaves the device.
          Android keeps the provider (autocapture: $screen per route + app
          lifecycle, touches OFF; session replay ON, fully masked). */}
      {posthog ? (
        <PostHogProvider
          client={posthog}
          autocapture={{ captureScreens: true, captureTouches: false }}
        >
          {tree}
        </PostHogProvider>
      ) : (
        tree
      )}
    </GestureHandlerRootView>
  );
};

export default Providers;
