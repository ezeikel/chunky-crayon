'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type PortalProps = {
  children: ReactNode;
  /**
   * Override the portal target. Defaults to `document.body`. Pass an
   * element ref if you need the portal to land somewhere specific (rare).
   */
  container?: HTMLElement | null;
};

/**
 * Portal helper that renders children at `document.body` (or a custom
 * container) so `position: fixed` overlays escape ancestor containing
 * blocks created by `transform`, `filter`, `backdrop-filter`,
 * `will-change`, etc.
 *
 * Why this matters: a hand-rolled `<div className="fixed inset-0">`
 * looks like it should overlay the viewport, but if any ancestor uses
 * `backdrop-blur` (or other CSS that creates a stacking/containing
 * block) the modal is constrained to that ancestor's box. Rendering
 * through a portal sidesteps the entire ancestor chain.
 *
 * SSR-safe: returns `null` on the server and on the first client
 * render so `document.body` is always defined when we touch it.
 */
const Portal = ({ children, container }: PortalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(children, container ?? document.body);
};

export default Portal;
