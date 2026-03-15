/**
 * Pattern utilities for kid-friendly fill patterns
 * Uses Skia for pattern rendering
 */

import {
  Skia,
  TileMode,
  FilterMode,
  SkShader,
  SkPaint,
  StrokeCap,
} from "@shopify/react-native-skia";
import type { PatternType } from "@/stores/canvasStore";

/**
 * Creates a dots pattern shader
 */
const createDotsPattern = (
  color: string,
  size: number = 8,
): SkShader | null => {
  try {
    // Create a small picture with dots
    const patternSize = size * 3;
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording({
      x: 0,
      y: 0,
      width: patternSize,
      height: patternSize,
    });

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(color));
    paint.setAntiAlias(true);

    // Draw a dot in the center
    canvas.drawCircle(patternSize / 2, patternSize / 2, size / 2, paint);

    const picture = recorder.finishRecordingAsPicture();
    return picture.makeShader(
      TileMode.Repeat,
      TileMode.Repeat,
      FilterMode.Linear,
    );
  } catch {
    return null;
  }
};

/**
 * Creates a stripes pattern shader
 */
const createStripesPattern = (
  color: string,
  size: number = 10,
): SkShader | null => {
  try {
    const patternSize = size * 2;
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording({
      x: 0,
      y: 0,
      width: patternSize,
      height: patternSize,
    });

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(color));
    paint.setAntiAlias(true);
    paint.setStrokeWidth(size / 2);
    paint.setStyle(1); // Stroke

    // Draw diagonal stripe
    canvas.drawLine(0, patternSize, patternSize, 0, paint);

    const picture = recorder.finishRecordingAsPicture();
    return picture.makeShader(
      TileMode.Repeat,
      TileMode.Repeat,
      FilterMode.Linear,
    );
  } catch {
    return null;
  }
};

/**
 * Creates a hearts pattern shader
 */
const createHeartsPattern = (
  color: string,
  size: number = 16,
): SkShader | null => {
  try {
    const patternSize = size * 2;
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording({
      x: 0,
      y: 0,
      width: patternSize,
      height: patternSize,
    });

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(color));
    paint.setAntiAlias(true);

    // Draw a simple heart shape using path
    const heartPath = Skia.Path.Make();
    const cx = patternSize / 2;
    const cy = patternSize / 2;
    const heartSize = size * 0.4;

    // Heart shape using bezier curves
    heartPath.moveTo(cx, cy + heartSize * 0.3);
    heartPath.cubicTo(
      cx - heartSize,
      cy - heartSize * 0.3,
      cx - heartSize * 0.5,
      cy - heartSize,
      cx,
      cy - heartSize * 0.5,
    );
    heartPath.cubicTo(
      cx + heartSize * 0.5,
      cy - heartSize,
      cx + heartSize,
      cy - heartSize * 0.3,
      cx,
      cy + heartSize * 0.3,
    );
    heartPath.close();

    canvas.drawPath(heartPath, paint);

    const picture = recorder.finishRecordingAsPicture();
    return picture.makeShader(
      TileMode.Repeat,
      TileMode.Repeat,
      FilterMode.Linear,
    );
  } catch {
    return null;
  }
};

/**
 * Creates a stars pattern shader
 */
const createStarsPattern = (
  color: string,
  size: number = 16,
): SkShader | null => {
  try {
    const patternSize = size * 2;
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording({
      x: 0,
      y: 0,
      width: patternSize,
      height: patternSize,
    });

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(color));
    paint.setAntiAlias(true);

    // Draw a simple 5-point star
    const starPath = Skia.Path.Make();
    const cx = patternSize / 2;
    const cy = patternSize / 2;
    const outerRadius = size * 0.4;
    const innerRadius = outerRadius * 0.4;
    const points = 5;

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);

      if (i === 0) {
        starPath.moveTo(x, y);
      } else {
        starPath.lineTo(x, y);
      }
    }
    starPath.close();

    canvas.drawPath(starPath, paint);

    const picture = recorder.finishRecordingAsPicture();
    return picture.makeShader(
      TileMode.Repeat,
      TileMode.Repeat,
      FilterMode.Linear,
    );
  } catch {
    return null;
  }
};

