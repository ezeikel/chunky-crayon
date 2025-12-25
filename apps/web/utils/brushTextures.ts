/**
 * Brush texture utilities for kid-friendly coloring experience
 *
 * Crayon: Grainy, soft edges with slight opacity variations - mimics real crayon
 * Marker: Solid, hard edges with consistent color - mimics felt-tip marker
 */

import type { BrushType } from '@/constants';

type DrawStrokeParams = {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  lastX: number | null;
  lastY: number | null;
  color: string;
  radius: number;
  brushType: BrushType;
};

/**
 * Draw a textured stroke based on brush type
 */
export const drawTexturedStroke = ({
  ctx,
  x,
  y,
  lastX,
  lastY,
  color,
  radius,
  brushType,
}: DrawStrokeParams): void => {
  if (brushType === 'eraser') {
    drawEraserStroke({ ctx, x, y, lastX, lastY, radius });
  } else if (brushType === 'crayon') {
    drawCrayonStroke({ ctx, x, y, lastX, lastY, color, radius });
  } else {
    drawMarkerStroke({ ctx, x, y, lastX, lastY, color, radius });
  }
};

/**
 * Crayon texture: Grainy with soft edges
 * - Multiple small dots with varying opacity
 * - Slight jitter for organic feel
 * - Soft, fuzzy edges
 */
const drawCrayonStroke = ({
  ctx,
  x,
  y,
  lastX,
  lastY,
  color,
  radius,
}: Omit<DrawStrokeParams, 'brushType'>): void => {
  ctx.globalCompositeOperation = 'source-over';

  // Parse color to RGB for opacity manipulation
  const rgb = hexToRgb(color);
  if (!rgb) return;

  // Draw connecting line with crayon texture
  if (lastX !== null && lastY !== null) {
    const distance = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
    const steps = Math.max(1, Math.floor(distance / 2)); // More steps for smoother texture

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = lastX + (x - lastX) * t;
      const py = lastY + (y - lastY) * t;

      drawCrayonDab(ctx, px, py, radius, rgb);
    }
  }

  // Always draw at current position
  drawCrayonDab(ctx, x, y, radius, rgb);
};

/**
 * Draw a single crayon "dab" - multiple small dots with texture
 */
const drawCrayonDab = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rgb: { r: number; g: number; b: number },
): void => {
  // Number of particles scales with brush size
  const particleCount = Math.floor(radius * 1.5);

  for (let i = 0; i < particleCount; i++) {
    // Random position within radius (gaussian-like distribution)
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius * 0.8;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;

    // Varying particle size
    const particleRadius = Math.random() * (radius * 0.4) + radius * 0.1;

    // Varying opacity for grainy texture (0.3 to 0.7)
    const opacity = 0.3 + Math.random() * 0.4;

    ctx.beginPath();
    ctx.arc(px, py, particleRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    ctx.fill();
  }

  // Core solid center for better coverage
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
  ctx.fill();
};

/**
 * Marker texture: Solid with hard edges
 * - Consistent opacity
 * - Clean, smooth strokes
 * - Slight transparency for layering
 */
const drawMarkerStroke = ({
  ctx,
  x,
  y,
  lastX,
  lastY,
  color,
  radius,
}: Omit<DrawStrokeParams, 'brushType'>): void => {
  ctx.globalCompositeOperation = 'source-over';

  // Marker has slight transparency for natural layering
  const rgb = hexToRgb(color);
  const markerColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)` : color;

  // Draw smooth line between last position and current
  if (lastX !== null && lastY !== null) {
    ctx.beginPath();
    ctx.strokeStyle = markerColor;
    ctx.lineWidth = radius * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // Draw circle at current position for consistent coverage
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = markerColor;
  ctx.fill();
};

/**
 * Eraser: Removes content with destination-out compositing
 */
const drawEraserStroke = ({
  ctx,
  x,
  y,
  lastX,
  lastY,
  radius,
}: Omit<DrawStrokeParams, 'brushType' | 'color'>): void => {
  ctx.globalCompositeOperation = 'destination-out';

  // Draw smooth line between last position and current
  if (lastX !== null && lastY !== null) {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = radius * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // Draw circle at current position
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fill();

  // Reset composite operation
  ctx.globalCompositeOperation = 'source-over';
};

/**
 * Convert hex color to RGB
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse 3 or 6 digit hex
  let r: number, g: number, b: number;

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  } else {
    return null;
  }

  return { r, g, b };
};
