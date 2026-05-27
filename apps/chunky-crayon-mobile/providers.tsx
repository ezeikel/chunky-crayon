import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Toaster } from "@/components/Toaster";
import {
  AuthProvider,
  ColoProvider,
  UserProvider,
  SubscriptionProvider,
} from "@/contexts";
import { FocusModeProvider } from "@/components/FocusMode";

export const queryClient = new QueryClient();

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SubscriptionProvider>
              <UserProvider>
                <ColoProvider>
                  <FocusModeProvider>{children}</FocusModeProvider>
                </ColoProvider>
              </UserProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </QueryClientProvider>
        {/* Brand-styled toast host. Sits under BottomSheetModalProvider
            so toasts render above any open sheet. ALL transient
            feedback lives here (no Alert.alert). Destructive confirms
            use ConfirmSheet (also a bottom sheet) so the experience
            stays in-app and brand-styled. */}
        <Toaster />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
};

export default Providers;
