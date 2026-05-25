'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

/**
 * Confetti burst on save / sticker unlock / colo evolution.
 *
 * Switched from the hand-rolled framer-motion gravity drop to
 * `canvas-confetti` on 2026-05 — the previous implementation
 * rendered 50 pastel SVG/divs in `position: fixed` and felt slow +
 * washed-out against the cream paper background. canvas-confetti is
 * GPU-accelerated, hits ~60fps on phones, and the saturated CC
 * crayon palette below pops on cream.
 *
 * Pattern: two side-firing bursts in quick succession (`school-pride`
 * style) → a tall centre burst for the "money shot". Plays out in
 * ~1.5s, then auto-cleans the canvas. `isActive` toggling re-fires
 * the burst; the host component still owns when to trigger.
 *
 * The library mounts its own full-viewport canvas behind everything;
 * we don't render any DOM ourselves.
 */

type ConfettiProps = {
  isActive: boolean;
  onComplete?: () => void;
  /** Duration before `onComplete` fires. Default 1500ms; the library
   *  itself animates particles to settle over ~3s — the host can
   *  re-trigger the next celebration any time after `onComplete`. */
  duration?: number;
  /**
   * Kept for API compatibility with the previous hand-rolled Confetti
   * component. Ignored — canvas-confetti uses fixed particle counts
   * tuned for chunky kid-feel. Remove from callers once everyone is
   * migrated.
   */
  pieceCount?: number;
};

// CC crayon palette — saturated tokens, not the muted-pastel
// versions used elsewhere. These read as confetti on cream.
const CC_CRAYON_COLORS = [
  '#FF6B35', // crayon orange
  '#FFC638', // crayon yellow
  '#F95880', // crayon pink
  '#7CC576', // crayon green
  '#5DADE2', // crayon sky
  '#9B59B6', // crayon purple
  '#FF8C7C', // coral
  '#F5A623', // tangerine
];

const sideBurst = (originX: number, angle: number) => {
  confetti({
    particleCount: 45,
    angle,
    spread: 70,
    startVelocity: 55,
    origin: { x: originX, y: 0.7 },
    colors: CC_CRAYON_COLORS,
    scalar: 1.2, // bigger particles so they read as chunky
    ticks: 220,
    shapes: ['circle', 'square'],
    zIndex: 60,
  });
};

const centerBurst = () => {
  confetti({
    particleCount: 80,
    angle: 90,
    spread: 110,
    startVelocity: 45,
    origin: { x: 0.5, y: 0.8 },
    colors: CC_CRAYON_COLORS,
    scalar: 1.4,
    ticks: 260,
    shapes: ['circle', 'square'],
    zIndex: 60,
  });
};

const Confetti = ({ isActive, onComplete, duration = 1500 }: ConfettiProps) => {
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      hasFiredRef.current = false;
      return undefined;
    }
    if (hasFiredRef.current) return undefined;
    hasFiredRef.current = true;

    // Side fires first (school-pride pattern), then a centre money
    // shot a quarter-second later for a layered, less monotone feel.
    sideBurst(0.05, 60);
    sideBurst(0.95, 120);
    const centerTimer = setTimeout(centerBurst, 250);

    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(centerTimer);
      clearTimeout(completeTimer);
    };
  }, [isActive, duration, onComplete]);

  return null;
};

export default Confetti;
