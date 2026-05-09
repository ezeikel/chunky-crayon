/**
 * Reveal-beat number rendered to a `<canvas>` instead of layered HTML
 * divs. Sister component to BigNumberWithAberration — same props, same
 * sizing semantics, different paint pipeline.
 *
 * Why try canvas:
 *   - True per-channel separation. The HTML-div version uses opaque
 *     coloured text + opacity blending, which compositionally renders
 *     each channel as a tinted alpha mask. A canvas can use proper
 *     screen / lighter blending (`globalCompositeOperation = 'screen'`
 *     or `'lighter'`) so the three colour channels combine the way
 *     real chromatic aberration does — bright white in the overlap
 *     region, additive on the fringes.
 *   - Sub-pixel offset control. CSS transforms snap to device pixels
 *     in headless Chromium; canvas drawText takes float positions,
 *     so a 1.4px offset stays 1.4px instead of 1px-or-2px.
 *
 * Same fit-scale logic as the div version: measure once via
 * ctx.measureText, compute scale to fit `maxWidth`, draw at the
 * scaled font size.
 *
 * Caveats:
 *   - `<canvas>` doesn't paint until after mount + first effect run.
 *     Remotion renders each frame as a fresh component instance, so
 *     useEffect fires on every frame. Cheap (one paint per frame, no
 *     state churn).
 *   - Font must be loaded BEFORE we measure. The TONDO_FONT_CSS_URL
 *     is loaded by the parent template via <link rel="stylesheet">;
 *     by the time this component mounts the font is ready (Tondo
 *     loads as base64 in CSS, no network delay).
 */
import React, { useEffect, useRef } from "react";

type Props = {
  /** The string to render — e.g. "7+ hrs", "-15%", "88% by age 5". */
  text: string;
  /** Spring-driven scale 0→1; parent computes from beat timing. */
  scale: number;
  /** Frame-driven aberration offset in px (at baseline width). */
  aberrationOffsetPx: number;
  fontFamily: string;
  /** Baseline font size — text is rendered at this size, then scaled. */
  fontSize: number;
  /** Anchor colour — sits on top, defines the focal hue. */
  primaryColor: string;
  /** Pink/orange/etc. ghost trailing left. */
  aberrationLeftColor: string;
  /** Teal/purple/etc. ghost trailing right. */
  aberrationRightColor: string;
  /** Aberration channel opacity (0.85 in original templates). */
  aberrationOpacity?: number;
  /** Available horizontal space inside the 1080px frame. */
  maxWidth?: number;
};

const CANVAS_PAD = 80; // px on each side, leaves room for the aberration spread

export const BigNumberWithAberration: React.FC<Props> = ({
  text,
  scale,
  aberrationOffsetPx,
  fontFamily,
  fontSize,
  primaryColor,
  aberrationLeftColor,
  aberrationRightColor,
  aberrationOpacity = 0.85,
  maxWidth = 980,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pre-measure on a hidden offscreen canvas to compute fit scale +
  // canvas dimensions. This runs synchronously every render — cheap.
  const measureCanvas =
    typeof document !== "undefined" ? document.createElement("canvas") : null;
  const measureCtx = measureCanvas?.getContext("2d") ?? null;
  let fitScale = 1;
  let actualFontSize = fontSize;
  let textWidth = 0;
  if (measureCtx) {
    measureCtx.font = `900 ${fontSize}px ${fontFamily}`;
    const baseWidth = measureCtx.measureText(text).width;
    if (baseWidth > 0) {
      fitScale = Math.min(1, maxWidth / baseWidth);
      actualFontSize = fontSize * fitScale;
      measureCtx.font = `900 ${actualFontSize}px ${fontFamily}`;
      textWidth = measureCtx.measureText(text).width;
    }
  }

  const scaledAberration = aberrationOffsetPx * fitScale;
  // Canvas dims: text width + room for left/right ghost spread + pad.
  const canvasWidth =
    Math.ceil(textWidth + Math.abs(scaledAberration) * 2) + CANVAS_PAD * 2;
  const canvasHeight = Math.ceil(actualFontSize * 1.4); // 1.4x font for ascenders/descenders

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High-DPI: render at 2x and let CSS scale down for crisp text.
    // Headless Chromium's devicePixelRatio is 1 by default; force 2 for
    // sharper output, especially noticeable at smaller fitScale values.
    const dpr = 2;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.font = `900 ${actualFontSize}px ${fontFamily}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const drawX = centerX - textWidth / 2;

    // Three-pass paint: aberration ghosts first (with screen blend so
    // overlapping channels combine additively, like a real RGB split),
    // anchor on top in source-over so it stays solid.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = aberrationOpacity;

    ctx.fillStyle = aberrationLeftColor;
    ctx.fillText(text, drawX - scaledAberration, centerY);

    ctx.fillStyle = aberrationRightColor;
    ctx.fillText(text, drawX + scaledAberration, centerY);

    ctx.restore();

    // Anchor — full opacity, normal blend, on top.
    ctx.fillStyle = primaryColor;
    ctx.fillText(text, drawX, centerY);
  }, [
    text,
    actualFontSize,
    fontFamily,
    primaryColor,
    aberrationLeftColor,
    aberrationRightColor,
    aberrationOpacity,
    scaledAberration,
    textWidth,
    canvasWidth,
    canvasHeight,
  ]);

  return (
    <div
      style={{
        width: maxWidth,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: fontSize, // reserve baseline slot, same as div version
        transform: `scale(${scale})`,
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
};
