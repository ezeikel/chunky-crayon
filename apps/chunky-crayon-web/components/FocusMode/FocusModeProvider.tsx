'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

/**
 * Focus mode is the "remove the chrome" state for the coloring canvas
 * page. Auto-enters on first color pick — the moment the user commits
 * to coloring, the global header + breadcrumbs + footer fade out so
 * the canvas claims the full viewport. A floating X button (top-right)
 * lets the user exit.
 *
 * Implementation: a single `data-focus-mode` attribute is toggled on
 * `<html>`. CSS in globals.css drives the actual hiding — no
 * re-mounting, no prop drilling. Any element that wants to fade with
 * focus mode just needs `focus-mode:hidden` (selector below) or to
 * read `useFocusMode()` directly.
 *
 * Cross-breakpoint behaviour (as of the 2026-05 lift):
 *   - Mobile: scrim covers chrome; canvas card + bottom drawer punch
 *     through above the scrim. Focus mode targets the iOS-Safari-URL-
 *     bar + drawer + header crowding problem.
 *   - Tablet + desktop: same CC chrome hides; sidebars / toolbar stay
 *     visible (they're tools, not chrome). On top of the CC hide we
 *     ALSO request browser Fullscreen API so the browser tab bar and
 *     OS chrome disappear — true cinema mode. Esc exits both via the
 *     `fullscreenchange` listener wiring below.
 */

type FocusModeContextValue = {
  isFocusMode: boolean;
  enterFocus: () => void;
  exitFocus: () => void;
};

const FocusModeContext = createContext<FocusModeContextValue | null>(null);

export const useFocusMode = (): FocusModeContextValue => {
  const ctx = useContext(FocusModeContext);
  if (!ctx) {
    // Sensible no-op fallback so components don't crash if used outside
    // the provider (e.g. inside the marketing surfaces that don't need it).
    return {
      isFocusMode: false,
      enterFocus: () => {},
      exitFocus: () => {},
    };
  }
  return ctx;
};

// Try the browser Fullscreen API and swallow failures. Browsers reject
// requestFullscreen() when there isn't a user activation (e.g. the
// state-restore call inside fullscreenchange below), or when the page
// is in an iframe without `allowfullscreen`. Both are expected — we
// still want CC chrome hidden, just without OS chrome too.
const tryRequestFullscreen = async (): Promise<void> => {
  if (typeof document === 'undefined') return;
  if (document.fullscreenElement) return;
  try {
    await document.documentElement.requestFullscreen();
  } catch {
    // Most common in Storybook (cross-origin iframe) and on Safari
    // when the gesture is too far from the call. Not actionable.
  }
};

const tryExitFullscreen = async (): Promise<void> => {
  if (typeof document === 'undefined') return;
  if (!document.fullscreenElement) return;
  try {
    await document.exitFullscreen();
  } catch {
    // No-op — same reasoning as above.
  }
};

export const FocusModeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isFocusMode, setIsFocusMode] = useState(false);

  const enterFocus = useCallback(() => {
    if (typeof window === 'undefined') return;
    setIsFocusMode(true);
    // Fire-and-forget; UI state is the source of truth, the Fullscreen
    // promise resolving or rejecting doesn't change anything for us.
    void tryRequestFullscreen();
  }, []);

  const exitFocus = useCallback(() => {
    setIsFocusMode(false);
    void tryExitFullscreen();
  }, []);

  // Drive the CSS hide via a data attribute on <html>. Toggling on
  // <html> (not <body>) so iOS Safari's scrollbar/safe-area styling
  // sees it too, and it's the most reliable selector for global
  // ancestor CSS rules.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isFocusMode) {
      root.setAttribute('data-focus-mode', '');
    } else {
      root.removeAttribute('data-focus-mode');
    }
    return () => {
      root.removeAttribute('data-focus-mode');
    };
  }, [isFocusMode]);

  // Sync React state with the browser's own fullscreen state. The user
  // can exit fullscreen via Esc / F11 / OS-level chrome at any time;
  // without this listener the floating X stays rendered and the kid is
  // stuck in a half-state (CC chrome hidden but browser chrome back).
  // Mirror the browser's truth: when fullscreenElement goes null while
  // we're still in focus mode, exit focus too.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleChange = () => {
      if (!document.fullscreenElement && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, [isFocusMode]);

  const value = useMemo(
    () => ({ isFocusMode, enterFocus, exitFocus }),
    [isFocusMode, enterFocus, exitFocus],
  );

  return (
    <FocusModeContext.Provider value={value}>
      {children}
    </FocusModeContext.Provider>
  );
};

export default FocusModeProvider;
