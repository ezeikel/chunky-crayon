'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/pro-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import cn from '@/utils/cn';

type RegionInfo = {
  id: number;
  centroid: { x: number; y: number };
  pixelCount: number;
};

type ProgressIndicatorProps = {
  getCanvas: () => HTMLCanvasElement | null;
  /**
   * Optional boundary canvas — kept for backwards compatibility.
   * No longer used by the calculation.
   */
  getBoundaryCanvas?: () => HTMLCanvasElement | null;
  /**
   * Region metadata from `regionsJson`. When provided, progress is the
   * weighted percentage of regions that have user paint at their centroid
   * — accurate at the semantic level ("how much of the scene is coloured")
   * regardless of canvas resolution or scene baseline.
   */
  regions?: RegionInfo[];
  /** Sum of pixelCount across all regions (the denominator). */
  totalRegionPixels?: number;
  /** Region map dimensions; centroids are in this coordinate space. */
  regionMapWidth?: number;
  regionMapHeight?: number;
  className?: string;
};

// Progress milestone percentages
const MILESTONE_PERCENTS = [25, 50, 75, 100] as const;

const ALPHA_THRESHOLD = 10;
// Sample 1 in every N pixels to keep the work cheap on high-DPR canvases.
const SAMPLE_STRIDE = 16;
// "Dark" = any channel below this is line art (not paintable background).
const LINE_ART_DARKNESS = 200;

type PixelStats = {
  /** Sampled pixels with alpha above threshold (i.e. visibly opaque). */
  painted: number;
  /** Sampled pixels that look like line art (dark/opaque). */
  lineArt: number;
  /** Total samples taken. */
  samples: number;
};

/**
 * One pass over the canvas, sampled. Returns counts useful for both the
 * drawing layer (how much did the user paint) and the boundary layer (what
 * fraction of the canvas is line art vs paintable background).
 */
const samplePixels = (canvas: HTMLCanvasElement): PixelStats => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { painted: 0, lineArt: 0, samples: 0 };
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const step = SAMPLE_STRIDE * 4;
  let painted = 0;
  let lineArt = 0;
  let samples = 0;
  for (let i = 0; i < data.length; i += step) {
    samples++;
    const a = data[i + 3];
    if (a > ALPHA_THRESHOLD) {
      painted++;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (
        r < LINE_ART_DARKNESS &&
        g < LINE_ART_DARKNESS &&
        b < LINE_ART_DARKNESS
      ) {
        lineArt++;
      }
    }
  }
  return { painted, lineArt, samples };
};

/**
 * Heuristic fallback for images without a region store.
 * Counts painted pixels and scales so ~50% canvas coverage = 100%.
 */
const calculateProgressHeuristic = (drawingStats: PixelStats): number => {
  if (drawingStats.painted === 0) return 0;
  return Math.min(
    100,
    Math.round(
      ((drawingStats.painted / drawingStats.samples) * 100 * 100) / 50,
    ),
  );
};

/**
 * Sample a region's centroid on the drawing canvas. Returns the RGBA tuple
 * (or null if the canvas isn't readable / coords are out of bounds).
 */
const sampleRegionCentroid = (
  ctx: CanvasRenderingContext2D,
  region: RegionInfo,
  scaleX: number,
  scaleY: number,
  canvasWidth: number,
  canvasHeight: number,
): [number, number, number, number] | null => {
  const x = Math.floor(region.centroid.x * scaleX);
  const y = Math.floor(region.centroid.y * scaleY);
  if (x < 0 || y < 0 || x >= canvasWidth || y >= canvasHeight) return null;
  const { data } = ctx.getImageData(x, y, 1, 1);
  return [data[0], data[1], data[2], data[3]];
};

/**
 * A region is "user-painted" when its centroid colour differs noticeably
 * from the baseline colour captured at mount. Threshold is per-channel
 * Manhattan distance.
 */
const COLOUR_CHANGE_THRESHOLD = 60;

