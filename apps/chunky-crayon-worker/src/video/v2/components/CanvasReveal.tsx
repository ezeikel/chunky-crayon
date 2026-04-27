/**
 * Demo Reel V2 — canvas reveal component.
 *
 * Composes the same primitives the live magic-reveal brush uses:
 *   - `buildPreColoredCanvas` — one-shot pixel-perfect colour map
 *   - `paintMagicRevealStamp` — per-stamp source-in compositing
 *   - line art SVG overlaid via mix-blend-mode: multiply
 *
 * The reel's choreography drives `stampCount` from `useCurrentFrame()`,
 * so seeking forward/backward in the timeline is fully deterministic.
 *
 * Phase 0 spike validated this shape end-to-end (see
 * `apps/chunky-crayon-worker/src/video/spikes/BrushPlaybackSpike.tsx`).
 * This component is the production-shaped extraction — it takes pre-loaded
 * fixture data as props so the parent comp owns the `delayRender` /
 * fetch lifecycle.
 */
import { useEffect, useRef } from "react";
import { Img } from "remotion";
import { paintMagicRevealStamp } from "@one-colored-pixel/canvas";
import type { MagicRevealRegionStore } from "@one-colored-pixel/canvas";
import { COLORS } from "../tokens/brand";

export type CanvasRevealFixture = {
  /** Pre-coloured canvas with every pixel set to its region's palette colour. */
  preColoredCanvas: HTMLCanvasElement;
  /** Reusable temp canvas, sized at preColoredCanvas dimensions. */
  tempCanvas: HTMLCanvasElement;
  /** Line art SVG markup — overlaid via multiply blend. */
  svgText: string;
  /** Working canvas dimensions (matches preColoredCanvas). */
  canvasW: number;
  canvasH: number;
};

export type StampPathFn = (
  index: number,
  canvasW: number,
  canvasH: number,
) => { x: number; y: number };

type CanvasRevealProps = {
  fixture: CanvasRevealFixture;
  /**
   * 0..totalStamps. The reel computes this each frame via
   * `Math.floor(frame * speedFactor)`.
   */
  stampCount: number;
  /** Total stamps in the sweep — used for the boustrophedon row math. */
  totalStamps: number;
  /** How many stamps per row (boustrophedon snake pattern). */
  stampsPerRow: number;
  /** Brush radius in CSS pixels of the canvas. */
  brushRadius: number;
  /** Function mapping stamp index → CSS-pixel position. */
  stampPath: StampPathFn;
  /** Render width in screen px. The canvas scales to fit. */
  size: number;
};

export const CanvasReveal = ({
  fixture,
  stampCount,
  totalStamps,
  stampsPerRow,
  brushRadius,
  stampPath,
  size,
}: CanvasRevealProps) => {
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear + replay every frame so seeking is deterministic.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, fixture.canvasW, fixture.canvasH);
    ctx.restore();

    let lastX: number | null = null;
    let lastY: number | null = null;
    const cap = Math.min(stampCount, totalStamps);
    for (let i = 0; i < cap; i++) {
      const { x, y } = stampPath(i, fixture.canvasW, fixture.canvasH);
      paintMagicRevealStamp({
        destCtx: ctx,
        tempCanvas: fixture.tempCanvas,
        preColoredCanvas: fixture.preColoredCanvas,
        x,
        y,
        lastX,
        lastY,
        radius: brushRadius,
        pressure: 0.6,
        dpr: 1,
      });
      // Boustrophedon — break the segment at row boundaries so the brush
      // doesn't leap visibly across the canvas.
      const isFirstOfRow = i % stampsPerRow === 0;
      lastX = isFirstOfRow ? null : x;
      lastY = isFirstOfRow ? null : y;
    }
  }, [stampCount, totalStamps, stampsPerRow, brushRadius, stampPath, fixture]);

  const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(fixture.svgText)}`;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        background: COLORS.textInverted,
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
      }}
    >
      <canvas
        ref={drawingCanvasRef}
        width={fixture.canvasW}
        height={fixture.canvasH}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
      <Img
        src={svgDataUrl}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          mixBlendMode: "multiply",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

/**
 * Standard boustrophedon (snake) stamp path covering a square canvas.
 * Used by all V2 reels. Caller picks `stampsPerRow` × `rows` and
 * `brushRadius` based on desired coverage density.
 */
export const boustrophedonPath: StampPathFn = (index, canvasW, canvasH) => {
  // Default grid of 24×24 — overridden per-comp by passing a closure.
  const stampsPerRow = 24;
  const rows = 24;
  const row = Math.floor(index / stampsPerRow);
  const col = index % stampsPerRow;
  const colInRow = row % 2 === 0 ? col : stampsPerRow - 1 - col;
  return {
    x: ((colInRow + 0.5) / stampsPerRow) * canvasW,
    y: ((row + 0.5) / rows) * canvasH,
  };
};

/**
 * Factory — returns a stampPath closure for a specific grid configuration.
 * Use this when the comp wants something other than the 24×24 default.
 */
export const makeBoustrophedonPath =
  (stampsPerRow: number, rows: number): StampPathFn =>
  (index, canvasW, canvasH) => {
    const row = Math.floor(index / stampsPerRow);
    const col = index % stampsPerRow;
    const colInRow = row % 2 === 0 ? col : stampsPerRow - 1 - col;
    return {
      x: ((colInRow + 0.5) / stampsPerRow) * canvasW,
      y: ((row + 0.5) / rows) * canvasH,
    };
  };
