import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ColoProvider } from "@/contexts";

export const queryClient = new QueryClient();

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ColoProvider>{children}</ColoProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

export default Providers;