const colourChanged = (
  current: [number, number, number, number],
  baseline: [number, number, number, number],
): boolean => {
  // Treat alpha changes as significant too (transparent → opaque)
  if (Math.abs(current[3] - baseline[3]) > 32) return true;
  return (
    Math.abs(current[0] - baseline[0]) +
      Math.abs(current[1] - baseline[1]) +
      Math.abs(current[2] - baseline[2]) >
    COLOUR_CHANGE_THRESHOLD
  );
};

/**
 * Progress = weighted % of regions whose centroid colour differs from the
 * captured baseline. Each region contributes its pixelCount so a huge sky
 * counts more than a tiny eye.
 */
const calculateProgressByRegions = (
  drawing: HTMLCanvasElement,
  regions: RegionInfo[],
  totalRegionPixels: number,
  regionMapWidth: number,
  regionMapHeight: number,
  baselines: Map<number, [number, number, number, number]>,
): number => {
  const ctx = drawing.getContext('2d');
  if (!ctx || regions.length === 0 || totalRegionPixels <= 0) return 0;
  const scaleX = drawing.width / regionMapWidth;
  const scaleY = drawing.height / regionMapHeight;
  let coloredPixelSum = 0;
  for (const region of regions) {
    const baseline = baselines.get(region.id);
    if (!baseline) continue;
    const current = sampleRegionCentroid(
      ctx,
      region,
      scaleX,
      scaleY,
      drawing.width,
      drawing.height,
    );
    if (!current) continue;
    if (colourChanged(current, baseline)) {
      coloredPixelSum += region.pixelCount;
    }
  }
  // Use ceil + a small bias so the user is rewarded with "Done!" once the
  // last visible region is coloured. Without this, rounding can leave the
  // bar permanently at 99% even when every region has user paint.
  const raw = (coloredPixelSum / totalRegionPixels) * 100;
  if (raw >= 99) return 100;
  return Math.min(100, Math.round(raw));
};

