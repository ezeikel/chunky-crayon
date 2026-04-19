"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

/**
 * Shared state for the create-coloring-page form's three input modes
 * (text / voice / image). Each app's form composes this provider with
 * its own brand-specific input shells and server actions.
 */

export type InputMode = "text" | "voice" | "image";

export type InputModeState = {
  mode: InputMode;
  /** The processed text from voice/image (or the direct text input) */
  description: string;
  /** Whether voice/image is currently being processed */
  isProcessing: boolean;
  /** Error message from processing */
  error: string | null;
  /** Whether the input is ready for form submission */
  isReady: boolean;
  /**
   * True while the input is in a transient inner state that owns the UX
   * (recording, capturing, previewing, error). The shared FormCTA hides
   * while busy so the input's own in-flow controls take over.
   */
  isBusy: boolean;
};

export type InputModeActions = {
  setMode: (mode: InputMode) => void;
  setDescription: (description: string) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  setIsBusy: (isBusy: boolean) => void;
  reset: () => void;
};

export type InputModeContextValue = InputModeState & InputModeActions;

const InputModeContext = createContext<InputModeContextValue | null>(null);

const initialState: InputModeState = {
  mode: "text",
  description: "",
  isProcessing: false,
  error: null,
  isReady: false,
  isBusy: false,
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
      isBusy: false,
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

  const setIsBusy = useCallback((isBusy: boolean) => {
    setState((prev) => ({ ...prev, isBusy }));
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
      setIsBusy,
      reset,
    }),
    [
      state,
      setMode,
      setDescription,
      setIsProcessing,
      setError,
      setIsBusy,
      reset,
    ],
  );

  return (
    <InputModeContext.Provider value={value}>
      {children}
    </InputModeContext.Provider>
  );
}

export function useInputMode(): InputModeContextValue {
  const context = useContext(InputModeContext);
  if (!context) {
    throw new Error("useInputMode must be used within an InputModeProvider");
  }
  return context;
}

export default InputModeContext;
