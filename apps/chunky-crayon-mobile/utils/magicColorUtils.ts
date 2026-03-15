/**
 * Magic Color utilities for AI-powered color suggestions
 * Uses pre-computed 5x5 grid color map from colorMapJson
 */

import type {
  GridColorMap,
  GridColorCell,
  Dimension,
  FillPointsData,
} from "@/types";

/**
 * Parse the fillPointsJson string from API response.
 * Returns null if missing or invalid.
 */
export const parseFillPoints = (
  fillPointsJson: string | undefined | null,
): FillPointsData | null => {
  if (!fillPointsJson) return null;

  try {
    const parsed = JSON.parse(fillPointsJson);
    if (
      typeof parsed.sourceWidth === "number" &&
      typeof parsed.sourceHeight === "number" &&
      Array.isArray(parsed.points)
    ) {
      return parsed as FillPointsData;
    }
    return null;
  } catch (error) {
    console.warn("Failed to parse fillPointsJson:", error);
    return null;
  }
};

/**
 * Parse the colorMapJson string from API response
 */
export const parseColorMap = (
  colorMapJson: string | undefined,
): GridColorMap | null => {
  if (!colorMapJson) return null;

  try {
    const parsed = JSON.parse(colorMapJson);
    // Validate structure
    if (parsed.sceneDescription && Array.isArray(parsed.gridColors)) {
      return parsed as GridColorMap;
    }
    return null;
  } catch (error) {
    console.warn("Failed to parse colorMapJson:", error);
    return null;
  }
};

/**
 * Convert canvas coordinates to grid position (1-5 for both row and col)
 * Grid is 5x5 where:
 * - row 1 = top, row 5 = bottom
 * - col 1 = left, col 5 = right
 */
export const canvasToGridPosition = (
  x: number,
  y: number,
  canvasDimension: Dimension,
): { row: number; col: number } => {
  const { width, height } = canvasDimension;

  // Calculate which cell the point falls into (1-5)
  const col = Math.min(5, Math.max(1, Math.ceil((x / width) * 5)));
  const row = Math.min(5, Math.max(1, Math.ceil((y / height) * 5)));

  return { row, col };
};

/**
 * Get the suggested color for a specific grid position
 */
export const getGridCellColor = (
  colorMap: GridColorMap,
  row: number,
  col: number,
): GridColorCell | null => {
  return (
    colorMap.gridColors.find((cell) => cell.row === row && cell.col === col) ||
    null
  );
};

/**
 * Get suggested color for a canvas position
 * Returns the color info from the pre-computed grid
 */
export const getSuggestedColor = (
  x: number,
  y: number,
  canvasDimension: Dimension,
  colorMap: GridColorMap,
): GridColorCell | null => {
  const { row, col } = canvasToGridPosition(x, y, canvasDimension);
  return getGridCellColor(colorMap, row, col);
};

/**
 * Get all unique colors from the color map
 * Useful for building a palette or auto-fill preview
 */
export const getUniqueColors = (
  colorMap: GridColorMap,
): {
  color: string;
  name: string;
  count: number;
}[] => {
  const colorCounts = new Map<string, { name: string; count: number }>();

  colorMap.gridColors.forEach((cell) => {
    const existing = colorCounts.get(cell.suggestedColor);
    if (existing) {
      existing.count++;
    } else {
      colorCounts.set(cell.suggestedColor, {
        name: cell.colorName,
        count: 1,
      });
    }
  });

  return Array.from(colorCounts.entries())
    .map(([color, info]) => ({
      color,
      name: info.name,
      count: info.count,
    }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Get colors grouped by element type
 * Useful for understanding scene composition
 */
export const getColorsByElement = (
  colorMap: GridColorMap,
): Map<string, GridColorCell[]> => {
  const elementMap = new Map<string, GridColorCell[]>();

  colorMap.gridColors.forEach((cell) => {
    const existing = elementMap.get(cell.element);
    if (existing) {
      existing.push(cell);
    } else {
      elementMap.set(cell.element, [cell]);
    }
  });

  return elementMap;
};

/**
 * Build a simplified color lookup table for fast access
 * Returns a 5x5 matrix of hex colors
 */
export const buildColorMatrix = (colorMap: GridColorMap): string[][] => {
  // Initialize 5x5 matrix with default white
  const matrix: string[][] = Array(5)
    .fill(null)
    .map(() => Array(5).fill("#FFFFFF"));

  colorMap.gridColors.forEach((cell) => {
    // Convert 1-indexed to 0-indexed
    const rowIndex = cell.row - 1;
    const colIndex = cell.col - 1;
    if (rowIndex >= 0 && rowIndex < 5 && colIndex >= 0 && colIndex < 5) {
      matrix[rowIndex][colIndex] = cell.suggestedColor;
    }
  });

  return matrix;
};

/**
 * Get the dominant color in the scene (most frequent)
 */
export const getDominantColor = (
  colorMap: GridColorMap,
): GridColorCell | null => {
  const colorCounts = new Map<string, { cell: GridColorCell; count: number }>();

  colorMap.gridColors.forEach((cell) => {
    const existing = colorCounts.get(cell.suggestedColor);
    if (existing) {
      existing.count++;
    } else {
      colorCounts.set(cell.suggestedColor, { cell, count: 1 });
    }
  });

  // Convert to array and find the dominant color
  const entries = Array.from(colorCounts.values());
  if (entries.length === 0) return null;

  const dominant = entries.reduce((max, current) =>
    current.count > max.count ? current : max,
  );

  return dominant.cell;
};

/**
 * Check if a color map has valid data
 */
export const isValidColorMap = (
  colorMap: GridColorMap | null,
): colorMap is GridColorMap => {
  if (!colorMap) return false;
  return (
    typeof colorMap.sceneDescription === "string" &&
    Array.isArray(colorMap.gridColors) &&
    colorMap.gridColors.length > 0 &&
    colorMap.gridColors.every(
      (cell) =>
        typeof cell.row === "number" &&
        typeof cell.col === "number" &&
        typeof cell.suggestedColor === "string" &&
        cell.suggestedColor.startsWith("#"),
    )
  );
};

/**
 * Get adjacent cells for a given position
 * Useful for smooth color transitions or finding region boundaries
 */
export const getAdjacentCells = (
  colorMap: GridColorMap,
  row: number,
  col: number,
): GridColorCell[] => {
  const directions = [
    [-1, 0], // up
    [1, 0], // down
    [0, -1], // left
    [0, 1], // right
  ];

  const adjacent: GridColorCell[] = [];

  directions.forEach(([dRow, dCol]) => {
    const newRow = row + dRow;
    const newCol = col + dCol;

    if (newRow >= 1 && newRow <= 5 && newCol >= 1 && newCol <= 5) {
      const cell = getGridCellColor(colorMap, newRow, newCol);
      if (cell) {
        adjacent.push(cell);
      }
    }
  });

  return adjacent;
};

/**
 * Format color suggestion for kid-friendly display
 */
export const formatColorSuggestion = (cell: GridColorCell): string => {
  return `${cell.colorName} - ${cell.reasoning}`;
};
