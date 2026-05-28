import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

/**
 * Create-form input-mode state for mobile.
 *
 * Shape-matched 1:1 to coloring-ui's InputMode context (web's source of
 * truth) so the form behaves identically across platforms. We keep a
 * STANDALONE copy here rather than importing coloring-ui's barrel —
 * that barrel re-exports web-DOM components (SceneBuilder, ImageCanvas)
 * which would break the Metro bundle. Only the context contract is
 * shared in spirit; the implementation lives here.
 *
 * "scene" is the privacy-first Scene Builder — the DEFAULT create mode
 * (tap-only, no free-text / mic / camera). text / voice / image are
 * gateable and locked per child profile until a parent unlocks them
 * (see feedback_cc_create_mode_parent_gating).
 */

export type InputMode = "scene" | "text" | "voice" | "image";

export type InputModeState = {
  mode: InputMode;
  /** Processed text from voice/scene, or the direct text input. */
  description: string;
  /**
   * Base64 data URL of the user's photo in image mode. Drives the
   * photo-to-coloring pipeline at submit time.
   */
  imageBase64: string | null;
  /** Whether voice/image is currently being processed. */
  isProcessing: boolean;
  /** Error message from processing. */
  error: string | null;
  /** Whether the input is ready for form submission. */
  isReady: boolean;
  /**
   * True while the input owns a transient inner UX (recording,
   * capturing, previewing, error). The shared FormCTA hides while busy
   * so the input's own in-flow controls take over.
   */
  isBusy: boolean;
};

export type InputModeActions = {
  setMode: (mode: InputMode) => void;
  setDescription: (description: string) => void;
  /** Set the base64 photo payload (image mode only). */
  setImageBase64: (imageBase64: string | null) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  setIsBusy: (isBusy: boolean) => void;
  reset: () => void;
};

export type InputModeContextValue = InputModeState & InputModeActions;

const InputModeContext = createContext<InputModeContextValue | null>(null);

const initialState: InputModeState = {
  mode: "scene",
  description: "",
  imageBase64: null,
  isProcessing: false,
  error: null,
  isReady: false,
  isBusy: false,
};

type InputModeProviderProps = {
  children: ReactNode;
  /** Initial mode. Defaults to "scene" (the privacy-first default). */
  initialMode?: InputMode;
};

export function InputModeProvider({
  children,
  initialMode = "scene",
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
      // Description survives only when staying in/returning to text;
      // scene mirrors its own built description in via setDescription.
      description: mode === "text" ? prev.description : "",
      // Image payload only belongs to image mode.
      imageBase64: mode === "image" ? prev.imageBase64 : null,
      isReady: mode === "text" ? prev.description.trim().length > 0 : false,
    }));
  }, []);

  const setDescription = useCallback((description: string) => {
    setState((prev) => ({
      ...prev,
      description,
      isReady:
        prev.mode === "image"
          ? prev.imageBase64 !== null
          : description.trim().length > 0,
      error: null,
    }));
  }, []);

  const setImageBase64 = useCallback((imageBase64: string | null) => {
    setState((prev) => ({
      ...prev,
      imageBase64,
      isReady: prev.mode === "image" ? imageBase64 !== null : prev.isReady,
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
      mode: prev.mode, // Keep the current mode.
    }));
  }, []);

  const value = useMemo<InputModeContextValue>(
    () => ({
      ...state,
      setMode,
      setDescription,
      setImageBase64,
      setIsProcessing,
      setError,
      setIsBusy,
      reset,
    }),
    [
      state,
      setMode,
      setDescription,
      setImageBase64,
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
