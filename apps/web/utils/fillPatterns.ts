/**
 * Pattern generation utilities for the fill tool
 * Creates repeatable canvas patterns for various fill effects
 */

import type { FillPattern } from '@/constants';

type PatternConfig = {
  tileSize: number;
  color: string;
  backgroundColor?: string;
};

/**
 * Parse hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Create a lighter version of a color for pattern backgrounds
 */
function lightenColor(hex: string, amount: number = 0.85): string {
  const { r, g, b } = hexToRgb(hex);
  const lighten = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${lighten(r)}, ${lighten(g)}, ${lighten(b)})`;
}

/**
 * Create polka dot pattern
 */
function createDotsPattern(
  ctx: CanvasRenderingContext2D,
  config: PatternConfig,
): CanvasPattern | null {
  const { tileSize, color, backgroundColor } = config;
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  const patternCtx = canvas.getContext('2d');
  if (!patternCtx) return null;

  // Background
  patternCtx.fillStyle = backgroundColor || lightenColor(color);
  patternCtx.fillRect(0, 0, tileSize, tileSize);

  // Dots
  const dotRadius = tileSize * 0.2;
  patternCtx.fillStyle = color;

  // Center dot
  patternCtx.beginPath();
  patternCtx.arc(tileSize / 2, tileSize / 2, dotRadius, 0, Math.PI * 2);
  patternCtx.fill();

  // Corner dots (appear in adjacent tiles)
  patternCtx.beginPath();
  patternCtx.arc(0, 0, dotRadius, 0, Math.PI * 2);
  patternCtx.fill();
  patternCtx.beginPath();
  patternCtx.arc(tileSize, 0, dotRadius, 0, Math.PI * 2);
  patternCtx.fill();
  patternCtx.beginPath();
  patternCtx.arc(0, tileSize, dotRadius, 0, Math.PI * 2);
  patternCtx.fill();
  patternCtx.beginPath();
  patternCtx.arc(tileSize, tileSize, dotRadius, 0, Math.PI * 2);
  patternCtx.fill();

  return ctx.createPattern(canvas, 'repeat');
}

/**
 * Create horizontal stripes pattern
 */
function createStripesPattern(
  ctx: CanvasRenderingContext2D,
  config: PatternConfig,
): CanvasPattern | null {
  const { tileSize, color, backgroundColor } = config;
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  const patternCtx = canvas.getContext('2d');
  if (!patternCtx) return null;

  const stripeHeight = tileSize / 2;

  // Alternating stripes
  patternCtx.fillStyle = color;
  patternCtx.fillRect(0, 0, tileSize, stripeHeight);

  patternCtx.fillStyle = backgroundColor || lightenColor(color);
  patternCtx.fillRect(0, stripeHeight, tileSize, stripeHeight);

  return ctx.createPattern(canvas, 'repeat');
}

/**
 * Create diagonal stripes pattern
 */
function createDiagonalStripesPattern(
  ctx: CanvasRenderingContext2D,
  config: PatternConfig,
): CanvasPattern | null {
  const { tileSize, color, backgroundColor } = config;
  const canvas = document.createElement('canvas');
  // Larger tile for diagonal pattern
  const diagSize = tileSize * 2;
  canvas.width = diagSize;
  canvas.height = diagSize;
  const patternCtx = canvas.getContext('2d');
  if (!patternCtx) return null;

  // Background
  patternCtx.fillStyle = backgroundColor || lightenColor(color);
  patternCtx.fillRect(0, 0, diagSize, diagSize);

  // Diagonal stripes
  patternCtx.fillStyle = color;
  patternCtx.lineWidth = tileSize * 0.4;
  patternCtx.strokeStyle = color;
  patternCtx.lineCap = 'square';

  // Draw diagonal lines
  for (let i = -diagSize; i < diagSize * 2; i += tileSize) {
    patternCtx.beginPath();
    patternCtx.moveTo(i, 0);
    patternCtx.lineTo(i + diagSize, diagSize);
    patternCtx.stroke();
  }

  return ctx.createPattern(canvas, 'repeat');
}

/**
 * Create checkerboard pattern
 */
function createCheckerboardPattern(
  ctx: CanvasRenderingContext2D,
  config: PatternConfig,
): CanvasPattern | null {
  const { tileSize, color, backgroundColor } = config;
  const canvas = document.createElement('canvas');
  canvas.width = tileSize * 2;
  canvas.height = tileSize * 2;
  const patternCtx = canvas.getContext('2d');
  if (!patternCtx) return null;

  const bg = backgroundColor || lightenColor(color);

  // Top-left and bottom-right: color
  patternCtx.fillStyle = color;
  patternCtx.fillRect(0, 0, tileSize, tileSize);
  patternCtx.fillRect(tileSize, tileSize, tileSize, tileSize);

  // Top-right and bottom-left: background
  patternCtx.fillStyle = bg;
  patternCtx.fillRect(tileSize, 0, tileSize, tileSize);
  patternCtx.fillRect(0, tileSize, tileSize, tileSize);

  return ctx.createPattern(canvas, 'repeat');
}

/**
 * Create hearts pattern
 */
function createHeartsPattern(
  ctx: CanvasRenderingContext2D,
  config: PatternConfig,
): CanvasPattern | null {
  const { tileSize, color, backgroundColor } = config;
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  const patternCtx = canvas.getContext('2d');
  if (!patternCtx) return null;

  // Background
  patternCtx.fillStyle = backgroundColor || lightenColor(color);
  patternCtx.fillRect(0, 0, tileSize, tileSize);

  // Draw heart
  const heartSize = tileSize * 0.5;
  const centerX = tileSize / 2;
  const centerY = tileSize / 2;

  patternCtx.fillStyle = color;
  patternCtx.beginPath();

  // Heart shape using bezier curves
  const topY = centerY - heartSize * 0.3;
  const bottomY = centerY + heartSize * 0.5;

  patternCtx.moveTo(centerX, bottomY);
  // Left side
  patternCtx.bezierCurveTo(
    centerX - heartSize * 0.5,
    centerY,
    centerX - heartSize * 0.5,
    topY - heartSize * 0.2,
    centerX,
    topY,
  );
  // Right side
  patternCtx.bezierCurveTo(
    centerX + heartSize * 0.5,
    topY - heartSize * 0.2,
    centerX + heartSize * 0.5,
    centerY,
    centerX,
    bottomY,
  );
  patternCtx.fill();

  return ctx.createPattern(canvas, 'repeat');
}

/**
 * Create stars pattern
 */
function createStarsPattern(
  ctx: CanvasRenderingContext2D,
  config: PatternConfig,
): CanvasPattern | null {
  const { tileSize, color, backgroundColor } = config;
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  const patternCtx = canvas.getContext('2d');
  if (!patternCtx) return null;

  // Background
  patternCtx.fillStyle = backgroundColor || lightenColor(color);
  patternCtx.fillRect(0, 0, tileSize, tileSize);

  // Draw 5-point star
  const starSize = tileSize * 0.35;
  const centerX = tileSize / 2;
  const centerY = tileSize / 2;

  patternCtx.fillStyle = color;
  patternCtx.beginPath();

  const points = 5;
  const outerRadius = starSize;
  const innerRadius = starSize * 0.4;

  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    if (i === 0) {
      patternCtx.moveTo(x, y);
    } else {
      patternCtx.lineTo(x, y);
    }
  }

  patternCtx.closePath();
  patternCtx.fill();

  return ctx.createPattern(canvas, 'repeat');
}

/**
 * Create zigzag pattern
 */
function createZigzagPattern(
  ctx: CanvasRenderingContext2D,
  config: PatternConfig,
): CanvasPattern | null {
  const { tileSize, color, backgroundColor } = config;
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  const patternCtx = canvas.getContext('2d');
  if (!patternCtx) return null;

  // Background
  patternCtx.fillStyle = backgroundColor || lightenColor(color);
  patternCtx.fillRect(0, 0, tileSize, tileSize);

  // Draw zigzag
  patternCtx.strokeStyle = color;
  patternCtx.lineWidth = tileSize * 0.15;
  patternCtx.lineCap = 'round';
  patternCtx.lineJoin = 'round';

  const zigHeight = tileSize / 3;
  const zigWidth = tileSize / 2;

  // Draw multiple zigzag rows
  for (let row = 0; row < 3; row++) {
    const y = row * zigHeight + zigHeight / 2;
    patternCtx.beginPath();
    patternCtx.moveTo(0, y);
    patternCtx.lineTo(zigWidth / 2, y - zigHeight / 3);
    patternCtx.lineTo(zigWidth, y);
    patternCtx.lineTo(zigWidth + zigWidth / 2, y - zigHeight / 3);
    patternCtx.lineTo(tileSize, y);
    patternCtx.stroke();
  }

  return ctx.createPattern(canvas, 'repeat');
}

/**
 * Create a fill pattern based on the pattern type
 * Returns a CanvasPattern for patterns, or the color string for solid fills
 */
export function createFillPattern(
  ctx: CanvasRenderingContext2D,
  pattern: FillPattern,
  color: string,
  tileSize: number = 24,
): CanvasPattern | string {
  // Solid fill just returns the color
  if (pattern === 'solid') {
    return color;
  }

  const config: PatternConfig = {
    tileSize,
    color,
  };

  let canvasPattern: CanvasPattern | null = null;

  switch (pattern) {
    case 'dots':
      canvasPattern = createDotsPattern(ctx, config);
      break;
    case 'stripes':
      canvasPattern = createStripesPattern(ctx, config);
      break;
    case 'stripes-diagonal':
      canvasPattern = createDiagonalStripesPattern(ctx, config);
      break;
    case 'checkerboard':
      canvasPattern = createCheckerboardPattern(ctx, config);
      break;
    case 'hearts':
      canvasPattern = createHeartsPattern(ctx, config);
      break;
    case 'stars':
      canvasPattern = createStarsPattern(ctx, config);
      break;
    case 'zigzag':
      canvasPattern = createZigzagPattern(ctx, config);
      break;
    default:
      return color;
  }

  // Fallback to solid color if pattern creation failed
  return canvasPattern || color;
}

/**
 * Get RGBA color object from pattern fill result
 * Used when flood fill needs RGBA values
 */
export function getPatternFillColor(
  pattern: FillPattern,
  color: string,
): { r: number; g: number; b: number; a: number } {
  const { r, g, b } = hexToRgb(color);
  return { r, g, b, a: 255 };
}
