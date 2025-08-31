import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ColoringContextProvider } from "./contexts/coloring";

export const queryClient = new QueryClient();

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ColoringContextProvider>{children}</ColoringContextProvider>
    </QueryClientProvider>
  );
};

export default Providers;
