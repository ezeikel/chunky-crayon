'use client';

import { useState, useCallback, useRef } from 'react';
import { assignColorsToRegions } from '@/app/actions/analyze-coloring-image';
import type { DetectedRegionInput, RegionFirstColorResponse } from '@/lib/ai';
import {
  detectAllRegions,
  getRegionAtPoint,
  getSizeDescriptor,
  type Region,
  type RegionMap,
} from '@/utils/regionDetection';

export type MagicColorMapState = {
  /** Whether the color map is currently being generated */
  isLoading: boolean;
  /** Whether the color map is ready for use */
  isReady: boolean;
  /** Error message if generation failed */
  error: string | null;
  /** Loading progress message */
  loadingMessage: string | null;
  /** The AI analysis result (V3 region-first with 1:1 mapping) */
  analysis: RegionFirstColorResponse | null;
  /** Region detection results */
  regionMap: RegionMap | null;
  /** Mapping from detected region ID to assigned hex color */
  colorMap: Map<number, string>;
  /** Mapping from detected region ID to color name (for display) */
  colorNameMap: Map<number, string>;
  /** Mapping from detected region ID to reasoning (for tooltips) */
  reasoningMap: Map<number, string>;
  /** Pre-colored canvas (hidden, used for reveal mode) */
  preColoredCanvas: HTMLCanvasElement | null;
  /** Set of region IDs that have been revealed/colored */
  coloredRegions: Set<number>;
};

export type UseMagicColorMapReturn = {
  state: MagicColorMapState;
  /** Generate the color map for a canvas */
  generateColorMap: (
    drawingCanvas: HTMLCanvasElement,
    boundaryCanvas: HTMLCanvasElement,
  ) => Promise<boolean>;
  /** Get the assigned color for a point on the canvas */
  getColorAtPoint: (x: number, y: number) => string | null;
  /** Get the region ID at a point */
  getRegionIdAtPoint: (x: number, y: number) => number;
  /** Mark a region as colored */
  markRegionColored: (regionId: number) => void;
  /** Get the number of remaining uncolored regions */
  getRemainingRegionCount: () => number;
  /** Get all colors for auto-color (returns array of { regionId, color, centroid }) */
  getAllColorsForAutoFill: () => Array<{
    regionId: number;
    color: string;
    centroid: { x: number; y: number };
  }>;
  /** Reset the color map */
  reset: () => void;
};

const initialState: MagicColorMapState = {
  isLoading: false,
  isReady: false,
  error: null,
  loadingMessage: null,
  analysis: null,
  regionMap: null,
  colorMap: new Map(),
  colorNameMap: new Map(),
  reasoningMap: new Map(),
  preColoredCanvas: null,
  coloredRegions: new Set(),
};

/**
 * Convert pixel coordinates to 5x5 grid position (1-5 for rows and cols).
 */
function getGridPosition(
  centroid: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number,
): { row: number; col: number } {
  // Convert to 1-5 grid (1=top/left, 5=bottom/right)
  const col = Math.min(
    5,
    Math.max(1, Math.ceil((centroid.x / canvasWidth) * 5)),
  );
  const row = Math.min(
    5,
    Math.max(1, Math.ceil((centroid.y / canvasHeight) * 5)),
  );
  return { row, col };
}

/**
 * Convert detected regions to V3 input format for the AI.
 * Each region gets its grid position and size for the AI to understand location.
 */
function convertToV3Input(
  regions: Region[],
  canvasWidth: number,
  canvasHeight: number,
): DetectedRegionInput[] {
  const totalPixels = canvasWidth * canvasHeight;

  return regions.map((region) => {
    const grid = getGridPosition(region.centroid, canvasWidth, canvasHeight);
    const pixelPercentage = (region.pixelCount / totalPixels) * 100;

    return {
      id: region.id,
      gridRow: grid.row,
      gridCol: grid.col,
      size: getSizeDescriptor(region.pixelCount, totalPixels),
      pixelPercentage,
    };
  });
}

/**
 * Build color maps from V3 AI response (1:1 mapping by region ID).
 * Since V3 guarantees each region ID gets a color assignment, this is simple.
 */