const ProgressIndicator = ({
  getCanvas,
  regions,
  totalRegionPixels,
  regionMapWidth,
  regionMapHeight,
  className,
}: ProgressIndicatorProps) => {
  const t = useTranslations('coloringPage.progress');
  const [progress, setProgress] = useState(0);
  const [lastMilestone, setLastMilestone] = useState<number | null>(null);
  const [showMilestone, setShowMilestone] = useState(false);
  // Latest milestone in a ref so updateProgress doesn't depend on state.
  const lastMilestoneRef = useRef<number | null>(null);
  // Baseline colour at each region's centroid, captured once after the
  // canvas finishes loading. Anything different = user paint.
  const baselinesRef = useRef<Map<number, [number, number, number, number]>>(
    new Map(),
  );
  const baselinesReadyRef = useRef(false);

  // Capture baselines for every region once the canvas is ready. We sample
  // the drawing canvas at each region's centroid and store the colour that
  // was there before the user did anything.
  useEffect(() => {
    if (
      baselinesReadyRef.current ||
      !regions ||
      regions.length === 0 ||
      !regionMapWidth ||
      !regionMapHeight
    ) {
      return;
    }
    const tryCapture = () => {
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0 || canvas.height === 0) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const scaleX = canvas.width / regionMapWidth;
      const scaleY = canvas.height / regionMapHeight;
      const map = new Map<number, [number, number, number, number]>();
      for (const region of regions) {
        const sample = sampleRegionCentroid(
          ctx,
          region,
          scaleX,
          scaleY,
          canvas.width,
          canvas.height,
        );
        if (sample) map.set(region.id, sample);
      }
      baselinesRef.current = map;
      baselinesReadyRef.current = true;
      return true;
    };
    // First attempt now, then retry once after a beat in case the canvas
    // hasn't finished its initial render.
    if (!tryCapture()) {
      const t = setTimeout(tryCapture, 500);
      return () => clearTimeout(t);
    }
  }, [regions, regionMapWidth, regionMapHeight, getCanvas]);

  // Calculate progress periodically
  const updateProgress = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;

    let newProgress: number;
    if (
      baselinesReadyRef.current &&
      regions &&
      regions.length > 0 &&
      totalRegionPixels &&
      regionMapWidth &&
      regionMapHeight
    ) {
      // Accurate path — weighted region coverage vs baseline.
      newProgress = calculateProgressByRegions(
        canvas,
        regions,
        totalRegionPixels,
        regionMapWidth,
        regionMapHeight,
        baselinesRef.current,
      );
    } else {
      // Fallback for images without a region store (or while baselines
      // are being captured).
      newProgress = calculateProgressHeuristic(samplePixels(canvas));
    }
    setProgress(newProgress);

    // Check for milestone achievements
    const prevMilestone = lastMilestoneRef.current;
    const milestone = MILESTONE_PERCENTS.find(
      (percent) =>
        newProgress >= percent &&
        (prevMilestone === null || percent > prevMilestone),
    );

    if (milestone && milestone !== prevMilestone) {
      lastMilestoneRef.current = milestone;
      setLastMilestone(milestone);
      setShowMilestone(true);
      setTimeout(() => setShowMilestone(false), 2000);
    }
  }, [getCanvas, regions, totalRegionPixels, regionMapWidth, regionMapHeight]);

  // Update progress on an interval while coloring. The mouseup listener
  // below is the primary trigger; this catches edge cases (e.g. magic-fill
  // animations completing). One initial tick then 5s polling.
  useEffect(() => {
    updateProgress();
    const interval = setInterval(updateProgress, 5000);
    return () => clearInterval(interval);
  }, [updateProgress]);

  // Listen for canvas changes (mouse/touch up events)
  useEffect(() => {
    const handleInteractionEnd = () => {
      // Small delay to let the canvas update
      setTimeout(updateProgress, 100);
    };

    window.addEventListener('mouseup', handleInteractionEnd);
    window.addEventListener('touchend', handleInteractionEnd);

    return () => {
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [updateProgress]);

  const isDone = progress >= 100;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Chunky kid-friendly progress bar — fill until you reach the star. */}
      <div className="relative flex-1 min-w-0">
        {/* Track — full pill, star overlays the right end. */}
        <div
          className="h-6 rounded-full overflow-hidden bg-paper-cream"
          style={{
            boxShadow: 'inset 0 2px 4px rgb(0 0 0 / 0.08)',
          }}
        >
          <motion.div
            className={cn(
              'h-full rounded-full',
              isDone ? 'bg-crayon-green' : 'bg-crayon-orange',
            )}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        {/* Goal star — overlays the right end of the bar. Subtle inset
         * shadow only (no drop shadow at 100% — bar already turned green
         * and the "All done!" badge handles the celebration). */}
        <motion.div
          className={cn(
            'absolute top-1/2 right-0 -translate-y-1/2 size-9 flex items-center justify-center rounded-full',
            isDone ? 'bg-crayon-yellow' : 'bg-paper-cream',
          )}
          style={{
            boxShadow: 'inset 0 2px 4px rgb(0 0 0 / 0.08)',
          }}
          animate={
            isDone
              ? {
                  scale: [1, 1.25, 1],
                  rotate: [0, -10, 10, -10, 0],
                }
              : {}
          }
          transition={{ duration: 0.6 }}
        >
          <FontAwesomeIcon
            icon={faStar}
            className={cn(
              'text-xl',
              isDone ? 'text-white' : 'text-crayon-orange/40',
            )}
          />
        </motion.div>

        {/* Milestone celebration popup */}
        <AnimatePresence>
          {showMilestone && lastMilestone && !isDone && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-crayon-yellow rounded-full shadow-lg z-10"
            >
              <span className="font-tondo font-bold text-base text-text-primary whitespace-nowrap">
                {t(`milestones.${lastMilestone}`)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* All done — chunky badge when complete */}
        <AnimatePresence>
          {isDone && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
              className="absolute -top-14 left-1/2 -translate-x-1/2 px-5 py-2 bg-crayon-green rounded-full shadow-lg z-10 flex items-center gap-2 whitespace-nowrap"
            >
              <FontAwesomeIcon icon={faStar} className="text-white text-lg" />
              <span className="font-tondo font-bold text-lg text-white">
                {t('allDone')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProgressIndicator;
