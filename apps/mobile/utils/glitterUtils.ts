/**
 * Glitter effect utilities for sparkly brush strokes
 * Generates sparkle particles along a path
 */

import { SkPath, Skia } from "@shopify/react-native-skia";

export type GlitterParticle = {
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity: number;
  color: string;
};

/**
 * Maximum number of particles per stroke for performance
 * Keeps rendering smooth even on older devices
 */
const MAX_PARTICLES = 30;

/**
 * Generates glitter particles along a path
 * Uses path length sampling with randomization
 */
export const generateGlitterParticles = (
  path: SkPath,
  baseColor: string,
  density: number = 0.08, // Particles per unit length (reduced for performance)
): GlitterParticle[] => {
  const particles: GlitterParticle[] = [];

  try {
    // Get path bounds to estimate length
    const bounds = path.getBounds();
    const estimatedLength =
      Math.abs(bounds.width) +
      Math.abs(bounds.height) +
      Math.sqrt(bounds.width * bounds.width + bounds.height * bounds.height);

    // Calculate number of particles based on density, with min/max limits
    const numParticles = Math.min(
      MAX_PARTICLES,
      Math.max(5, Math.floor(estimatedLength * density)),
    );

    // Sample points along the path
    const pathMeasure = Skia.ContourMeasureIter(path, false, 1);
    let contour = pathMeasure.next();

    while (contour) {
      const length = contour.length();
      const step = length / numParticles;

      for (let i = 0; i < numParticles; i++) {
        const t = i * step + Math.random() * step * 0.5; // Add some randomness
        const result = contour.getPosTan(Math.min(t, length - 0.1));

        if (result) {
          const [position] = result; // getPosTan returns [position, tangent] tuple
          // Add randomization to particle position
          const offsetX = (Math.random() - 0.5) * 12;
          const offsetY = (Math.random() - 0.5) * 12;

          particles.push({
            x: position.x + offsetX,
            y: position.y + offsetY,
            size: 2 + Math.random() * 4, // Random size between 2-6
            rotation: Math.random() * Math.PI * 2, // Random rotation
            opacity: 0.5 + Math.random() * 0.5, // Random opacity 0.5-1.0
            color: getSparkleColor(baseColor),
          });
        }
      }

      contour = pathMeasure.next();
    }
  } catch (error) {
    // Fallback: generate particles at path bounds center
    const bounds = path.getBounds();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    for (let i = 0; i < 10; i++) {
      particles.push({
        x: centerX + (Math.random() - 0.5) * bounds.width,
        y: centerY + (Math.random() - 0.5) * bounds.height,
        size: 2 + Math.random() * 4,
        rotation: Math.random() * Math.PI * 2,
        opacity: 0.5 + Math.random() * 0.5,
        color: getSparkleColor(baseColor),
      });
    }
  }

  return particles;
};

/**
 * Generates a sparkle color based on the base color
 * Returns the base color or a lighter/white variant for shimmer effect
 */
const getSparkleColor = (baseColor: string): string => {
  const rand = Math.random();
  if (rand < 0.3) {
    return "#FFFFFF"; // White sparkle
  } else if (rand < 0.5) {
    return lightenColor(baseColor, 0.3); // Lighter version
  }
  return baseColor; // Original color
};

/**
 * Lightens a hex color by a given amount
 */
const lightenColor = (color: string, amount: number): string => {
  try {
    // Remove # if present
    const hex = color.replace("#", "");

    // Parse RGB values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Lighten each component
    const newR = Math.min(255, Math.round(r + (255 - r) * amount));
    const newG = Math.min(255, Math.round(g + (255 - g) * amount));
    const newB = Math.min(255, Math.round(b + (255 - b) * amount));

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
  } catch {
    return color;
  }
};

/**
 * Creates a 4-point star path for a sparkle
 */
export const createSparklePath = (
  x: number,
  y: number,
  size: number,
  rotation: number,
): SkPath => {
  const path = Skia.Path.Make();
  const innerRadius = size * 0.3;
  const outerRadius = size;

  // Draw a 4-point star
  for (let i = 0; i < 8; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = rotation + (i * Math.PI) / 4;
    const px = x + radius * Math.cos(angle);
    const py = y + radius * Math.sin(angle);

    if (i === 0) {
      path.moveTo(px, py);
    } else {
      path.lineTo(px, py);
    }
  }

  path.close();
  return path;
};
