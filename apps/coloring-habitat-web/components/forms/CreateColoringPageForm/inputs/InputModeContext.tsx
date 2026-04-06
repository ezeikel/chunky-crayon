"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

// =============================================================================
// Types
// =============================================================================

export type InputMode = "text" | "voice" | "image";

export type InputModeState = {
  mode: InputMode;
  description: string;
  isProcessing: boolean;
  error: string | null;
  isReady: boolean;
};

export type InputModeActions = {
  setMode: (mode: InputMode) => void;
  setDescription: (description: string) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

export type InputModeContextValue = InputModeState & InputModeActions;

// =============================================================================
// Context
// =============================================================================

const InputModeContext = createContext<InputModeContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

const initialState: InputModeState = {
  mode: "text",
  description: "",
  isProcessing: false,
  error: null,
  isReady: false,
};

type InputModeProviderProps = {
  children: ReactNode;
  initialMode?: InputMode;
};

export function InputModeProvider({
  children,
  initialMode = "text",
}: InputModeProviderProps) {
  const [state, setState] = useState<InputModeState>({
    ...initialState,
    mode: initialMode,
  });

  const setMode = useCallback((mode: InputMode) => {
    setState((prev) => ({
      ...prev,
      mode,
      isProcessing: false,
      error: null,
      description: mode === "text" ? prev.description : "",
      isReady: mode === "text" ? prev.description.trim().length > 0 : false,
    }));
  }, []);

  const setDescription = useCallback((description: string) => {
    setState((prev) => ({
      ...prev,
      description,
      isReady: description.trim().length > 0,
      error: null,
    }));
  }, []);

  const setIsProcessing = useCallback((isProcessing: boolean) => {
    setState((prev) => ({
      ...prev,
      isProcessing,
      error: isProcessing ? null : prev.error,
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({
      ...prev,
      error,
      isProcessing: false,
      isReady: false,
    }));
  }, []);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...initialState,
      mode: prev.mode,
    }));
  }, []);

  const value = useMemo<InputModeContextValue>(
    () => ({
      ...state,
      setMode,
      setDescription,
      setIsProcessing,
      setError,
      reset,
    }),
    [state, setMode, setDescription, setIsProcessing, setError, reset],
  );

  return (
    <InputModeContext.Provider value={value}>
      {children}
    </InputModeContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useInputMode(): InputModeContextValue {
  const context = useContext(InputModeContext);

  if (!context) {
    throw new Error("useInputMode must be used within an InputModeProvider");
  }

  return context;
}

export default InputModeContext;
