'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusMode } from './FocusModeProvider';

/**
 * Backdrop scrim rendered when focus mode is active on mobile. Covers
 * the entire viewport at z-[55], hiding the page chrome (header,
 * breadcrumbs, footer, related-pages section) behind a solid surface.
 * The canvas card + drawer sit at z-[56]+ so they punch through.
 *
 * Lives in a body portal so it's not constrained by parent stacking
 * contexts. Solid bg-paper-cream matches the page background so the
 * canvas feels like it's on its own clean surface.
 *
 * The actual scroll lock and focus-mode-data attribute are managed by
 * FocusModeProvider — this component is purely visual.
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
