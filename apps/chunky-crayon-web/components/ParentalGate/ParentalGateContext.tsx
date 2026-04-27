'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import ParentalGateModal from './ParentalGateModal';

type ParentalGateContextType = {
  /**
   * Open the gate and (on success) navigate to `targetPath` OR call
   * `onSuccess`. Use the path form for "open external link" type uses
   * (the original use case) and the callback form for in-page actions
   * like enabling voice mode.
   */
  openGate: (
    target: string | { onSuccess: () => void; reason?: string },
  ) => void;
};

const ParentalGateContext = createContext<ParentalGateContextType | null>(null);

export const useParentalGate = () => {
  const context = useContext(ParentalGateContext);
  if (!context) {
    throw new Error(
      'useParentalGate must be used within a ParentalGateProvider',
    );
  }
  return context;
};

// Safe version that returns null if used outside provider (for hooks that may run outside)
export const useParentalGateSafe = () => {
  return useContext(ParentalGateContext);
};

type ParentalGateProviderProps = {
  children: ReactNode;
};

export const ParentalGateProvider = ({
  children,
}: ParentalGateProviderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [targetPath, setTargetPath] = useState('');
  const [onSuccess, setOnSuccess] = useState<(() => void) | null>(null);

  const openGate = useCallback<ParentalGateContextType['openGate']>(
    (target) => {
      if (typeof target === 'string') {
        setTargetPath(target);
        setOnSuccess(null);
      } else {
        setTargetPath('');
        // Wrap the callback in a thunk because useState resolves a function
        // initialiser, not a function value.
        setOnSuccess(() => target.onSuccess);
      }
      setIsOpen(true);
    },
    [],
  );

  return (
    <ParentalGateContext.Provider value={{ openGate }}>
      {children}
      <ParentalGateModal
        open={isOpen}
        onOpenChange={setIsOpen}
        targetPath={targetPath}
        onSuccess={onSuccess ?? undefined}
      />
    </ParentalGateContext.Provider>
  );
};
