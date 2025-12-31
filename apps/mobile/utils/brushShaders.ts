import {
  Skia,
  BlendMode,
  SkPaint,
  StrokeCap,
  StrokeJoin,
  BlurStyle,
} from "@shopify/react-native-skia";
import type { BrushType } from "@/stores/canvasStore";

/**
 * Creates a paint object configured for the specified brush type
 */
export const createBrushPaint = (
  color: string,
  brushType: BrushType,
  strokeWidth: number,
): SkPaint => {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setStyle(1); // Stroke
  paint.setStrokeWidth(strokeWidth);
  paint.setStrokeCap(StrokeCap.Round);
  paint.setStrokeJoin(StrokeJoin.Round);
  paint.setAntiAlias(true);

  switch (brushType) {
    case "crayon":
      return applyCrayonEffect(paint, strokeWidth);
    case "marker":
      return applyMarkerEffect(paint);
    case "pencil":
      return applyPencilEffect(paint, strokeWidth);
    case "rainbow":
      return applyRainbowEffect(paint, strokeWidth);
    case "glow":
      return applyGlowEffect(paint, strokeWidth);
    case "neon":
      return applyNeonEffect(paint, strokeWidth);
    case "glitter":
      return applyGlitterEffect(paint, strokeWidth);
    default:
      return paint;
  }
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
