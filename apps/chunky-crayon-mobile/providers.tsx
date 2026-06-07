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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* PostHogProvider wraps everything so usePostHog() works app-wide
          (incl. AuthContext, which identifies the user). Uses the shared
          configured client from lib/posthog (autocapture: $screen per route +
          app lifecycle, touches OFF; session replay ON, fully masked). */}
      <PostHogProvider
        client={posthog}
        autocapture={{ captureScreens: true, captureTouches: false }}
      >
        {/* QueryClientProvider (+ the auth/user/colo data providers) must wrap
          BottomSheetProvider, NOT the other way around. @swmansion's
          ModalBottomSheet PORTALS its content up to the BottomSheetProvider
          host — so any sheet that renders React-Query / context consumers
          (e.g. the Create sheet's form → useEntitlements) needs those providers
          ABOVE the sheet host, or it crashes with "No QueryClient set". */}
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
      </PostHogProvider>
    </GestureHandlerRootView>
  );
};

export default Providers;
