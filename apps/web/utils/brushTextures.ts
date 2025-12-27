/**
 * Brush texture utilities for kid-friendly coloring experience
 *
 * Crayon: Grainy, soft edges with slight opacity variations - mimics real crayon
 * Marker: Solid, hard edges with consistent color - mimics felt-tip marker
 * Glitter: Sparkly particles that shimmer with multiple colors
 * Sparkle: Star-shaped sparkles that appear randomly along the stroke
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
  } else if (brushType === 'glitter') {
    drawGlitterStroke({ ctx, x, y, lastX, lastY, color, radius });
  } else if (brushType === 'sparkle') {
    drawSparkleStroke({ ctx, x, y, lastX, lastY, color, radius });
  } else if (brushType === 'rainbow') {
    drawRainbowStroke({ ctx, x, y, lastX, lastY, radius });
  } else if (brushType === 'glow') {
    drawGlowStroke({ ctx, x, y, lastX, lastY, color, radius });
  } else if (brushType === 'neon') {
    drawNeonStroke({ ctx, x, y, lastX, lastY, color, radius });
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

/**
 * Convert RGB to HSL for color variations
 */
const rgbToHsl = (
  r: number,
  g: number,
  b: number,
): { h: number; s: number; l: number } => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h, s, l };
};

/**
 * Convert HSL to RGB
 */
const hslToRgb = (
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } => {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

/**
 * Glitter texture: Sparkly particles with color variations
 * - Multiple shimmering dots
 * - Color variations (lighter/darker/shifted hue)
 * - Random highlights (white sparkles)
 */
const drawGlitterStroke = ({
  ctx,
  x,
  y,
  lastX,
  lastY,
  color,
  radius,
}: Omit<DrawStrokeParams, 'brushType'>): void => {
  ctx.globalCompositeOperation = 'source-over';

  const rgb = hexToRgb(color);
  if (!rgb) return;

  // Draw connecting line with glitter texture
  if (lastX !== null && lastY !== null) {
    const distance = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
    const steps = Math.max(1, Math.floor(distance / 3));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = lastX + (x - lastX) * t;
      const py = lastY + (y - lastY) * t;

      drawGlitterDab(ctx, px, py, radius, rgb);
    }
  }

  // Always draw at current position
  drawGlitterDab(ctx, x, y, radius, rgb);
};

/**
 * Draw a single glitter "dab" - shimmering particles with color variations
 */
const drawGlitterDab = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rgb: { r: number; g: number; b: number },
): void => {
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const particleCount = Math.floor(radius * 2);

  for (let i = 0; i < particleCount; i++) {
    // Random position within radius
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius * 0.9;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;

    // Varying particle size (smaller for more sparkle effect)
    const particleRadius = Math.random() * (radius * 0.25) + radius * 0.05;

    // Create color variation
    let particleColor: string;
    const variation = Math.random();

    if (variation < 0.15) {
      // White highlight (sparkle)
      particleColor = `rgba(255, 255, 255, ${0.7 + Math.random() * 0.3})`;
    } else if (variation < 0.4) {
      // Lighter version
      const lighterRgb = hslToRgb(hsl.h, hsl.s, Math.min(0.95, hsl.l + 0.3));
      particleColor = `rgba(${lighterRgb.r}, ${lighterRgb.g}, ${lighterRgb.b}, ${0.6 + Math.random() * 0.4})`;
    } else if (variation < 0.6) {
      // Slight hue shift
      const shiftedRgb = hslToRgb(
        (hsl.h + (Math.random() * 0.1 - 0.05) + 1) % 1,
        hsl.s,
        hsl.l,
      );
      particleColor = `rgba(${shiftedRgb.r}, ${shiftedRgb.g}, ${shiftedRgb.b}, ${0.6 + Math.random() * 0.4})`;
    } else {
      // Original color with varying opacity
      particleColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.5 + Math.random() * 0.5})`;
    }

    ctx.beginPath();
    ctx.arc(px, py, particleRadius, 0, Math.PI * 2);
    ctx.fillStyle = particleColor;
    ctx.fill();
  }

  // Add a few extra bright highlights
  const highlightCount = Math.floor(radius * 0.3);
  for (let i = 0; i < highlightCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius * 0.8;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    const size = Math.random() * 2 + 1;

    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + Math.random() * 0.2})`;
    ctx.fill();
  }
};

/**
 * Sparkle texture: Star-shaped sparkles along the stroke
 * - Star shapes with 4 or 6 points
 * - Varying sizes
 * - Bright highlights
 */
const drawSparkleStroke = ({
  ctx,
  x,
  y,
  lastX,
  lastY,
  color,
  radius,
}: Omit<DrawStrokeParams, 'brushType'>): void => {
  ctx.globalCompositeOperation = 'source-over';

  const rgb = hexToRgb(color);
  if (!rgb) return;

  // Draw base stroke with slight transparency
  if (lastX !== null && lastY !== null) {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
    ctx.lineWidth = radius * 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Add sparkles along the line
    const distance = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
    const sparkleSpacing = radius * 2;
    const sparkleCount = Math.max(1, Math.floor(distance / sparkleSpacing));

    for (let i = 0; i <= sparkleCount; i++) {
      const t = i / Math.max(1, sparkleCount);
      const px = lastX + (x - lastX) * t;
      const py = lastY + (y - lastY) * t;

      // Random chance to draw sparkle
      if (Math.random() < 0.4) {
        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetDist = Math.random() * radius * 0.5;
        drawStar(
          ctx,
          px + Math.cos(offsetAngle) * offsetDist,
          py + Math.sin(offsetAngle) * offsetDist,
          Math.random() * radius * 0.4 + radius * 0.2,
          rgb,
        );
      }
    }
  }

  // Draw circle at current position
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.8, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
  ctx.fill();

  // Draw sparkle at current position
  if (Math.random() < 0.6) {
    drawStar(ctx, x, y, radius * 0.5, rgb);
  }
};

