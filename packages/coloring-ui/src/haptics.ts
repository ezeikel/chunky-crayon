/**
 * Haptic feedback utility using the Vibration API.
 * Provides tactile feedback on mobile devices that support it.
 * No-op on desktop or unsupported browsers.
 */

import type { ColoringVariant } from "./context";

/** Check if Vibration API is available */
const canVibrate = (): boolean =>
  typeof navigator !== "undefined" && "vibrate" in navigator;

/**
 * Trigger a haptic pulse.
 * @param pattern - Duration in ms, or array of [vibrate, pause, vibrate, ...]
 */
function vibrate(pattern: number | readonly number[]): void {
  if (canVibrate()) {
    try {
      navigator.vibrate(typeof pattern === "number" ? pattern : [...pattern]);
    } catch {
      // Ignore errors (e.g., no user activation yet)
    }
  }
}

/** Predefined haptic patterns */
const patterns = {
  /** Tiny tap — color selection, tool switch */
  tap: 10,
  /** Short pulse — fill complete, sticker placed */
  short: 40,
  /** Medium pulse — undo/redo */
  medium: [25, 40, 25],
  /** Celebration — completion */
  celebration: [50, 30, 80, 30, 50],
  /** Error — action failed */
  error: [80, 50, 80],
} as const;

/**
 * Haptic feedback interface.
 * All methods are no-ops if the Vibration API is not available.
 */
export const haptics = {
  /** Color selected or tool switched */
  tap: (variant?: ColoringVariant) => {
    // Kids get slightly stronger feedback
    vibrate(variant === "kids" ? 15 : patterns.tap);
  },

  /** Fill completed or sticker placed */
  fill: (variant?: ColoringVariant) => {
    vibrate(variant === "kids" ? 60 : patterns.short);
  },

  /** Undo or redo */
  undoRedo: () => {
    vibrate(patterns.medium);
  },

  /** Coloring completed */
  celebration: (variant?: ColoringVariant) => {
    vibrate(variant === "kids" ? [80, 40, 120, 40, 80] : patterns.celebration);
  },

  /** Error feedback */
  error: () => {
    vibrate(patterns.error);
  },

  /** Raw vibrate for custom patterns */
  vibrate,

  /** Check if haptics are available */
  isAvailable: canVibrate,
};
