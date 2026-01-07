import { PointerType } from "react-native-gesture-handler";
import type { BrushType } from "@/stores/canvasStore";
import { getBrushMultiplier } from "./brushShaders";

/**
 * Pressure sensitivity utilities for Apple Pencil support.
 *
 * Apple Pencil provides force values from 0.0 to 1.0 (or higher on some devices).
 * Finger touch typically has no force data (undefined) or force of 0.
 */

/** Default pressure when no force data available (finger touch) */
export const DEFAULT_PRESSURE = 0.5;

/** Minimum pressure to avoid invisible strokes */
export const MIN_PRESSURE = 0.1;

/** Maximum pressure clamp */
export const MAX_PRESSURE = 1.0;

/**
 * Pressure curve exponent - controls how pressure affects stroke width.
 * Lower values = softer curve (easier for kids)
 * Higher values = more sensitive to pressure changes
 *
 * 0.7 is kid-friendly: light pressure still produces visible strokes
 */
const PRESSURE_CURVE_EXPONENT = 0.7;

/**
 * Width range as percentage of base size.
 * MIN_WIDTH_FACTOR = 0.5 means lightest pressure = 50% of base width
 * MAX_WIDTH_FACTOR = 1.0 means maximum pressure = 100% of base width
 */
const MIN_WIDTH_FACTOR = 0.5;
const MAX_WIDTH_FACTOR = 1.0;

/**
 * Applies a kid-friendly pressure curve to raw pressure values.
 * Uses power curve to make light strokes easier.
 *
 * @param rawPressure - Raw pressure from 0-1 (or undefined for finger)
 * @returns Normalized pressure from 0-1
 */
export const applyPressureCurve = (rawPressure: number | undefined): number => {
  // Fallback for finger touch (no pressure data)
  if (rawPressure === undefined || rawPressure === 0) {
    return DEFAULT_PRESSURE;
  }

  // Clamp to valid range
  const clamped = Math.max(MIN_PRESSURE, Math.min(MAX_PRESSURE, rawPressure));

  // Apply power curve - softer response for kids
  return Math.pow(clamped, PRESSURE_CURVE_EXPONENT);
};

/**
 * Calculates the dynamic brush width based on pressure.
 *
 * @param baseSize - Base brush size from settings
 * @param brushType - Type of brush (affects multiplier)
 * @param pressure - Normalized pressure from applyPressureCurve (0-1)
 * @returns Final stroke width in pixels
 */
export const getPressureAdjustedWidth = (
  baseSize: number,
  brushType: BrushType,
  pressure: number,
): number => {
  // Get brush-specific multiplier
  const brushMultiplier = getBrushMultiplier(brushType);

  // Calculate width factor based on pressure
  // Maps pressure 0-1 to MIN_WIDTH_FACTOR-MAX_WIDTH_FACTOR range
  const widthFactor =
    MIN_WIDTH_FACTOR + pressure * (MAX_WIDTH_FACTOR - MIN_WIDTH_FACTOR);

  return baseSize * brushMultiplier * widthFactor;
};

/**
 * Checks if input is from Apple Pencil (stylus).
 *
 * @param pointerType - The pointer type from gesture event (can be enum or string)
 * @returns True if Apple Pencil or stylus
 */
export const isApplePencil = (
  pointerType: PointerType | string | undefined,
): boolean => {
  // Handle react-native-gesture-handler PointerType enum
  if (typeof pointerType === "number") {
    return pointerType === PointerType.STYLUS;
  }
  // Handle string fallback (for older versions or web)
  return pointerType === "stylus" || pointerType === "pen";
};

/**
 * Extracts pressure from gesture event with fallback.
 *
 * @param event - Gesture handler event with optional force property
 * @returns Normalized pressure value
 */
export const getPressureFromEvent = (event: {
  force?: number;
  pressure?: number;
  pointerType?: PointerType | string;
}): number => {
  // Try force first (iOS), then pressure (Android)
  const rawPressure = event.force ?? event.pressure;
  return applyPressureCurve(rawPressure);
};

/**
 * Smooths pressure values over time to reduce jitter.
 * Uses simple moving average.
 */
export class PressureSmoother {
  private values: number[] = [];
  private readonly windowSize: number;

  constructor(windowSize: number = 3) {
    this.windowSize = windowSize;
  }

  /**
   * Adds a new pressure value and returns smoothed result.
   */
  add(pressure: number): number {
    this.values.push(pressure);

    // Keep only last N values
    if (this.values.length > this.windowSize) {
      this.values.shift();
    }

    // Return average
    return this.values.reduce((a, b) => a + b, 0) / this.values.length;
  }

  /**
   * Resets the smoother (call on stroke end).
   */
  reset(): void {
    this.values = [];
  }
}

/**
 * Type for storing pressure points with a stroke.
 * Each point corresponds to a path point.
 */
export type PressurePoint = {
  pressure: number;
  isStylus: boolean;
};

/**
 * Creates a pressure point record.
 */
export const createPressurePoint = (
  pressure: number,
  isStylus: boolean,
): PressurePoint => ({
  pressure: applyPressureCurve(pressure),
  isStylus,
});
