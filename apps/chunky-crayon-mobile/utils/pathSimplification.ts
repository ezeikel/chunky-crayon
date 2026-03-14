import { SkPath, Skia } from "@shopify/react-native-skia";

/**
 * Path simplification utilities using Douglas-Peucker algorithm.
 *
 * This reduces the number of points in a path while preserving its shape,
 * improving rendering performance for complex strokes.
 */

/**
 * Represents a 2D point
 */
type Point = { x: number; y: number };

/**
 * Calculates perpendicular distance from a point to a line segment.
 *
 * @param point - The point to measure from
 * @param lineStart - Start of line segment
 * @param lineEnd - End of line segment
 * @returns Perpendicular distance
 */
const perpendicularDistance = (
  point: Point,
  lineStart: Point,
  lineEnd: Point,
): number => {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  // Handle case where line is a single point
  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2),
    );
  }

  // Calculate perpendicular distance using cross product formula
  const numerator = Math.abs(
    dy * point.x -
      dx * point.y +
      lineEnd.x * lineStart.y -
      lineEnd.y * lineStart.x,
  );
  const denominator = Math.sqrt(dx * dx + dy * dy);

  return numerator / denominator;
};

/**
 * Douglas-Peucker algorithm implementation.
 *
 * Recursively simplifies a polyline by removing points that don't
 * significantly change the shape.
 *
 * @param points - Array of points to simplify
 * @param tolerance - Maximum distance a point can be from the line (in pixels)
 * @returns Simplified array of points
 */
const douglasPeucker = (points: Point[], tolerance: number): Point[] => {
  if (points.length <= 2) {
    return points;
  }

  // Find the point with maximum distance from line between first and last
  let maxDistance = 0;
  let maxIndex = 0;

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], firstPoint, lastPoint);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const leftResults = douglasPeucker(
      points.slice(0, maxIndex + 1),
      tolerance,
    );
    const rightResults = douglasPeucker(points.slice(maxIndex), tolerance);

    // Combine results, removing duplicate point at junction
    return [...leftResults.slice(0, -1), ...rightResults];
  }

  // All points are within tolerance, keep only endpoints
  return [firstPoint, lastPoint];
};

/**
 * Extracts points from a Skia path.
 *
 * @param path - Skia path to extract points from
 * @returns Array of points
 */
const extractPointsFromPath = (path: SkPath): Point[] => {
  const points: Point[] = [];
  const pathString = path.toSVGString();

  // Parse SVG path string to extract coordinates
  // Format: "M x y L x y L x y ..." or "M x,y L x,y L x,y ..."
  const regex = /[ML]\s*(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/g;
  let match;

  while ((match = regex.exec(pathString)) !== null) {
    points.push({
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
    });
  }

  return points;
};

/**
 * Creates a Skia path from an array of points.
 *
 * @param points - Array of points
 * @returns New Skia path
 */
const createPathFromPoints = (points: Point[]): SkPath => {
  const path = Skia.Path.Make();

  if (points.length === 0) {
    return path;
  }

  path.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i].x, points[i].y);
  }

  return path;
};

/**
 * Default tolerance for path simplification.
 * 2.0px is a good balance for kids' drawings - removes micro-movements
 * while preserving intentional strokes.
 */
export const DEFAULT_SIMPLIFICATION_TOLERANCE = 2.0;

/**
 * Simplifies a Skia path using the Douglas-Peucker algorithm.
 *
 * This is particularly useful for:
 * - Reducing memory usage for complex drawings
 * - Improving rendering performance
 * - Smoother stroke appearance by removing jitter
 *
 * @param path - Original Skia path
 * @param tolerance - Maximum deviation in pixels (default: 2.0)
 * @returns Simplified Skia path
 */
export const simplifyPath = (
  path: SkPath,
  tolerance: number = DEFAULT_SIMPLIFICATION_TOLERANCE,
): SkPath => {
  const originalPoints = extractPointsFromPath(path);

  // Skip simplification for very short paths
  if (originalPoints.length <= 3) {
    return path;
  }

  const simplifiedPoints = douglasPeucker(originalPoints, tolerance);

  // Only create new path if simplification actually reduced points
  if (simplifiedPoints.length >= originalPoints.length) {
    return path;
  }

  return createPathFromPoints(simplifiedPoints);
};

/**
 * Calculates the reduction ratio after simplification.
 * Useful for debugging and metrics.
 *
 * @param original - Original point count
 * @param simplified - Simplified point count
 * @returns Reduction percentage (0-100)
 */
export const calculateReduction = (
  original: number,
  simplified: number,
): number => {
  if (original === 0) return 0;
  return ((original - simplified) / original) * 100;
};

/**
 * Estimates point count in a path without extracting all points.
 * Uses a simple heuristic based on path string length.
 *
 * @param path - Skia path
 * @returns Estimated point count
 */
export const estimatePointCount = (path: SkPath): number => {
  const pathString = path.toSVGString();
  // Each point roughly takes up ~20 characters in SVG format
  return Math.max(1, Math.floor(pathString.length / 20));
};

/**
 * Determines if a path would benefit from simplification.
 * Paths with fewer than 10 points don't need simplification.
 *
 * @param path - Skia path to check
 * @returns True if path should be simplified
 */
export const shouldSimplify = (path: SkPath): boolean => {
  return estimatePointCount(path) >= 10;
};