/**
 * Draw a 4-pointed star shape
 */
const drawStar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rgb: { r: number; g: number; b: number },
): void => {
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const rotation = Math.random() * Math.PI * 0.5; // Random rotation for variety

  // Create gradient for sparkle effect
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');

  // Lighter version of the color
  const lighterRgb = hslToRgb(hsl.h, hsl.s, Math.min(0.9, hsl.l + 0.2));
  gradient.addColorStop(
    0.3,
    `rgba(${lighterRgb.r}, ${lighterRgb.g}, ${lighterRgb.b}, 0.9)`,
  );
  gradient.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
  gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Draw 4-pointed star
  ctx.beginPath();
  const points = 4;
  const outerRadius = size;
  const innerRadius = size * 0.3;

  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / points;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }

  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Add bright center
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fill();

  ctx.restore();
};

// Track rainbow hue position globally for continuous color cycling
let rainbowHue = 0;

/**
 * Rainbow texture: Color-shifting stroke that cycles through rainbow colors
 * - Smooth color transitions
 * - Vibrant, saturated colors
 * - Uses HSL cycling for smooth rainbow effect
 */
const drawRainbowStroke = ({
  ctx,
  x,
  y,
  lastX,
  lastY,
  radius,
}: Omit<DrawStrokeParams, 'brushType' | 'color'>): void => {
  ctx.globalCompositeOperation = 'source-over';

  // Draw rainbow stroke
  if (lastX !== null && lastY !== null) {
    const distance = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
    const steps = Math.max(1, Math.floor(distance / 2));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = lastX + (x - lastX) * t;
      const py = lastY + (y - lastY) * t;

      // Cycle through rainbow colors
      rainbowHue = (rainbowHue + 0.01) % 1;
      const rgb = hslToRgb(rainbowHue, 0.9, 0.55);

      // Draw smooth colored circles
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`;
      ctx.fill();

      // Add slight white highlight in center
      ctx.beginPath();
      ctx.arc(px, py, radius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, 0.3)`;
      ctx.fill();
    }
  }

  // Draw at current position
  rainbowHue = (rainbowHue + 0.01) % 1;
  const rgb = hslToRgb(rainbowHue, 0.9, 0.55);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`;
  ctx.fill();
};

/**
 * Glow texture: Soft outer glow effect around the stroke
 * - Multiple layered circles with decreasing opacity
 * - Creates soft, dreamy effect
 * - Outer glow extends beyond brush radius
 */
const drawGlowStroke = ({
  ctx,
  x,
  y,
  lastX,
  lastY,
  color,
  radius,
}: Omit<DrawStrokeParams, 'brushType'>): void => {
  ctx.globalCompositeOperation = 'source-over';

  const rgb = hexToRgb(color);
  if (!rgb) return;

  // Draw connecting line with glow
  if (lastX !== null && lastY !== null) {
    const distance = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
    const steps = Math.max(1, Math.floor(distance / 3));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = lastX + (x - lastX) * t;
      const py = lastY + (y - lastY) * t;

      drawGlowDab(ctx, px, py, radius, rgb);
    }
  }

  // Always draw at current position
  drawGlowDab(ctx, x, y, radius, rgb);
};

/**
 * Draw a single glow "dab" - layered circles with soft glow
 */
const drawGlowDab = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rgb: { r: number; g: number; b: number },
): void => {
  // Create radial gradient for glow effect
  const glowRadius = radius * 2;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);

  // Bright center fading to transparent
  gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`);
  gradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
  gradient.addColorStop(0.6, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
  gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Add bright center
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, 0.5)`;
  ctx.fill();
};

/**
 * Neon texture: Hard edge with inner glow, like neon signs
 * - Solid color core
 * - Bright white center line
 * - Subtle outer glow
 */
const drawNeonStroke = ({
  ctx,
  x,
  y,
  lastX,
  lastY,
  color,
  radius,
}: Omit<DrawStrokeParams, 'brushType'>): void => {
  ctx.globalCompositeOperation = 'source-over';

  const rgb = hexToRgb(color);
  if (!rgb) return;

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const lighterRgb = hslToRgb(hsl.h, hsl.s, Math.min(0.95, hsl.l + 0.3));

  if (lastX !== null && lastY !== null) {
    // Layer 1: Outer glow (widest, most transparent)
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
    ctx.lineWidth = radius * 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Layer 2: Medium glow
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
    ctx.lineWidth = radius * 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Layer 3: Core color (solid)
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.95)`;
    ctx.lineWidth = radius * 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Layer 4: Lighter inner stroke
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${lighterRgb.r}, ${lighterRgb.g}, ${lighterRgb.b}, 0.9)`;
    ctx.lineWidth = radius * 0.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Layer 5: Bright white center (neon tube effect)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = radius * 0.3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // Draw at current position with same layering
  // Outer glow
  ctx.beginPath();
  ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
  ctx.fill();

  // Core
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.75, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.95)`;
  ctx.fill();

  // Lighter inner
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${lighterRgb.r}, ${lighterRgb.g}, ${lighterRgb.b}, 0.9)`;
  ctx.fill();

  // White center
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fill();
};
