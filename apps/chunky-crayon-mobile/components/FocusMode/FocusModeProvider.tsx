import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

/**
 * Focus mode is the "remove the chrome" state for the coloring canvas
 * screen — same idea as web's
 * `apps/chunky-crayon-web/components/FocusMode/FocusModeProvider.tsx`.
 *
 * What focus mode hides on mobile:
 *   - The status bar (handled by FocusModeStatusBar)
 *   - The Stack screen header (chevron back) — handled by the
 *     coloring-image route reading `useFocusMode()` and toggling
 *     `Stack.Screen options.headerShown`
 *   - The bottom tab bar — only relevant if focus mode is ever
 *     activated from inside a tab screen (the coloring-image route
 *     isn't a tab, so this is mostly defensive)
 *   - AppHeader, ProgressIndicator + MuteToggle row, and the side
 *     toolbars on iPad
 *
 * What stays:
 *   - The canvas itself
 *   - A floating exit X (top-right, safe-area-respecting)
 *
 * Web's pattern toggles a `data-focus-mode` attribute on `<html>` and
 * CSS does the hiding. RN has no CSS cascading, so the React-context
 * approach above is the equivalent — every chrome surface reads
 * `useFocusMode()` and decides whether to render itself.
 *
 * Browser Fullscreen API has no equivalent on iOS Safari WebView —
 * Apple intentionally doesn't expose true fullscreen to apps. The
 * status-bar + tab-bar + header hide is the closest mobile gets.
 */

type FocusModeContextValue = {
  isFocusMode: boolean;
  enterFocus: () => void;
  exitFocus: () => void;
  toggleFocus: () => void;
};

const FocusModeContext = createContext<FocusModeContextValue | null>(null);

export const useFocusMode = (): FocusModeContextValue => {
  const ctx = useContext(FocusModeContext);
  if (!ctx) {
    // Sensible no-op fallback so components don't crash when
    // rendered outside the provider (e.g. inside Storybook stories
    // that don't wrap with FocusModeProvider, or marketing surfaces).
    return {
      isFocusMode: false,
      enterFocus: () => {},
      exitFocus: () => {},
      toggleFocus: () => {},
    };
  }
  return ctx;
};

export const FocusModeProvider = ({ children }: { children: ReactNode }) => {
  const [isFocusMode, setIsFocusMode] = useState(false);

  const enterFocus = useCallback(() => setIsFocusMode(true), []);
  const exitFocus = useCallback(() => setIsFocusMode(false), []);
  const toggleFocus = useCallback(() => setIsFocusMode((prev) => !prev), []);

  const value = useMemo(
    () => ({ isFocusMode, enterFocus, exitFocus, toggleFocus }),
    [isFocusMode, enterFocus, exitFocus, toggleFocus],
  );

  return (
    <FocusModeContext.Provider value={value}>
      {children}
    </FocusModeContext.Provider>
  );
};

export default FocusModeProvider;
