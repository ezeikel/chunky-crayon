/**
 * Types for canvas actions that can be synced between web and mobile.
 * This format is compatible with mobile's SerializedAction format.
 */

import type { BrushType, FillPattern } from '@/constants';

/**
 * A single point in a stroke path
 */
export type StrokePoint = {
  x: number;
  y: number;
};

/**
 * Source dimensions for cross-platform coordinate scaling.
 * Each action stores the canvas dimensions from when it was recorded,
 * allowing actions from different platforms (web CSS pixels vs mobile SVG viewBox)
 * to coexist and scale correctly.
 */
export type ActionSourceDimensions = {
  /** Source canvas width when action was recorded */
  sourceWidth?: number;
  /** Source canvas height when action was recorded */
  sourceHeight?: number;
};

/**
 * Serializable stroke action - compatible with mobile format
 */
export type SerializableStrokeAction = {
  type: 'stroke';
  path: StrokePoint[]; // Array of points (more compatible than SVG across platforms)
  pathSvg?: string; // SVG path string for mobile compatibility
  color: string;
  brushType: BrushType;
  strokeWidth: number;
  timestamp: number;
} & ActionSourceDimensions;

/**
 * Serializable fill action - compatible with mobile format
 */
export type SerializableFillAction = {
  type: 'fill';
  x: number;
  y: number;
  color: string;
  fillType?: 'solid' | 'pattern';
  patternType?: FillPattern;
  timestamp: number;
} & ActionSourceDimensions;

/**
 * Serializable sticker action - compatible with mobile format
 */
export type SerializableStickerAction = {
  type: 'sticker';
  sticker: string;
  x: number;
  y: number;
  size: number;
  timestamp: number;
} & ActionSourceDimensions;

/**
 * Serializable clear action
 */
export type SerializableClearAction = {
  type: 'clear';
  timestamp: number;
};

/**
 * Snapshot action for cross-platform fallback
 */
export type SerializableSnapshotAction = {
  type: 'snapshot';
  imageDataUrl: string;
  timestamp: number;
};

/**
 * Union of all serializable action types
 */
export type SerializableCanvasAction =
  | SerializableStrokeAction
  | SerializableFillAction
  | SerializableStickerAction
  | SerializableClearAction
  | SerializableSnapshotAction;

/**
 * Convert an array of points to an SVG path string
 * This creates a mobile-compatible path format
 */
export function pointsToSvgPath(points: StrokePoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    // Single point - create a small circle/dot
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x} ${p.y}`;
  }

  // Start with moveTo, then lineTo for each subsequent point
  const [first, ...rest] = points;
  const parts = [`M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`];

  for (const point of rest) {
    parts.push(`L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
  }

  return parts.join(' ');
}

/**
 * Convert API action format to serializable format
 */
export function apiActionToSerializable(apiAction: {
  type: string;
  timestamp: number;
  data?: Record<string, unknown>;
}): SerializableCanvasAction | null {
  const { type, timestamp, data } = apiAction;

  // Extract source dimensions for cross-platform scaling
  const sourceWidth = data?.sourceWidth as number | undefined;
  const sourceHeight = data?.sourceHeight as number | undefined;

  switch (type) {
    case 'stroke':
      return {
        type: 'stroke',
        path: [], // Will be populated from pathSvg if available
        pathSvg: data?.path as string | undefined,
        color: (data?.color as string) || '#000000',
        brushType: (data?.brushType as BrushType) || 'marker',
        strokeWidth: (data?.brushSize as number) || 10,
        timestamp,
        sourceWidth,
        sourceHeight,
      };

    case 'fill':
      return {
        type: 'fill',
        x: (data?.x as number) || 0,
        y: (data?.y as number) || 0,
        color:
          (data?.fillColor as string) || (data?.color as string) || '#000000',
        fillType: (data?.fillType as 'solid' | 'pattern') || 'solid',
        patternType: data?.patternType as FillPattern | undefined,
        timestamp,
        sourceWidth,
        sourceHeight,
      };

    case 'sticker':
      const position = data?.position as { x: number; y: number } | undefined;
      return {
        type: 'sticker',
        sticker: (data?.stickerId as string) || '',
        x: position?.x || 0,
        y: position?.y || 0,
        size: (data?.scale as number) || 50,
        timestamp,
        sourceWidth,
        sourceHeight,
      };

    case 'clear':
      return {
        type: 'clear',
        timestamp,
      };

    case 'snapshot':
      return {
        type: 'snapshot',
        imageDataUrl: (data?.imageDataUrl as string) || '',
        timestamp,
      };

    default:
      console.warn(`Unknown action type: ${type}`);
      return null;
  }
}

/**
 * Convert serializable action to API format
 */
export function serializableToApiAction(
  action: SerializableCanvasAction,
  index: number,
): {
  id: string;
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
} {
  const id = `action-${action.timestamp}-${index}`;

  // Extract source dimensions for cross-platform scaling (if available)
  const sourceDimensions: Record<string, unknown> = {};
  if ('sourceWidth' in action && action.sourceWidth) {
    sourceDimensions.sourceWidth = action.sourceWidth;
  }
  if ('sourceHeight' in action && action.sourceHeight) {
    sourceDimensions.sourceHeight = action.sourceHeight;
  }

  switch (action.type) {
    case 'stroke':
      return {
        id,
        type: 'stroke',
        timestamp: action.timestamp,
        data: {
          path: action.pathSvg || pointsToSvgPath(action.path),
          color: action.color,
          brushType: action.brushType,
          brushSize: action.strokeWidth,
          ...sourceDimensions,
        },
      };

    case 'fill':
      return {
        id,
        type: 'fill',
        timestamp: action.timestamp,
        data: {
          x: action.x,
          y: action.y,
          color: action.color,
          fillColor: action.color,
          fillType: action.fillType,
          patternType: action.patternType,
          ...sourceDimensions,
        },
      };

    case 'sticker':
      return {
        id,
        type: 'sticker',
        timestamp: action.timestamp,
        data: {
          stickerId: action.sticker,
          position: { x: action.x, y: action.y },
          scale: action.size,
          ...sourceDimensions,
        },
      };

    case 'clear':
      return {
        id,
        type: 'clear',
        timestamp: action.timestamp,
        data: {},
      };

    case 'snapshot':
      return {
        id,
        type: 'snapshot',
        timestamp: action.timestamp,
        data: {
          imageDataUrl: action.imageDataUrl,
        },
      };
  }
}