function buildColorMapsFromV3Response(
  response: RegionFirstColorResponse,
  detectedRegions: Region[],
  canvasWidth: number,
  canvasHeight: number,
): {
  colorMap: Map<number, string>;
  colorNameMap: Map<number, string>;
  reasoningMap: Map<number, string>;
} {
  const colorMap = new Map<number, string>();
  const colorNameMap = new Map<number, string>();
  const reasoningMap = new Map<number, string>();

  // Build lookup from AI assignments (keyed by regionId)
  const assignmentLookup = new Map(
    response.assignments.map((a) => [a.regionId, a]),
  );

  // Map each detected region to its assigned color
  for (const region of detectedRegions) {
    const assignment = assignmentLookup.get(region.id);

    if (assignment) {
      // Direct 1:1 mapping from AI
      colorMap.set(region.id, assignment.suggestedColor);
      colorNameMap.set(region.id, assignment.colorName);
      reasoningMap.set(region.id, assignment.reasoning);
    } else {
      // Fallback for any regions AI might have missed (shouldn't happen with V3)
      const grid = getGridPosition(region.centroid, canvasWidth, canvasHeight);
      const fallbackColor = getDefaultColorForGrid(grid);
      colorMap.set(region.id, fallbackColor.hex);
      colorNameMap.set(region.id, fallbackColor.name);
      reasoningMap.set(region.id, 'A nice color for this spot!');
    }
  }

  return { colorMap, colorNameMap, reasoningMap };
}

/**
 * Get a default color based on grid position (fallback when AI matching fails).
 * Uses typical color expectations: sky at top, ground at bottom, greens in middle.
 */
function getDefaultColorForGrid(grid: { row: number; col: number }): {
  hex: string;
  name: string;
} {
  // Row-based defaults (1=top, 5=bottom)
  if (grid.row <= 2) {
    // Top area - sky colors
    return { hex: '#1E88E5', name: 'Sky Blue' };
  } else if (grid.row >= 4) {
    // Bottom area - ground colors
    return { hex: '#6D4C41', name: 'Chocolate Brown' };
  } else {
    // Middle area - vegetation/nature colors
    return { hex: '#43A047', name: 'Grass Green' };
  }
}

/**
 * Create a pre-colored canvas with all regions filled.
 */
