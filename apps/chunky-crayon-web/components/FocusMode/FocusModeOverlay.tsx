'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusMode } from './FocusModeProvider';

/**
 * Backdrop scrim rendered when focus mode is active on mobile. Covers
 * the entire viewport at z-[55], hiding the page chrome behind a
 * solid surface. The canvas card + drawer sit at z-[56]+ so they
 * punch through.
 *
 * Mobile-only by design — on desktop / tablet, focus mode hides
 * chrome via `.focus-mode-hide` CSS rules + the Fullscreen API
 * (managed by FocusModeProvider). No scrim needed because there's
 * no canvas-promotion to cover under, and the sidebars stay visible
 * as tools the kid uses.
 *
 * Lives in a body portal so it's not constrained by parent stacking
 * contexts. Solid bg-paper-cream matches the page background so the
 * canvas feels like it's on its own clean surface.
 */
const FocusModeOverlay = () => {
  const { isFocusMode } = useFocusMode();
  const [mounted, setMounted] = useState(false);

  // Portal needs document.body which doesn't exist during SSR.
  useEffect(() => setMounted(true), []);

  if (!mounted || !isFocusMode) return null;

  return createPortal(
    <div
      aria-hidden
      className="md:hidden fixed inset-0 z-[55] bg-paper-cream"
    />,
    document.body,
  );
};

export default FocusModeOverlay;
