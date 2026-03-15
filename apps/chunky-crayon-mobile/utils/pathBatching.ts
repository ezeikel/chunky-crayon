import { SkPath, Skia } from "@shopify/react-native-skia";
import type { DrawingAction, BrushType } from "@/stores/canvasStore";

/**
 * Path batching utilities for grouping strokes by visual properties.
 *
 * Batching similar strokes together improves rendering performance by:
 * - Reducing the number of draw calls
 * - Allowing GPU to optimize similar operations
 * - Minimizing state changes between renders
 */

/**
 * Key used to group strokes with identical visual properties
 */
type BatchKey = string;

/**
 * A batch of strokes that can be rendered together
 */
export type StrokeBatch = {
  /** Unique key identifying this batch's visual properties */
  key: BatchKey;
  /** Color shared by all strokes in this batch */
  color: string;
  /** Brush type shared by all strokes */
  brushType: BrushType;
  /** Stroke width shared by all strokes */
  strokeWidth: number;
  /** Combined path containing all strokes (for non-special brushes) */
  combinedPath?: SkPath;
  /** Original actions (for special brushes that can't be combined) */
  actions: DrawingAction[];
};

/**
 * Brush types that require individual rendering (can't be combined)
 * These have special effects like blur, glow, or particles
 */
const SPECIAL_BRUSH_TYPES: BrushType[] = ["glow", "neon", "glitter", "rainbow"];

/**
 * Creates a batch key from stroke visual properties.
 * Strokes with the same key can potentially be rendered together.
 *
 * @param color - Stroke color
 * @param brushType - Type of brush
 * @param strokeWidth - Width of stroke
 * @returns Unique key for this combination
 */
const createBatchKey = (
  color: string,
  brushType: BrushType,
  strokeWidth: number,
): BatchKey => {
  // Round stroke width to reduce batch fragmentation
  const roundedWidth = Math.round(strokeWidth * 10) / 10;
  return `${color}|${brushType}|${roundedWidth}`;
};

/**
 * Checks if a brush type can be batched (combined into single path)
 */
const canBatchBrushType = (brushType: BrushType): boolean => {
  return !SPECIAL_BRUSH_TYPES.includes(brushType);
};

/**
 * Combines multiple paths into a single path.
 * This is more efficient for rendering than drawing each path separately.
 *
 * @param paths - Array of paths to combine
 * @returns Combined path
 */
export const combinePaths = (paths: SkPath[]): SkPath => {
  const combined = Skia.Path.Make();

  for (const path of paths) {
    combined.addPath(path);
  }

  return combined;
};

/**
 * Groups stroke actions into batches for optimized rendering.
 *
 * Strokes with the same color, brush type, and width are grouped together.
 * Special brush types (glow, neon, glitter, rainbow) are kept separate
 * since they require individual rendering effects.
 *
 * @param actions - Array of drawing actions to batch
 * @returns Array of stroke batches
 */
export const batchStrokes = (actions: DrawingAction[]): StrokeBatch[] => {
  const batchMap = new Map<BatchKey, StrokeBatch>();
  const batches: StrokeBatch[] = [];

  // Filter to only stroke actions with paths
  const strokeActions = actions.filter(
    (action) => action.type === "stroke" && action.path,
  );

  for (const action of strokeActions) {
    const brushType = action.brushType || "crayon";
    const strokeWidth = action.strokeWidth || 10;
    const key = createBatchKey(action.color, brushType, strokeWidth);

    if (!canBatchBrushType(brushType)) {
      // Special brushes get their own batch (can't combine paths)
      batches.push({
        key,
        color: action.color,
        brushType,
        strokeWidth,
        actions: [action],
      });
      continue;
    }

    // Get or create batch for this key
    let batch = batchMap.get(key);
    if (!batch) {
      batch = {
        key,
        color: action.color,
        brushType,
        strokeWidth,
        actions: [],
      };
      batchMap.set(key, batch);
    }

    batch.actions.push(action);
  }

  // Combine paths for each batchable group
  for (const batch of batchMap.values()) {
    if (batch.actions.length > 1 && canBatchBrushType(batch.brushType)) {
      const paths = batch.actions
        .filter((a) => a.path)
        .map((a) => a.path as SkPath);
      batch.combinedPath = combinePaths(paths);
    }
    batches.push(batch);
  }

  return batches;
};

/**
 * Calculates potential draw call savings from batching.
 * Useful for debugging and optimization metrics.
 *
 * @param actions - Original actions
 * @param batches - Batched results
 * @returns Statistics about batching efficiency
 */
export const getBatchingStats = (
  actions: DrawingAction[],
  batches: StrokeBatch[],
): {
  originalDrawCalls: number;
  batchedDrawCalls: number;
  reduction: number;
  batchCount: number;
} => {
  const originalDrawCalls = actions.filter((a) => a.type === "stroke").length;
  const batchedDrawCalls = batches.reduce((sum, batch) => {
    // Combined paths count as 1 draw call, individual actions count separately
    return sum + (batch.combinedPath ? 1 : batch.actions.length);
  }, 0);

  return {
    originalDrawCalls,
    batchedDrawCalls,
    reduction:
      originalDrawCalls > 0
        ? ((originalDrawCalls - batchedDrawCalls) / originalDrawCalls) * 100
        : 0,
    batchCount: batches.length,
  };
};

/**
 * Determines if batching would provide meaningful performance benefit.
 * Small drawings don't benefit from batching overhead.
 *
 * @param actionCount - Number of stroke actions
 * @returns True if batching is recommended
 */
export const shouldBatchStrokes = (actionCount: number): boolean => {
  // Batching overhead isn't worth it for fewer than 10 strokes
  return actionCount >= 10;
};