function createPreColoredCanvas(
  drawingCanvas: HTMLCanvasElement,
  regionMap: RegionMap,
  colorMap: Map<number, string>,
): HTMLCanvasElement {
  const { width, height, pixelToRegion } = regionMap;

  // Create offscreen canvas
  const preColoredCanvas = document.createElement('canvas');
  preColoredCanvas.width = width;
  preColoredCanvas.height = height;

  const ctx = preColoredCanvas.getContext('2d');
  if (!ctx) return preColoredCanvas;

  // Create image data
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  // Fill each pixel with its region's color
  for (let i = 0; i < pixelToRegion.length; i++) {
    const regionId = pixelToRegion[i];
    const pixelIndex = i * 4;

    if (regionId === 0) {
      // Not a region - make transparent
      data[pixelIndex] = 0;
      data[pixelIndex + 1] = 0;
      data[pixelIndex + 2] = 0;
      data[pixelIndex + 3] = 0;
    } else {
      const color = colorMap.get(regionId);
      if (color) {
        // Parse hex color
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        data[pixelIndex] = r;
        data[pixelIndex + 1] = g;
        data[pixelIndex + 2] = b;
        data[pixelIndex + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return preColoredCanvas;
}

/**
 * Hook for managing the Magic Brush color map.
 * Pre-analyzes the entire image and assigns colors to all regions.
 */
export function useMagicColorMap(): UseMagicColorMapReturn {
  const [state, setState] = useState<MagicColorMapState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Generate the color map for a canvas.
   */
  const generateColorMap = useCallback(
    async (
      drawingCanvas: HTMLCanvasElement,
      boundaryCanvas: HTMLCanvasElement,
    ): Promise<boolean> => {
      // Cancel any in-progress generation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setState((s) => ({
        ...s,
        isLoading: true,
        isReady: false,
        error: null,
        loadingMessage: 'Detecting colorable areas...',
      }));

      try {
        // Step 1: Detect all regions client-side
        const regionMap = detectAllRegions(drawingCanvas, boundaryCanvas);

        if (regionMap.regions.length === 0) {
          setState((s) => ({
            ...s,
            isLoading: false,
            error: 'No colorable areas found. Try a different image!',
            loadingMessage: null,
          }));
          return false;
        }

        setState((s) => ({
          ...s,
          loadingMessage: `Found ${regionMap.regions.length} areas. Finding perfect colors...`,
        }));

        // Step 2: Convert detected regions to V3 input format (with grid positions)
        const v3Regions = convertToV3Input(
          regionMap.regions,
          regionMap.width,
          regionMap.height,
        );

        // NOTE: Keep these logs for debugging and future prompt improvements
        console.log('\n========== MAGIC FILL V3: SENDING TO AI ==========');
        console.log(
          `Sending ${v3Regions.length} regions to AI for color assignment`,
        );
        console.log(
          'Sample regions:',
          v3Regions
            .slice(0, 5)
            .map(
              (r) =>
                `#${r.id} at grid(${r.gridRow},${r.gridCol}) size:${r.size}`,
            ),
        );
        console.log('===================================================\n');

        // Step 3: Get AI color assignments (V3 region-first approach)
        const imageBase64 = boundaryCanvas.toDataURL('image/png');
        const result = await assignColorsToRegions(imageBase64, v3Regions);

        if (!result.success) {
          setState((s) => ({
            ...s,
            isLoading: false,
            error: result.error,
            loadingMessage: null,
          }));
          return false;
        }

        // NOTE: Keep these logs for debugging and future prompt improvements
        console.log('\n========== MAGIC FILL V3: AI RESPONSE ==========');
        console.log('Scene:', result.response.sceneDescription);
        console.log(
          `Assignments returned: ${result.response.assignments.length}`,
        );
        console.log(
          `Match rate: ${((result.response.assignments.length / v3Regions.length) * 100).toFixed(1)}%`,
        );
        console.log('\nSample assignments:');
        result.response.assignments.slice(0, 10).forEach((a) => {
          console.log(
            `  #${a.regionId}: "${a.element}" → ${a.colorName} (${a.suggestedColor})`,
          );
        });
        console.log('===================================================\n');

        setState((s) => ({
          ...s,
          loadingMessage: 'Creating your magical coloring map...',
        }));

        // Step 4: Build color maps from V3 response (direct 1:1 mapping)
        const { colorMap, colorNameMap, reasoningMap } =
          buildColorMapsFromV3Response(
            result.response,
            regionMap.regions,
            regionMap.width,
            regionMap.height,
          );

        // Step 5: Create pre-colored canvas
        const preColoredCanvas = createPreColoredCanvas(
          drawingCanvas,
          regionMap,
          colorMap,
        );

        setState({
          isLoading: false,
          isReady: true,
          error: null,
          loadingMessage: null,
          analysis: result.response,
          regionMap,
          colorMap,
          colorNameMap,
          reasoningMap,
          preColoredCanvas,
          coloredRegions: new Set(),
        });

        return true;
      } catch (error) {
        console.error('[MagicColorMap] Error generating color map:', error);
        setState((s) => ({
          ...s,
          isLoading: false,
          error: 'Something went wrong. Please try again!',
          loadingMessage: null,
        }));
        return false;
      }
    },
    [],
  );

  /**
   * Get the assigned color for a point on the canvas.
   * NOTE: x,y should be in DPR-scaled canvas pixel coordinates (not CSS pixels)
   */
  const getColorAtPoint = useCallback(
    (x: number, y: number): string | null => {
      if (!state.regionMap) {
        return null;
      }

      const regionId = getRegionAtPoint(state.regionMap, x, y);
      return regionId === 0 ? null : state.colorMap.get(regionId) || null;
    },
    [state.regionMap, state.colorMap],
  );

  /**
   * Get the region ID at a point.
   */
  const getRegionIdAtPoint = useCallback(
    (x: number, y: number): number => {
      if (!state.regionMap) return 0;
      return getRegionAtPoint(state.regionMap, x, y);
    },
    [state.regionMap],
  );

  /**
   * Mark a region as colored.
   */
  const markRegionColored = useCallback((regionId: number) => {
    setState((s) => {
      const newColoredRegions = new Set(s.coloredRegions);
      newColoredRegions.add(regionId);
      return { ...s, coloredRegions: newColoredRegions };
    });
  }, []);

  /**
   * Get the number of remaining uncolored regions.
   */
  const getRemainingRegionCount = useCallback((): number => {
    if (!state.regionMap) return 0;
    return state.regionMap.regions.length - state.coloredRegions.size;
  }, [state.regionMap, state.coloredRegions]);

  /**
   * Get all colors for auto-fill (returns array with region info).
   */
  const getAllColorsForAutoFill = useCallback((): Array<{
    regionId: number;
    color: string;
    centroid: { x: number; y: number };
  }> => {
    if (!state.regionMap) return [];

    const result: Array<{
      regionId: number;
      color: string;
      centroid: { x: number; y: number };
    }> = [];

    for (const region of state.regionMap.regions) {
      // Skip already colored regions
      if (state.coloredRegions.has(region.id)) continue;

      const color = state.colorMap.get(region.id);
      if (color) {
        result.push({
          regionId: region.id,
          color,
          centroid: region.centroid,
        });
      }
    }

    return result;
  }, [state.regionMap, state.colorMap, state.coloredRegions]);

  /**
   * Reset the color map.
   */
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(initialState);
  }, []);

  return {
    state,
    generateColorMap,
    getColorAtPoint,
    getRegionIdAtPoint,
    markRegionColored,
    getRemainingRegionCount,
    getAllColorsForAutoFill,
    reset,
  };
}
