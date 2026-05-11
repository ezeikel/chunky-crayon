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
 * Focus mode is a mobile-only "remove the chrome" state for the coloring
 * canvas page. Auto-enters on first color pick — the moment the user
 * commits to coloring, the global header + breadcrumbs fade out so the
 * canvas claims the full viewport. A floating X button (top-right) lets
 * the user exit.
 *
 * Implementation: a single `data-focus-mode` attribute is toggled on
 * `<html>`. CSS in globals.css drives the actual hiding — no
 * re-mounting, no prop drilling. Any element that wants to fade with
 * focus mode just needs `focus-mode:hidden` (selector below) or to
 * read `useFocusMode()` directly.
 *
 * Desktop never auto-enters because the bounce problem we're solving
 * is mobile-specific (Safari URL bar + our drawer + header = ~half the
 * viewport gone). On md+ breakpoints the provider's `enterFocus` is a
 * no-op.
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

export const FocusModeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isFocusMode, setIsFocusMode] = useState(false);

  const enterFocus = useCallback(() => {
    if (typeof window === 'undefined') return;
    // Mobile-only. Use the same Tailwind md breakpoint we use everywhere
    // else (768px) so the gate is consistent. matchMedia avoids JS
    // resize churn — we just check once per call.
    if (window.matchMedia('(min-width: 768px)').matches) return;
    setIsFocusMode(true);
  }, []);

  const exitFocus = useCallback(() => {
    setIsFocusMode(false);
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
