import * as Haptics from "expo-haptics";
import type { BrushType } from "@/stores/canvasStore";

/**
 * Haptic feedback utilities for kid-friendly tactile responses
 */

/**
 * Light tap - for color/tool selection
 */
export const tapLight = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/**
 * Medium tap - for brush type selection, undo/redo
 */
export const tapMedium = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

/**
 * Heavy tap - for fill action, stamp placement
 */
export const tapHeavy = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

/**
 * Success feedback - for completing actions
 */
export const notifySuccess = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/**
 * Warning feedback - for undo limit reached
 */
export const notifyWarning = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};

/**
 * Selection changed feedback
 */
export const selectionChanged = () => {
  Haptics.selectionAsync();
};

/**
 * Brush-specific haptic configurations.
 * Different brushes feel different when drawing:
 * - Crayon: Rough, frequent feedback like real crayon texture
 * - Marker: Smooth, less frequent feedback
 * - Pencil: Light, subtle feedback
 * - Others: Medium default feedback
 */
type BrushHapticConfig = {
  interval: number; // ms between haptic pulses
  style: Haptics.ImpactFeedbackStyle;
};

const BRUSH_HAPTIC_CONFIG: Record<BrushType, BrushHapticConfig> = {
  crayon: {
    interval: 50, // Rough, frequent - like crayon texture
    style: Haptics.ImpactFeedbackStyle.Light,
  },
  marker: {
    interval: 150, // Smooth, less frequent
    style: Haptics.ImpactFeedbackStyle.Medium,
  },
  pencil: {
    interval: 80, // Light scratchy feeling
    style: Haptics.ImpactFeedbackStyle.Light,
  },
  rainbow: {
    interval: 100, // Playful, moderate
    style: Haptics.ImpactFeedbackStyle.Medium,
  },
  glow: {
    interval: 200, // Ethereal, subtle
    style: Haptics.ImpactFeedbackStyle.Light,
  },
  neon: {
    interval: 120, // Electric buzz
    style: Haptics.ImpactFeedbackStyle.Medium,
  },
  glitter: {
    interval: 60, // Sparkly, frequent small pulses
    style: Haptics.ImpactFeedbackStyle.Light,
  },
};

/**
 * Controller for continuous haptic feedback during brush strokes.
 * Provides different tactile sensations for each brush type.
 *
 * Usage:
 * ```
 * const hapticController = new BrushHapticController();
 *
 * // On stroke start:
 * hapticController.start('crayon');
 *
 * // On stroke end:
 * hapticController.stop();
 * ```
 */
export class BrushHapticController {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private enabled = true;

  /**
   * Sets whether haptic feedback is enabled.
   * Call this based on user preferences or device capabilities.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  /**
   * Checks if haptics are currently enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Starts continuous haptic feedback for the specified brush type.
   * Automatically stops any existing feedback first.
   *
   * @param brushType - Type of brush being used
   */
  start(brushType: BrushType): void {
    if (!this.enabled) return;

    // Stop any existing haptic feedback
    this.stop();

    const config = BRUSH_HAPTIC_CONFIG[brushType];
    this.isRunning = true;

    // Initial haptic on stroke start
    Haptics.impactAsync(config.style);

    // Set up continuous feedback
    this.intervalId = setInterval(() => {
      if (this.isRunning) {
        Haptics.impactAsync(config.style);
      }
    }, config.interval);
  }

  /**
   * Stops continuous haptic feedback.
   * Safe to call even if not currently running.
   */
  stop(): void {
    this.isRunning = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Triggers a single haptic pulse for the brush type.
   * Useful for discrete events during drawing.
   *
   * @param brushType - Type of brush
   */
  pulse(brushType: BrushType): void {
    if (!this.enabled) return;
    const config = BRUSH_HAPTIC_CONFIG[brushType];
    Haptics.impactAsync(config.style);
  }
}

/**
 * Singleton instance for global use.
 * Import and use directly for simple cases.
 */
export const brushHaptics = new BrushHapticController();
