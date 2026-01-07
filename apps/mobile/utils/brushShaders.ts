import {
  Skia,
  BlendMode,
  SkPaint,
  StrokeCap,
  StrokeJoin,
  BlurStyle,
} from "@shopify/react-native-skia";
import type { BrushType } from "@/stores/canvasStore";
import { BRUSH_TEXTURE_CONFIG, applyTextureToStroke } from "./brushTextures";

/**
 * Options for brush paint creation
 */
type BrushPaintOptions = {
  /** Enable texture effects for applicable brushes */
  useTextures?: boolean;
  /** Seed for texture variation (random variation per stroke) */
  textureSeed?: number;
};

/**
 * Creates a paint object configured for the specified brush type
 */
export const createBrushPaint = (
  color: string,
  brushType: BrushType,
  strokeWidth: number,
  options: BrushPaintOptions = {},
): SkPaint => {
  const { useTextures = false, textureSeed = 0 } = options;

  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setStyle(1); // Stroke
  paint.setStrokeWidth(strokeWidth);
  paint.setStrokeCap(StrokeCap.Round);
  paint.setStrokeJoin(StrokeJoin.Round);
  paint.setAntiAlias(true);

  let styledPaint: SkPaint;

  switch (brushType) {
    case "crayon":
      styledPaint = applyCrayonEffect(paint, strokeWidth);
      break;
    case "marker":
      styledPaint = applyMarkerEffect(paint);
      break;
    case "pencil":
      styledPaint = applyPencilEffect(paint, strokeWidth);
      break;
    case "rainbow":
      styledPaint = applyRainbowEffect(paint, strokeWidth);
      break;
    case "glow":
      styledPaint = applyGlowEffect(paint, strokeWidth);
      break;
    case "neon":
      styledPaint = applyNeonEffect(paint, strokeWidth);
      break;
    case "glitter":
      styledPaint = applyGlitterEffect(paint, strokeWidth);
      break;
    default:
      styledPaint = paint;
  }

  // Apply texture if enabled and brush supports it
  if (useTextures) {
    const textureConfig = BRUSH_TEXTURE_CONFIG[brushType];
    if (textureConfig?.texture) {
      applyTextureToStroke(
        styledPaint,
        textureConfig.texture,
        color,
        textureSeed,
      );
    }
  }

  return styledPaint;
};

/**
 * Crayon effect - rough, textured edges with slight transparency variation
 * For kids coloring, we use a simpler approach with opacity for better performance
 */
const applyCrayonEffect = (paint: SkPaint, strokeWidth: number): SkPaint => {
  // Crayon has a slightly rough, semi-transparent quality
  paint.setAlphaf(0.85);
  paint.setBlendMode(BlendMode.SrcOver);
  // Slightly increase stroke width for crayon's waxy appearance
  paint.setStrokeWidth(strokeWidth * 1.1);
  return paint;
};

/**
 * Marker effect - smooth, bold strokes with slight transparency
 */
const applyMarkerEffect = (paint: SkPaint): SkPaint => {
  // Markers are smooth with consistent opacity
  paint.setAlphaf(0.75);
  paint.setBlendMode(BlendMode.Multiply);
  return paint;
};

/**
 * Pencil effect - thin, precise lines
 */
const applyPencilEffect = (paint: SkPaint, strokeWidth: number): SkPaint => {
  // Pencil is precise with full opacity
  paint.setAlphaf(1.0);
  paint.setStrokeWidth(Math.max(1, strokeWidth * 0.5));
  return paint;
};

/**
 * Rainbow effect - vibrant, bold strokes
 * Color is handled separately through the hue cycling system
 */
const applyRainbowEffect = (paint: SkPaint, strokeWidth: number): SkPaint => {
  // Rainbow brush is bold and vibrant
  paint.setAlphaf(1.0);
  paint.setBlendMode(BlendMode.SrcOver);
  paint.setStrokeWidth(strokeWidth * 1.3);
  return paint;
};

/**
 * Glow effect - soft, luminous strokes with blur
 */
const applyGlowEffect = (paint: SkPaint, strokeWidth: number): SkPaint => {
  // Glow has a soft, blurred appearance
  paint.setAlphaf(0.7);
  paint.setBlendMode(BlendMode.Screen);
  paint.setStrokeWidth(strokeWidth * 1.5);
  // Add blur for glow effect
  paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 8, true));
  return paint;
};

/**
 * Neon effect - bright, electric strokes with strong glow
 */
const applyNeonEffect = (paint: SkPaint, strokeWidth: number): SkPaint => {
  // Neon is bright and electric
  paint.setAlphaf(1.0);
  paint.setBlendMode(BlendMode.Screen);
  paint.setStrokeWidth(strokeWidth * 1.2);
  // Stronger blur for neon glow
  paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Outer, 12, true));
  return paint;
};

/**
 * Glitter effect - sparkly, shimmery strokes
 * Base stroke for the glitter path (particles rendered separately)
 */
const applyGlitterEffect = (paint: SkPaint, strokeWidth: number): SkPaint => {
  // Glitter base is semi-transparent with a slight shimmer
  paint.setAlphaf(0.6);
  paint.setBlendMode(BlendMode.SrcOver);
  paint.setStrokeWidth(strokeWidth * 1.0);
  return paint;
};

/**
 * Creates simple paint without effects (for performance or fallback)
 */
export const createSimplePaint = (
  color: string,
  strokeWidth: number,
  alpha: number = 1.0,
): SkPaint => {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setStyle(1); // Stroke
  paint.setStrokeWidth(strokeWidth);
  paint.setStrokeCap(StrokeCap.Round);
  paint.setStrokeJoin(StrokeJoin.Round);
  paint.setAntiAlias(true);
  paint.setAlphaf(alpha);
  return paint;
};

/**
 * Creates paint for fill operations
 */
export const createFillPaint = (color: string): SkPaint => {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setStyle(0); // Fill
  paint.setAntiAlias(true);
  return paint;
};

/**
 * Returns the stroke width multiplier for each brush type
 */
export const getBrushMultiplier = (brushType: BrushType): number => {
  switch (brushType) {
    case "crayon":
      return 1.2; // Crayons are slightly thicker
    case "marker":
      return 1.5; // Markers are bold
    case "pencil":
      return 0.5; // Pencils are thin
    case "rainbow":
      return 1.3; // Rainbow is bold and vibrant
    case "glow":
      return 1.5; // Glow is wider for soft effect
    case "neon":
      return 1.2; // Neon is moderately thick
    case "glitter":
      return 1.0; // Glitter is normal width with particles
    default:
      return 1.0;
  }
};
