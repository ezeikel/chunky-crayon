import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ColoProvider, UserProvider } from "@/contexts";

export const queryClient = new QueryClient();

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <ColoProvider>{children}</ColoProvider>
        </UserProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

export default Providers;
