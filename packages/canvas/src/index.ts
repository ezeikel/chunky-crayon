/**
 * @one-colored-pixel/canvas
 *
 * Shared canvas algorithms and utilities for coloring page apps.
 * Includes flood fill, brush textures, fill patterns, region detection,
 * SVG parsing, and cursor generation.
 */

// Types
export type { BrushType, FillPattern, PointerInputType } from "./types";

// Canvas algorithms
export {
  hexToRGBA,
  floodFill,
  scanlineFill,
  dilateBoundaries,
} from "./floodFill";
export { drawTexturedStroke } from "./brushTextures";
export { createFillPattern, getPatternFillColor } from "./fillPatterns";

// Region detection (browser)
export {
  detectAllRegions,
  getRegionAtPoint,
  getRegionById,
  getPositionDescriptor,
  getSizeDescriptor,
  calculateColoringProgress,
  type Region,
  type RegionMap,
} from "./regionDetection";

// Region detection (Node.js / server-side)
export {
  detectAllRegionsFromPixels,
  dilateBoundariesPixels,
} from "./regionDetectionNode";

// SVG utilities
export {
  default as parseSvg,
  type SvgProps,
  type SvgElementProps,
} from "./parseSvg";
export { default as fetchSvg } from "./fetchSvg";

// Stroke smoothing
export { smoothStroke, StrokeBuffer } from "./strokeSmoothing";

// Cursor generation
export { createIconCursor, createIconCursorWithRing } from "./iconCursor";
