import { createContext, useContext, ReactNode } from "react";
import useColo from "@/hooks/useColo";
import type { ColoState, EvolutionResult } from "@/lib/colo";
import { ColoEvolutionCelebration } from "@/components/ColoEvolutionCelebration";

type ColoContextType = {
  isLoading: boolean;
  coloState: ColoState;
  artworkCount: number;
  pendingEvolution: EvolutionResult | null;
  recordArtwork: (stats?: {
    stickerCount?: number;
    categoryArtworkCounts?: Record<string, number>;
    totalColorsUsed?: number;
    isSpecialOccasion?: boolean;
  }) => Promise<EvolutionResult | null>;
  dismissEvolution: () => void;
  setArtworkCount: (count: number) => Promise<void>;
  resetColo: () => Promise<void>;
};

const ColoContext = createContext<ColoContextType | null>(null);

export const useColoContext = () => {
  const context = useContext(ColoContext);
  if (!context) {
    throw new Error("useColoContext must be used within a ColoProvider");
  }
  return context;
};

type ColoProviderProps = {
  children: ReactNode;
};

export const ColoProvider = ({ children }: ColoProviderProps) => {
  const colo = useColo();

  return (
    <ColoContext.Provider value={colo}>
      {children}
      <ColoEvolutionCelebration
        evolutionResult={colo.pendingEvolution}
        onDismiss={colo.dismissEvolution}
      />
    </ColoContext.Provider>
  );
};

export default ColoProvider;
