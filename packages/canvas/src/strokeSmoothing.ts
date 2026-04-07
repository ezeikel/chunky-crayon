/**
 * Stroke smoothing using Catmull-Rom spline interpolation.
 *
 * Converts raw pointer input points into smooth curves by interpolating
 * between points. This eliminates jagged lines on fast strokes while
 * keeping the stroke close to the original input path.
 */

type Point = { x: number; y: number };

/**
 * Interpolate between points using Catmull-Rom spline.
 *
 * Given 4 control points (p0, p1, p2, p3), returns interpolated points
 * between p1 and p2. The parameter t ranges from 0 (at p1) to 1 (at p2).
 *
 * @param p0 - Point before the segment start
 * @param p1 - Segment start
 * @param p2 - Segment end
 * @param p3 - Point after the segment end
 * @param t - Interpolation parameter (0-1)
 * @param tension - Spline tension (0 = sharp, 1 = smooth). Default 0.5
 */
function catmullRomPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
  tension: number = 0.5,
): Point {
  const t2 = t * t;
  const t3 = t2 * t;

  // Catmull-Rom basis matrix with tension
  const s = (1 - tension) / 2;

  const x =
    s *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  const y =
    s *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

  return { x, y };
}

/**
 * Smooth an array of points using Catmull-Rom spline interpolation.
 *
 * @param points - Raw input points (at least 2)
 * @param resolution - Number of interpolated points per segment. Higher = smoother. Default 4.
 * @param tension - Spline tension (0 = sharp, 1 = smooth). Default 0.5.
 * @returns Smoothed array of points
 */
export function smoothStroke(
  points: Point[],
  resolution: number = 4,
  tension: number = 0.5,
): Point[] {
  if (points.length < 2) return [...points];
  if (points.length === 2) return [...points];

  const smoothed: Point[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    // Get 4 control points, clamping at boundaries
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Always include the segment start point
    if (i === 0) {
      smoothed.push(p1);
    }

    // Interpolate between p1 and p2
    for (let j = 1; j <= resolution; j++) {
      const t = j / resolution;
      smoothed.push(catmullRomPoint(p0, p1, p2, p3, t, tension));
    }
  }

  return smoothed;
}

/**
 * A streaming stroke smoother that processes points as they arrive.
 * Useful for real-time drawing where you want to smooth as the user draws.
 */
export class StrokeBuffer {
  private points: Point[] = [];
  private tension: number;
  private resolution: number;

  constructor(tension: number = 0.5, resolution: number = 4) {
    this.tension = tension;
    this.resolution = resolution;
  }

  /**
   * Add a new point and return smoothed points for the latest segment.
   * Returns null if not enough points yet (need at least 2).
   */
  addPoint(point: Point): Point[] | null {
    this.points.push(point);

    if (this.points.length < 2) return null;

    // We need the last 4 points to interpolate the latest segment
    const len = this.points.length;
    const p0 = this.points[Math.max(0, len - 3)];
    const p1 = this.points[len - 2];
    const p2 = this.points[len - 1];
    // For the latest segment, p3 = p2 (we extrapolate)
    const p3 = p2;

    const interpolated: Point[] = [];
    for (let j = 1; j <= this.resolution; j++) {
      const t = j / this.resolution;
      interpolated.push(catmullRomPoint(p0, p1, p2, p3, t, this.tension));
    }

    return interpolated;
  }

  /** Get all raw points in the buffer */
  getPoints(): Point[] {
    return [...this.points];
  }

  /** Get the full smoothed stroke */
  getSmoothedStroke(): Point[] {
    return smoothStroke(this.points, this.resolution, this.tension);
  }

  /** Reset the buffer for a new stroke */
  reset(): void {
    this.points = [];
  }
}
