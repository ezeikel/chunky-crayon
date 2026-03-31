"use client";

import { useState, useCallback, useRef } from "react";
import type { GridColorMap, FillPointsData } from "@/lib/ai";
import {
  detectAllRegions,
  getRegionAtPoint,
  type Region,
  type RegionMap,
} from "@one-colored-pixel/canvas";

export type MagicColorMapState = {
  /** Whether the color map is currently being generated */
  isLoading: boolean;
  /** Whether the color map is ready for use */
  isReady: boolean;
  /** Error message if generation failed */
  error: string | null;
  /** Loading progress message */
  loadingMessage: string | null;
  /** The AI analysis result (no longer used - kept for backwards compatibility) */
  analysis: null;
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
  /** Get fill points scaled to canvas dimensions (bypasses region detection) */
  getDirectFillPoints: (
    canvasWidth: number,
    canvasHeight: number,
  ) => Array<{ x: number; y: number; color: string }> | null;
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
 * Grid size for color map lookups.
 */
const GRID_SIZE = 5;

/**
 * Convert pixel coordinates to grid position (1-GRID_SIZE for rows and cols).
 */
function getGridPosition(
  centroid: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number,
): { row: number; col: number } {
  const col = Math.min(
    GRID_SIZE,
    Math.max(1, Math.ceil((centroid.x / canvasWidth) * GRID_SIZE)),
  );
  const row = Math.min(
    GRID_SIZE,
    Math.max(1, Math.ceil((centroid.y / canvasHeight) * GRID_SIZE)),
  );
  return { row, col };
}

/**
 * Get a default color based on grid position (fallback when AI matching fails).
 */
function getDefaultColorForGrid(grid: { row: number; col: number }): {
  hex: string;
  name: string;
} {
  if (grid.row <= 2) {
    return { hex: "#1E88E5", name: "Sky Blue" };
  } else if (grid.row >= 4) {
    return { hex: "#6D4C41", name: "Chocolate Brown" };
  } else {
    return { hex: "#43A047", name: "Grass Green" };
  }
}

/**
 * Build color maps from pre-computed grid color map (instant, no AI call).
 */
function buildColorMapsFromPreComputed(
  preComputed: GridColorMap,
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

  const gridLookup = new Map<string, (typeof preComputed.gridColors)[0]>();
  for (const cell of preComputed.gridColors) {
    const key = `${cell.row}-${cell.col}`;
    gridLookup.set(key, cell);
  }

  for (const region of detectedRegions) {
    const grid = getGridPosition(region.centroid, canvasWidth, canvasHeight);
    const key = `${grid.row}-${grid.col}`;
    const assignment = gridLookup.get(key);

    if (assignment) {
      colorMap.set(region.id, assignment.suggestedColor);
      colorNameMap.set(region.id, assignment.colorName);
      reasoningMap.set(region.id, assignment.reasoning);
    } else {
      const fallbackColor = getDefaultColorForGrid(grid);
      colorMap.set(region.id, fallbackColor.hex);
      colorNameMap.set(region.id, fallbackColor.name);
      reasoningMap.set(region.id, "A nice color for this spot!");
    }
  }

  return { colorMap, colorNameMap, reasoningMap };
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

  const preColoredCanvas = document.createElement("canvas");
  preColoredCanvas.width = width;
  preColoredCanvas.height = height;

  const ctx = preColoredCanvas.getContext("2d");
  if (!ctx) return preColoredCanvas;

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let i = 0; i < pixelToRegion.length; i++) {
    const regionId = pixelToRegion[i];
    const pixelIndex = i * 4;

    if (regionId === 0) {
      data[pixelIndex] = 0;
      data[pixelIndex + 1] = 0;
      data[pixelIndex + 2] = 0;
      data[pixelIndex + 3] = 0;
    } else {
      const color = colorMap.get(regionId);
      if (color) {
        const hex = color.replace("#", "");
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

export type UseMagicColorMapOptions = {
  /** Pre-computed grid color map from server (for instant color assignment) */
  preComputedColorMap?: GridColorMap | null;
  /** Region-aware fill points from server (preferred over grid when available) */
  fillPointsData?: FillPointsData | null;
};

/**
 * Hook for managing the Magic Brush color map.
 */
export function useMagicColorMap(
  options: UseMagicColorMapOptions = {},
): UseMagicColorMapReturn {
  const { preComputedColorMap, fillPointsData } = options;
  const [state, setState] = useState<MagicColorMapState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateColorMap = useCallback(
    async (
      drawingCanvas: HTMLCanvasElement,
      boundaryCanvas: HTMLCanvasElement,
    ): Promise<boolean> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setState((s) => ({
        ...s,
        isLoading: true,
        isReady: false,
        error: null,
        loadingMessage: "Detecting colorable areas...",
      }));

      try {
        const regionMap = detectAllRegions(drawingCanvas, boundaryCanvas);

        if (regionMap.regions.length === 0) {
          setState((s) => ({
            ...s,
            isLoading: false,
            error: "No colorable areas found. Try a different image!",
            loadingMessage: null,
          }));
          return false;
        }

        if (!fillPointsData && !preComputedColorMap) {
          setState((s) => ({
            ...s,
            isLoading: false,
            error: null,
            loadingMessage: null,
          }));
          return false;
        }

        setState((s) => ({
          ...s,
          loadingMessage: `Found ${regionMap.regions.length} areas. Applying colors...`,
        }));

        let colorMap: Map<number, string>;
        let colorNameMap: Map<number, string>;
        let reasoningMap: Map<number, string>;

        if (fillPointsData) {
          const scaleX = regionMap.width / fillPointsData.sourceWidth;
          const scaleY = regionMap.height / fillPointsData.sourceHeight;

          colorMap = new Map();
          colorNameMap = new Map();
          reasoningMap = new Map();

          for (const point of fillPointsData.points) {
            const scaledX = Math.round(point.x * scaleX);
            const scaledY = Math.round(point.y * scaleY);
            const regionId = getRegionAtPoint(regionMap, scaledX, scaledY);

            if (regionId !== 0 && !colorMap.has(regionId)) {
              colorMap.set(regionId, point.color);
              colorNameMap.set(regionId, point.label);
              reasoningMap.set(regionId, `${point.label} colored beautifully!`);
            }
          }

          for (const region of regionMap.regions) {
            if (!colorMap.has(region.id)) {
              const grid = getGridPosition(
                region.centroid,
                regionMap.width,
                regionMap.height,
              );
              const fallback = getDefaultColorForGrid(grid);
              colorMap.set(region.id, fallback.hex);
              colorNameMap.set(region.id, fallback.name);
              reasoningMap.set(region.id, "A nice color for this spot!");
            }
          }
        } else {
          ({ colorMap, colorNameMap, reasoningMap } =
            buildColorMapsFromPreComputed(
              preComputedColorMap!,
              regionMap.regions,
              regionMap.width,
              regionMap.height,
            ));
        }

        setState((s) => ({
          ...s,
          loadingMessage: "Creating your magical coloring map...",
        }));

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
          analysis: null,
          regionMap,
          colorMap,
          colorNameMap,
          reasoningMap,
          preColoredCanvas,
          coloredRegions: new Set(),
        });

        return true;
      } catch (error) {
        console.error("[MagicColorMap] Error generating color map:", error);
        setState((s) => ({
          ...s,
          isLoading: false,
          error: "Something went wrong. Please try again!",
          loadingMessage: null,
        }));
        return false;
      }
    },
    [preComputedColorMap, fillPointsData],
  );

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

  const getRegionIdAtPoint = useCallback(
    (x: number, y: number): number => {
      if (!state.regionMap) return 0;
      return getRegionAtPoint(state.regionMap, x, y);
    },
    [state.regionMap],
  );

  const markRegionColored = useCallback((regionId: number) => {
    setState((s) => {
      const newColoredRegions = new Set(s.coloredRegions);
      newColoredRegions.add(regionId);
      return { ...s, coloredRegions: newColoredRegions };
    });
  }, []);

  const getRemainingRegionCount = useCallback((): number => {
    if (!state.regionMap) return 0;
    return state.regionMap.regions.length - state.coloredRegions.size;
  }, [state.regionMap, state.coloredRegions]);

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

  const getDirectFillPoints = useCallback(
    (
      canvasWidth: number,
      canvasHeight: number,
    ): Array<{ x: number; y: number; color: string }> | null => {
      if (!fillPointsData) return null;

      const scaleX = canvasWidth / fillPointsData.sourceWidth;
      const scaleY = canvasHeight / fillPointsData.sourceHeight;

      return fillPointsData.points.map((point) => ({
        x: Math.round(point.x * scaleX),
        y: Math.round(point.y * scaleY),
        color: point.color,
      }));
    },
    [fillPointsData],
  );

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
    getDirectFillPoints,
    reset,
  };
}