/**
 * Creates a zigzag pattern shader
 */
const createZigzagPattern = (
  color: string,
  size: number = 12,
): SkShader | null => {
  try {
    const patternWidth = size * 2;
    const patternHeight = size;
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording({
      x: 0,
      y: 0,
      width: patternWidth,
      height: patternHeight,
    });

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(color));
    paint.setAntiAlias(true);
    paint.setStrokeWidth(size / 4);
    paint.setStyle(1); // Stroke
    paint.setStrokeCap(StrokeCap.Round);

    // Draw zigzag line
    canvas.drawLine(0, patternHeight, size, 0, paint);
    canvas.drawLine(size, 0, patternWidth, patternHeight, paint);

    const picture = recorder.finishRecordingAsPicture();
    return picture.makeShader(
      TileMode.Repeat,
      TileMode.Repeat,
      FilterMode.Linear,
    );
  } catch {
    return null;
  }
};

/**
 * Creates a confetti pattern shader
 */
const createConfettiPattern = (
  color: string,
  size: number = 20,
): SkShader | null => {
  try {
    const patternSize = size * 2;
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording({
      x: 0,
      y: 0,
      width: patternSize,
      height: patternSize,
    });

    const paint = Skia.Paint();
    paint.setAntiAlias(true);

    // Draw small colorful rectangles (confetti pieces)
    const confettiSize = size / 4;

    // Main color confetti
    paint.setColor(Skia.Color(color));
    canvas.drawRect(
      {
        x: confettiSize,
        y: confettiSize,
        width: confettiSize,
        height: confettiSize * 1.5,
      },
      paint,
    );

    // Slightly offset confetti
    canvas.drawRect(
      {
        x: patternSize - confettiSize * 1.5,
        y: patternSize - confettiSize * 2,
        width: confettiSize,
        height: confettiSize * 1.5,
      },
      paint,
    );

    const picture = recorder.finishRecordingAsPicture();
    return picture.makeShader(
      TileMode.Repeat,
      TileMode.Repeat,
      FilterMode.Linear,
    );
  } catch {
    return null;
  }
};

/**
 * Get pattern shader based on pattern type
 */
export const getPatternShader = (
  patternType: PatternType,
  color: string,
  size?: number,
): SkShader | null => {
  switch (patternType) {
    case "dots":
      return createDotsPattern(color, size);
    case "stripes":
      return createStripesPattern(color, size);
    case "hearts":
      return createHeartsPattern(color, size);
    case "stars":
      return createStarsPattern(color, size);
    case "zigzag":
      return createZigzagPattern(color, size);
    case "confetti":
      return createConfettiPattern(color, size);
    default:
      return null;
  }
};

/**
 * Create a paint with pattern shader
 */
export const createPatternPaint = (
  patternType: PatternType,
  color: string,
  size?: number,
): SkPaint => {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);

  const shader = getPatternShader(patternType, color, size);
  if (shader) {
    paint.setShader(shader);
  } else {
    // Fallback to solid color if pattern fails
    paint.setColor(Skia.Color(color));
  }

  return paint;
};

/**
 * Pattern display info for UI
 */
export const PATTERN_INFO: Record<
  PatternType,
  { icon: string; label: string }
> = {
  dots: { icon: "⚫", label: "Dots" },
  stripes: { icon: "📊", label: "Stripes" },
  hearts: { icon: "❤️", label: "Hearts" },
  stars: { icon: "⭐", label: "Stars" },
  zigzag: { icon: "〰️", label: "Zigzag" },
  confetti: { icon: "🎉", label: "Confetti" },
};
