import { SkPath, Skia, SkMatrix } from "@shopify/react-native-skia";

/**
 * Symmetry drawing utilities.
 *
 * Allows drawing with automatic mirroring/reflection to create
 * symmetrical patterns - great for mandalas, butterflies, faces, etc.
 */

/**
 * Available symmetry modes
 */
export type SymmetryMode =
  | "none" // No symmetry
  | "vertical" // Mirror across vertical axis (left/right)
  | "horizontal" // Mirror across horizontal axis (top/bottom)
  | "both" // Mirror both ways (4-way)
  | "radial4" // 4-way radial symmetry
  | "radial8"; // 8-way radial symmetry

/**
 * Human-readable labels for each symmetry mode
 */
export const SYMMETRY_MODE_LABELS: Record<SymmetryMode, string> = {
  none: "Off",
  vertical: "Vertical",
  horizontal: "Horizontal",
  both: "Both",
  radial4: "Radial 4",
  radial8: "Radial 8",
};

/**
 * Icons for each symmetry mode (emoji for simplicity)
 */
export const SYMMETRY_MODE_ICONS: Record<SymmetryMode, string> = {
  none: "⊘",
  vertical: "↔️",
  horizontal: "↕️",
  both: "✛",
  radial4: "✤",
  radial8: "✳️",
};

/**
 * Creates a transformation matrix for mirroring across the vertical axis.
 * This flips the path horizontally around the center.
 *
 * @param centerX - X coordinate of the center point
 * @returns Skia matrix for vertical mirror
 */
export const createVerticalMirrorMatrix = (centerX: number): SkMatrix => {
  // To mirror across vertical axis at centerX:
  // 1. Translate to origin (subtract centerX)
  // 2. Scale X by -1 (flip horizontally)
  // 3. Translate back (add centerX)
  const matrix = Skia.Matrix();
  matrix.translate(centerX, 0);
  matrix.scale(-1, 1);
  matrix.translate(-centerX, 0);
  return matrix;
};

/**
 * Creates a transformation matrix for mirroring across the horizontal axis.
 * This flips the path vertically around the center.
 *
 * @param centerY - Y coordinate of the center point
 * @returns Skia matrix for horizontal mirror
 */
export const createHorizontalMirrorMatrix = (centerY: number): SkMatrix => {
  const matrix = Skia.Matrix();
  matrix.translate(0, centerY);
  matrix.scale(1, -1);
  matrix.translate(0, -centerY);
  return matrix;
};

/**
 * Creates a transformation matrix for rotation around a center point.
 *
 * @param centerX - X coordinate of rotation center
 * @param centerY - Y coordinate of rotation center
 * @param angleDegrees - Rotation angle in degrees
 * @returns Skia matrix for rotation
 */
export const createRotationMatrix = (
  centerX: number,
  centerY: number,
  angleDegrees: number,
): SkMatrix => {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  const matrix = Skia.Matrix();
  matrix.translate(centerX, centerY);
  matrix.rotate(angleRadians);
  matrix.translate(-centerX, -centerY);
  return matrix;
};

/**
 * Creates all transformation matrices needed for a symmetry mode.
 *
 * @param mode - The symmetry mode
 * @param centerX - X coordinate of the symmetry center
 * @param centerY - Y coordinate of the symmetry center
 * @returns Array of transformation matrices (first is always identity for original)
 */
export const getSymmetryMatrices = (
  mode: SymmetryMode,
  centerX: number,
  centerY: number,
): SkMatrix[] => {
  const identity = Skia.Matrix(); // Original path (no transform)

  switch (mode) {
    case "none":
      return [identity];

    case "vertical":
      return [identity, createVerticalMirrorMatrix(centerX)];

    case "horizontal":
      return [identity, createHorizontalMirrorMatrix(centerY)];

    case "both": {
      // Original + vertical mirror + horizontal mirror + both mirrors
      const vertMirror = createVerticalMirrorMatrix(centerX);
      const horzMirror = createHorizontalMirrorMatrix(centerY);

      // Combined mirror (both axes)
      const bothMirror = Skia.Matrix();
      bothMirror.concat(vertMirror);
      bothMirror.concat(horzMirror);

      return [identity, vertMirror, horzMirror, bothMirror];
    }

    case "radial4": {
      // 4 copies rotated 0°, 90°, 180°, 270°
      return [
        identity,
        createRotationMatrix(centerX, centerY, 90),
        createRotationMatrix(centerX, centerY, 180),
        createRotationMatrix(centerX, centerY, 270),
      ];
    }

    case "radial8": {
      // 8 copies rotated 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
      return [
        identity,
        createRotationMatrix(centerX, centerY, 45),
        createRotationMatrix(centerX, centerY, 90),
        createRotationMatrix(centerX, centerY, 135),
        createRotationMatrix(centerX, centerY, 180),
        createRotationMatrix(centerX, centerY, 225),
        createRotationMatrix(centerX, centerY, 270),
        createRotationMatrix(centerX, centerY, 315),
      ];
    }

    default:
      return [identity];
  }
};

/**
 * Applies symmetry transformations to a path, creating mirrored copies.
 *
 * @param path - Original path to transform
 * @param mode - Symmetry mode to apply
 * @param centerX - X coordinate of symmetry center
 * @param centerY - Y coordinate of symmetry center
 * @returns Array of paths (original + transformed copies)
 */
export const applySymmetryToPath = (
  path: SkPath,
  mode: SymmetryMode,
  centerX: number,
  centerY: number,
): SkPath[] => {
  if (mode === "none") {
    return [path];
  }

  const matrices = getSymmetryMatrices(mode, centerX, centerY);
  const results: SkPath[] = [];

  for (const matrix of matrices) {
    const transformedPath = path.copy();
    transformedPath.transform(matrix);
    results.push(transformedPath);
  }

  return results;
};

/**
 * Gets the number of copies that will be created for a symmetry mode.
 * Useful for performance considerations.
 *
 * @param mode - Symmetry mode
 * @returns Number of path copies (including original)
 */
export const getSymmetryCopyCount = (mode: SymmetryMode): number => {
  switch (mode) {
    case "none":
      return 1;
    case "vertical":
    case "horizontal":
      return 2;
    case "both":
    case "radial4":
      return 4;
    case "radial8":
      return 8;
    default:
      return 1;
  }
};

/**
 * Cycles to the next symmetry mode in order.
 * Useful for quick toolbar toggle.
 *
 * @param current - Current symmetry mode
 * @returns Next symmetry mode
 */
export const getNextSymmetryMode = (current: SymmetryMode): SymmetryMode => {
  const modes: SymmetryMode[] = [
    "none",
    "vertical",
    "horizontal",
    "both",
    "radial4",
    "radial8",
  ];
  const currentIndex = modes.indexOf(current);
  const nextIndex = (currentIndex + 1) % modes.length;
  return modes[nextIndex];
};
