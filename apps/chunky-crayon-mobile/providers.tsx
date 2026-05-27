import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Toaster } from "sonner-native";
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
        {/* sonner-native toast host. Sits under BottomSheetModalProvider
            so toasts render above any open sheet. See memory
            feedback_sonner_toasts_for_errors — transient feedback
            (save / delete / network errors) lives here, not in
            Alert.alert. Blocking confirms (sign out, parental gate,
            delete profile) stay as Alert. */}
        <Toaster />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
};

export default Providers;
