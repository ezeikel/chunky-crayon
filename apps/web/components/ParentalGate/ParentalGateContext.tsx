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
  openGate: (targetPath: string) => void;
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

type ParentalGateProviderProps = {
  children: ReactNode;
};

export const ParentalGateProvider = ({
  children,
}: ParentalGateProviderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [targetPath, setTargetPath] = useState('');

  const openGate = useCallback((path: string) => {
    setTargetPath(path);
    setIsOpen(true);
  }, []);

  return (
    <ParentalGateContext.Provider value={{ openGate }}>
      {children}
      <ParentalGateModal
        open={isOpen}
        onOpenChange={setIsOpen}
        targetPath={targetPath}
      />
    </ParentalGateContext.Provider>
  );
};
