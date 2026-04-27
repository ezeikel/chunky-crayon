'use client';

import {
  useRef,
  useCallback,
  useEffect,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { ColoringImage } from '@one-colored-pixel/db/types';
import { ImageCanvas, ImageCanvasHandle } from '@one-colored-pixel/coloring-ui';
import { ColoringToolbar } from '@one-colored-pixel/coloring-ui';
import { MobileColoringDrawer } from '@one-colored-pixel/coloring-ui';
import StickerSelector from '@/components/StickerSelector';
import ProgressIndicator from '@/components/ProgressIndicator';
import { MuteToggle } from '@one-colored-pixel/coloring-ui';
import { ZoomControls } from '@one-colored-pixel/coloring-ui';
import {
  AutoColorModal,
  MagicColorOverlay,
} from '@one-colored-pixel/coloring-ui';
import DownloadPDFButton from '@/components/buttons/DownloadPDFButton/DownloadPDFButton';
import StartOverButton from '@/components/buttons/StartOverButton/StartOverButton';
import ShareButton from '@/components/buttons/ShareButton';
import SaveToGalleryButton from '@/components/buttons/SaveToGalleryButton';
import {
  CanvasAction,
  useColoringContext,
} from '@one-colored-pixel/coloring-ui';
import { useSound } from '@one-colored-pixel/coloring-ui';
import { useReferenceColor } from '@one-colored-pixel/coloring-ui';
import {
  useRegionStore,
  type RegionStoreJson,
} from '@one-colored-pixel/coloring-ui';
import { useMagicColorMap } from '@/hooks/useMagicColorMap';
import type { GridColorMap, FillPointsData } from '@/lib/ai';
import {
  saveColoringProgress,
  loadColoringProgress,
  clearColoringProgress,
} from '@one-colored-pixel/coloring-ui';
import { generateRegionFillPoints } from '@/app/actions/generate-color-map';
import { generateColoredReference } from '@/app/actions/generate-colored-reference';
import {
  checkRegionStoreReady,
  requestRegionStoreRegeneration,
} from '@/app/actions/generate-regions';
import { useRouter } from 'next/navigation';
import { detectAllRegions } from '@one-colored-pixel/canvas';

type ColoringAreaProps = {
  coloringImage: Partial<ColoringImage>;
  isAuthenticated?: boolean;
};

export type ColoringAreaHandle = {
  getCanvas: () => HTMLCanvasElement | null;
  getBoundaryCanvas: () => HTMLCanvasElement | null;
  getCanvasDataUrl: () => string | null;
  handleUndo: (action: CanvasAction) => void;
  handleRedo: (action: CanvasAction) => void;
  handleStartOver: () => void;
  openStickerSelector: () => void;
};

const ColoringArea = forwardRef<ColoringAreaHandle, ColoringAreaProps>(
  ({ coloringImage, isAuthenticated = false }, ref) => {
    const canvasRef = useRef<ImageCanvasHandle>(null);
    // Wrapper around the canvas — used by IntersectionObserver below to
    // gate the mobile drawer's visibility. Without this the drawer
    // stays pinned to the bottom of the screen even when the user has
    // scrolled past the canvas to read tips/comments/related content.
    const canvasWrapperRef = useRef<HTMLDivElement>(null);
    // Default true so the drawer paints on first mount (the canvas
    // starts in view). Flipped by the IntersectionObserver as the user
    // scrolls.
    const [isCanvasInViewport, setIsCanvasInViewport] = useState(true);
    // Store the "after" states for redo - keyed by timestamp
    const redoStatesRef = useRef<Map<number, ImageData>>(new Map());
    // Track if canvas is ready
    const canvasReadyRef = useRef(false);
    // Debounce timer for auto-save
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
    // Track if ambient sound has been initialized
    const ambientInitializedRef = useRef(false);

    // Sticker selector modal state
    const [isStickerSelectorOpen, setIsStickerSelectorOpen] = useState(false);

    // Region store wait state — surfaces to the magic-tool affordance when
    // the background worker hasn't written regionMapUrl yet, and when it's
    // taken too long so the user can kick off a retry.
    const [regionStoreStatus, setRegionStoreStatus] = useState<
      'ready' | 'waiting' | 'timeout' | 'retrying'
    >(() => (coloringImage.regionMapUrl ? 'ready' : 'waiting'));

    const {
      hasUnsavedChanges,
      setHasUnsavedChanges,
      clearHistory,
      activeTool,
      setActiveTool,
      setBrushType,
      drawingActions,
      clearDrawingActions,
      addDrawingAction,
      setDrawingActions,
      setIsAutoColoring,
      setHasAutoColored,
      paletteVariant,
      pushToHistory,
    } = useColoringContext();
    const { playSound, loadAmbient, playAmbient, stopAmbient } = useSound();

    // Parse region-aware fill points (preferred) and grid color map (fallback)
    const parsedFillPoints = useMemo<FillPointsData | null>(() => {
      if (!coloringImage.fillPointsJson) return null;
      try {
        return JSON.parse(coloringImage.fillPointsJson) as FillPointsData;
      } catch {
        console.error('[ColoringArea] Failed to parse fillPointsJson');
        return null;
      }
    }, [coloringImage.fillPointsJson]);

    // On-demand fill points (generated when auto-color is clicked and none exist)
    const [onDemandFillPoints, setOnDemandFillPoints] =
      useState<FillPointsData | null>(null);
    const [isGeneratingFillPoints, setIsGeneratingFillPoints] = useState(false);

    const fillPointsData = parsedFillPoints ?? onDemandFillPoints;

    const preComputedColorMap = useMemo<GridColorMap | null>(() => {
      if (!coloringImage.colorMapJson) return null;
      try {
        return JSON.parse(coloringImage.colorMapJson) as GridColorMap;
      } catch {
        console.error('[ColoringArea] Failed to parse colorMapJson');
        return null;
      }
    }, [coloringImage.colorMapJson]);

    // Reference color — AI-colored reference image for Auto Color + Magic Brush
    const referenceColor = useReferenceColor();
    const hasColoredReference = !!coloringImage.coloredReferenceUrl;

    // Load colored reference on mount if available
    useEffect(() => {
      if (coloringImage.coloredReferenceUrl && !referenceColor.state.isReady) {
        referenceColor.loadReference(coloringImage.coloredReferenceUrl);
      }
    }, [coloringImage.coloredReferenceUrl]);

    // Hide the mobile drawer when the user scrolls past the canvas.
    // Same pattern as EmbeddedColoringCanvas on /start: threshold 0.2
    // (drawer reappears when ~20% of the canvas re-enters the viewport),
    // 200ms debounce to prevent flicker during slow scroll. Without this
    // the drawer stays pinned to the bottom of the screen even when
    // the user is reading tips/comments below the canvas.
    useEffect(() => {
      const node = canvasWrapperRef.current;
      if (!node) return;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            setIsCanvasInViewport(entry.isIntersecting);
          }, 200);
        },
        { threshold: 0.2 },
      );
      observer.observe(node);
      return () => {
        observer.disconnect();
        if (timer) clearTimeout(timer);
      };
    }, []);

    // Magic Color Map (legacy fallback when no colored reference)
    const {
      state: magicColorMapState,
      generateColorMap,
      getColorAtPoint,
      getRegionIdAtPoint,
      markRegionColored,
      getAllColorsForAutoFill,
      getDirectFillPoints,
      reset: resetMagicColorMap,
    } = useMagicColorMap({ preComputedColorMap, fillPointsData });

    // Region store — new pre-computed region map for reveal-mask magic brush.
    // When available (image has been backfilled), this takes priority over the
    // legacy useMagicColorMap path. Falls back gracefully when no data exists.
    const parsedRegionsJson = useMemo<RegionStoreJson | null>(() => {
      if (!coloringImage.regionsJson) return null;
      try {
        return JSON.parse(
          coloringImage.regionsJson as string,
        ) as RegionStoreJson;
      } catch {
        return null;
      }
    }, [coloringImage.regionsJson]);

    const regionStore = useRegionStore({
      regionMapUrl: coloringImage.regionMapUrl as string | undefined,
      regionMapWidth: coloringImage.regionMapWidth as number | undefined,
      regionMapHeight: coloringImage.regionMapHeight as number | undefined,
      regionsJson: parsedRegionsJson,
    });

    useEffect(() => {
      console.log('[ColoringArea] regionStore state changed', {
        isReady: regionStore.state.isReady,
        width: regionStore.state.width,
        height: regionStore.state.height,
        coloringImageRegionMapUrl: !!coloringImage.regionMapUrl,
      });
    }, [
      regionStore.state.isReady,
      regionStore.state.width,
      regionStore.state.height,
      coloringImage.regionMapUrl,
    ]);

    // If we landed on a freshly-generated image before the post-create
    // pipeline finished building the region store, poll until it's ready
    // then router.refresh() to pull the new coloringImage prop (with
    // regionMapUrl/regionsJson populated) — no visual reload. Enables
    // proper per-region Magic Brush reveal on freshly-created images.
    const router = useRouter();
    useEffect(() => {
      console.log('[ColoringArea] region-store poll effect mounted', {
        id: coloringImage.id,
        hasRegionMapUrl: !!coloringImage.regionMapUrl,
        willPoll: !coloringImage.regionMapUrl && !!coloringImage.id,
      });
      if (coloringImage.regionMapUrl) {
        setRegionStoreStatus('ready');
        return;
      }
      if (!coloringImage.id) return;

      setRegionStoreStatus('waiting');
      let stopped = false;
      const POLL_MS = 3000;
      // Worker finishes typical images in 60-90s. After 90 attempts (~4.5min)
      // it's either genuinely stuck or the worker is down — surface a retry
      // UI instead of polling silently for 10 minutes.
      const MAX_ATTEMPTS = 90;
      let attempts = 0;
      const tick = async () => {
        if (stopped) return;
        attempts += 1;
        try {
          const { ready } = await checkRegionStoreReady(coloringImage.id!);
          console.log(
            `[ColoringArea] region-store poll ${attempts}: ready=${ready}`,
          );
          if (stopped) return;
          if (ready) {
            console.log('[ColoringArea] region store ready — refreshing RSC');
            setRegionStoreStatus('ready');
            router.refresh();
            return; // stop polling
          }
        } catch (err) {
          console.warn('[ColoringArea] region-store poll failed:', err);
        }
        if (attempts >= MAX_ATTEMPTS) {
          console.warn(
            '[ColoringArea] gave up waiting for region store after',
            attempts,
            'attempts — surfacing retry UI',
          );
          setRegionStoreStatus('timeout');
          return;
        }
        setTimeout(tick, POLL_MS);
      };
      const t = setTimeout(tick, POLL_MS);
      return () => {
        stopped = true;
        clearTimeout(t);
      };
    }, [coloringImage.id, coloringImage.regionMapUrl, router]);

    // User-triggered retry — re-POSTs to the worker and resumes polling.
    const handleRegionStoreRetry = useCallback(async () => {
      if (!coloringImage.id) return;
      setRegionStoreStatus('retrying');
      try {
        const { ok, error } = await requestRegionStoreRegeneration(
          coloringImage.id,
        );
        if (!ok) {
          console.error('[ColoringArea] retry failed:', error);
          setRegionStoreStatus('timeout');
          return;
        }
        // Resume polling. The useEffect above is keyed on regionMapUrl,
        // which is still null, so it won't re-fire. Manually reset status
        // to 'waiting' and let the retry poll below do its thing.
        setRegionStoreStatus('waiting');
        const POLL_MS = 3000;
        const MAX_ATTEMPTS = 90;
        let attempts = 0;
        const tick = async () => {
          attempts += 1;
          try {
            const { ready } = await checkRegionStoreReady(coloringImage.id!);
            if (ready) {
              setRegionStoreStatus('ready');
              router.refresh();
              return;
            }
          } catch (err) {
            console.warn('[ColoringArea] retry poll failed:', err);
          }
          if (attempts >= MAX_ATTEMPTS) {
            setRegionStoreStatus('timeout');
            return;
          }
          setTimeout(tick, POLL_MS);
        };
        setTimeout(tick, POLL_MS);
      } catch (err) {
        console.error('[ColoringArea] retry threw:', err);
        setRegionStoreStatus('timeout');
      }
    }, [coloringImage.id, router]);

    // Handle first canvas interaction - load and play ambient sound
    // NOTE: Browser autoplay policy requires user interaction before audio can play - we cannot auto-play on page load
    // TODO: Trigger ambient sound on ANY page interaction (color pick, button click), not just canvas stroke
    // TODO: Improve ElevenLabs ambient sound prompts - current sounds are low quality/not fitting
    const handleFirstInteraction = useCallback(async () => {
      console.log('[ColoringArea] handleFirstInteraction called', {
        hasAmbientUrl: !!coloringImage.backgroundMusicUrl,
        ambientUrl: coloringImage.backgroundMusicUrl,
        alreadyInitialized: ambientInitializedRef.current,
      });
      if (coloringImage.backgroundMusicUrl && !ambientInitializedRef.current) {
        ambientInitializedRef.current = true;
        console.log('[ColoringArea] Loading ambient sound...');
        await loadAmbient(coloringImage.backgroundMusicUrl);
        console.log('[ColoringArea] Playing ambient sound...');
        playAmbient();
      }
    }, [coloringImage.backgroundMusicUrl, loadAmbient, playAmbient]);

    // Cleanup: stop ambient sound when component unmounts
    useEffect(() => {
      return () => {
        if (ambientInitializedRef.current) {
          stopAmbient();
        }
      };
    }, [stopAmbient]);

    // Generate fill points on-demand for images that don't have them
    const generateFillPointsOnDemand = useCallback(async () => {
      if (!coloringImage.id || !coloringImage.url || isGeneratingFillPoints)
        return;

      setIsGeneratingFillPoints(true);
      try {
        const result = await generateRegionFillPoints(
          coloringImage.id,
          coloringImage.url,
          {
            title: coloringImage.title ?? '',
            description: coloringImage.description ?? '',
            tags: (coloringImage.tags as string[]) ?? [],
          },
        );

        if (result.success) {
          setOnDemandFillPoints(result.fillPoints);
        } else {
          console.error(
            '[ColoringArea] On-demand fill points failed:',
            result.error,
          );
        }
      } catch (error) {
        console.error('[ColoringArea] On-demand fill points error:', error);
      } finally {
        setIsGeneratingFillPoints(false);
      }
    }, [
      coloringImage.id,
      coloringImage.url,
      coloringImage.title,
      coloringImage.description,
      coloringImage.tags,
      isGeneratingFillPoints,
    ]);

    // Generate color map when any magic tool is selected
    const isMagicToolActive =
      activeTool === 'magic-reveal' || activeTool === 'magic-auto';

    useEffect(() => {
      if (!isMagicToolActive || !canvasReadyRef.current) return;

      // Region store (pre-computed server-side) is the preferred source
      // for BOTH magic-reveal and magic-auto. When it's ready, nothing
      // below is needed — magic-reveal reads from preColoredCanvasRef
      // directly in ImageCanvas, magic-auto uses handleRegionStoreAutoColor
      // in the effect at line 737. The legacy useMagicColorMap warm-up +
      // on-demand fill-points generation below is only relevant for old
      // images without regionMapUrl.
      //
      // Without this short-circuit the modal-gating state
      // (isGeneratingFillPoints) gets flipped to true for images that
      // happen to lack fillPointsJson — which puts the magic-colors
      // overlay on screen and, if the on-demand server action 504s,
      // keeps it there forever.
      if (regionStore.state.isReady) return;

      // For magic-auto with fill points, skip region detection entirely
      // (handled by the auto-fill effect below)
      if (activeTool === 'magic-auto' && fillPointsData) return;

      // No color data at all — trigger on-demand generation
      if (!fillPointsData && !preComputedColorMap) {
        if (!isGeneratingFillPoints) {
          generateFillPointsOnDemand();
        }
        return;
      }

      // Skip if already ready or loading
      if (magicColorMapState.isReady || magicColorMapState.isLoading) return;

      const drawingCanvas = canvasRef.current?.getCanvas();
      const boundaryCanvas = canvasRef.current?.getBoundaryCanvas();

      if (!drawingCanvas || !boundaryCanvas) return;

      generateColorMap(drawingCanvas, boundaryCanvas);
    }, [
      isMagicToolActive,
      activeTool,
      fillPointsData,
      preComputedColorMap,
      isGeneratingFillPoints,
      generateFillPointsOnDemand,
      magicColorMapState.isReady,
      magicColorMapState.isLoading,
      generateColorMap,
      regionStore.state.isReady,
    ]);

    // Handle auto-color - fill regions progressively for visual feedback
    const handleAutoColor = useCallback(() => {
      const regionsToFill = getAllColorsForAutoFill();
      if (regionsToFill.length === 0) return;

      setIsAutoColoring(true);
      const boundary = canvasRef.current?.getDilatedBoundary();

      let index = 0;
      const batchSize = 3;

      const fillBatch = () => {
        const end = Math.min(index + batchSize, regionsToFill.length);
        for (let i = index; i < end; i++) {
          const { regionId, color, centroid } = regionsToFill[i];
          const success = canvasRef.current?.fillRegionAtPoint(
            Math.round(centroid.x),
            Math.round(centroid.y),
            color,
            true,
            boundary ?? undefined,
          );
          if (success) {
            markRegionColored(regionId);
          }
        }
        index = end;

        if (index < regionsToFill.length) {
          requestAnimationFrame(fillBatch);
        } else {
          setIsAutoColoring(false);
          setActiveTool('brush');
          playSound('sparkle');
          setHasUnsavedChanges(true);
        }
      };

      requestAnimationFrame(fillBatch);
    }, [
      getAllColorsForAutoFill,
      markRegionColored,
      playSound,
      setHasUnsavedChanges,
      setIsAutoColoring,
    ]);

    // Handle auto-color using the pre-computed region store. Draws the
    // pre-coloured canvas (built by ImageCanvas from the region store +
    // active palette variant) directly onto the drawing canvas in one shot.
    // Same data source as Magic Brush — pixel-perfect, no flood fill,
    // no centroids, no missed regions.
    const handleRegionStoreAutoColor = useCallback(() => {
      const drawingCanvas = canvasRef.current?.getCanvas();
      const preColoredCanvas = canvasRef.current?.getPreColoredCanvas();
      if (!drawingCanvas || !preColoredCanvas) return;

      const drawingCtx = drawingCanvas.getContext('2d');
      if (!drawingCtx) return;

      setIsAutoColoring(true);

      // Capture state for undo
      const beforeState = canvasRef.current?.captureCanvasState();
      if (beforeState) {
        pushToHistory({
          type: 'fill',
          imageData: beforeState,
          timestamp: Date.now(),
        });
      }

      // Draw the entire pre-coloured canvas onto the drawing canvas.
      // Reset transform so drawImage operates in raw pixel space (the
      // drawing context has DPR scaling applied).
      drawingCtx.save();
      drawingCtx.setTransform(1, 0, 0, 1, 0, 0);
      drawingCtx.drawImage(preColoredCanvas, 0, 0);
      drawingCtx.restore();

      setIsAutoColoring(false);
      setHasAutoColored(true);
      setActiveTool('brush');
      playSound('sparkle');
      setHasUnsavedChanges(true);
    }, [
      playSound,
      pushToHistory,
      setHasUnsavedChanges,
      setIsAutoColoring,
      setHasAutoColored,
    ]);

    // Handle direct auto-color using fill points (bypasses region detection)
    const handleDirectAutoColor = useCallback(() => {
      const drawingCanvas = canvasRef.current?.getCanvas();
      if (!drawingCanvas) return;

      const points = getDirectFillPoints(
        drawingCanvas.width,
        drawingCanvas.height,
      );
      if (!points || points.length === 0) return;

      setIsAutoColoring(true);
      const boundary = canvasRef.current?.getDilatedBoundary();

      let index = 0;
      const batchSize = 3;

      const fillBatch = () => {
        const end = Math.min(index + batchSize, points.length);
        for (let i = index; i < end; i++) {
          const { x, y, color } = points[i];
          canvasRef.current?.fillRegionAtPoint(
            x,
            y,
            color,
            true,
            boundary ?? undefined,
          );
        }
        index = end;

        if (index < points.length) {
          requestAnimationFrame(fillBatch);
        } else {
          setIsAutoColoring(false);
          setActiveTool('brush');
          playSound('sparkle');
          setHasUnsavedChanges(true);
        }
      };

      requestAnimationFrame(fillBatch);
    }, [
      getDirectFillPoints,
      playSound,
      setHasUnsavedChanges,
      setIsAutoColoring,
    ]);

    // Handle reference-based auto-color: region fill with nudging + pixel
    // gap-fill pass for ~100% coverage while keeping flat coloring look.
    // Deferred via setTimeout so the modal loader renders before heavy work.
    const handleReferenceAutoColor = useCallback(() => {
      const drawingCanvas = canvasRef.current?.getCanvas();
      const boundaryCanvas = canvasRef.current?.getBoundaryCanvas();
      if (!drawingCanvas || !boundaryCanvas || !referenceColor.state.isReady)
        return;

      const refDims = referenceColor.getDimensions();
      if (!refDims) return;

      setIsAutoColoring(true);

      setTimeout(() => {
        try {
          // Debug: sample a few known positions from reference
          console.log(`[AutoColor] Reference state:`, referenceColor.state);
          console.log(
            `[AutoColor] Reference center color:`,
            referenceColor.getColorAtNormalized(0.5, 0.5),
          );
          console.log(
            `[AutoColor] Reference (0.3,0.3):`,
            referenceColor.getColorAtNormalized(0.3, 0.3),
          );
          console.log(
            `[AutoColor] Reference (0.7,0.5):`,
            referenceColor.getColorAtNormalized(0.7, 0.5),
          );

          const regionMap = detectAllRegions(drawingCanvas, boundaryCanvas);
          const boundary = canvasRef.current?.getDilatedBoundary();

          const nudgeOffsets = [
            [0, 0],
            [3, 0],
            [-3, 0],
            [0, 3],
            [0, -3],
            [3, 3],
            [-3, -3],
            [3, -3],
            [-3, 3],
            [6, 0],
            [-6, 0],
            [0, 6],
            [0, -6],
          ];

          // Helper: pick the most common color from multiple sample points.
          // Clusters similar colors (within distance 60) so slight shading
          // differences don't split votes. Returns the dominant cluster's color.
          const pickDominantColor = (colors: string[]): string | null => {
            if (colors.length === 0) return null;
            if (colors.length === 1) return colors[0];

            // Parse hex to RGB, filter out near-white/very light colors
            // that are likely background or boundary artifacts
            const allRgbs = colors.map((c) => ({
              hex: c,
              r: parseInt(c.slice(1, 3), 16),
              g: parseInt(c.slice(3, 5), 16),
              b: parseInt(c.slice(5, 7), 16),
            }));
            // Filter out near-white (background) and near-black (boundary)
            const rgbs = allRgbs.filter((c) => {
              const avg = (c.r + c.g + c.b) / 3;
              const maxC = Math.max(c.r, c.g, c.b);
              const minC = Math.min(c.r, c.g, c.b);
              // Remove near-black (boundary artifacts)
              if (avg < 30) return false;
              // Remove near-white unless it has some saturation
              if (avg > 220 && maxC - minC <= 30) return false;
              return true;
            });
            // If all colors were filtered out, fall back to originals
            if (rgbs.length === 0) return allRgbs[0]?.hex ?? null;

            // Simple clustering: group colors within distance threshold
            const clusters: { colors: typeof rgbs; count: number }[] = [];
            const threshold = 60;
            for (const rgb of rgbs) {
              let found = false;
              for (const cluster of clusters) {
                const rep = cluster.colors[0];
                const dist = Math.sqrt(
                  (rgb.r - rep.r) ** 2 +
                    (rgb.g - rep.g) ** 2 +
                    (rgb.b - rep.b) ** 2,
                );
                if (dist < threshold) {
                  cluster.colors.push(rgb);
                  cluster.count++;
                  found = true;
                  break;
                }
              }
              if (!found) {
                clusters.push({ colors: [rgb], count: 1 });
              }
            }

            // Return the average color from the largest cluster
            clusters.sort((a, b) => b.count - a.count);
            const best = clusters[0].colors;
            const avgR = Math.round(
              best.reduce((s, c) => s + c.r, 0) / best.length,
            );
            const avgG = Math.round(
              best.reduce((s, c) => s + c.g, 0) / best.length,
            );
            const avgB = Math.round(
              best.reduce((s, c) => s + c.b, 0) / best.length,
            );
            return `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`.toUpperCase();
          };

          // Debug: log dimensions and reference info
          console.log(
            `[AutoColor] Canvas: ${regionMap.width}x${regionMap.height}, ` +
              `Reference: ${refDims.width}x${refDims.height}, ` +
              `Regions: ${regionMap.regions.length}`,
          );

          // Sort regions by size (largest first) for debug logging
          const sortedRegions = [...regionMap.regions].sort(
            (a, b) => b.pixelCount - a.pixelCount,
          );

          for (const region of sortedRegions) {
            // Sample centroid + all samplePixels from the reference,
            // then pick the dominant color via clustering. This handles
            // slight misalignment between reference and original line art.
            const samplePoints = [
              region.centroid,
              ...(region.samplePixels || []),
            ];
            const sampledColors: string[] = [];
            for (const pt of samplePoints) {
              const normX = pt.x / regionMap.width;
              const normY = pt.y / regionMap.height;
              const c = referenceColor.getColorAtNormalized(normX, normY);
              if (c) sampledColors.push(c);
            }
            const color = pickDominantColor(sampledColors);

            // Debug: log top 20 largest regions
            if (sortedRegions.indexOf(region) < 20) {
              console.log(
                `[AutoColor] Region #${region.id} (${region.pixelCount}px) ` +
                  `centroid=(${region.centroid.x.toFixed(0)},${region.centroid.y.toFixed(0)}) ` +
                  `samples=[${sampledColors.join(',')}] → ${color}`,
              );
            }

            if (color) {
              let filled = false;
              for (const [dx, dy] of nudgeOffsets) {
                const success = canvasRef.current?.fillRegionAtPoint(
                  Math.round(region.centroid.x + dx),
                  Math.round(region.centroid.y + dy),
                  color,
                  true,
                  boundary ?? undefined,
                );
                if (success) {
                  filled = true;
                  break;
                }
              }
              if (!filled && region.samplePixels) {
                for (const sample of region.samplePixels) {
                  const success = canvasRef.current?.fillRegionAtPoint(
                    Math.round(sample.x),
                    Math.round(sample.y),
                    color,
                    true,
                    boundary ?? undefined,
                  );
                  if (success) break;
                }
              }
            }
          }

          // Phase 2: Gap fill
          const drawingCtx = drawingCanvas.getContext('2d');
          const boundaryCtx = boundaryCanvas.getContext('2d');
          if (drawingCtx && boundaryCtx) {
            const width = drawingCanvas.width;
            const height = drawingCanvas.height;
            const drawingData = drawingCtx.getImageData(0, 0, width, height);
            const boundaryData = boundaryCtx.getImageData(0, 0, width, height);
            const scaleX = refDims.width / width;
            const scaleY = refDims.height / height;

            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                if (drawingData.data[idx + 3] > 0) continue;

                const bA = boundaryData.data[idx + 3];
                if (bA >= 128) {
                  const lum =
                    0.299 * boundaryData.data[idx] +
                    0.587 * boundaryData.data[idx + 1] +
                    0.114 * boundaryData.data[idx + 2];
                  if (lum < 200) continue;
                }

                const refX = Math.floor(x * scaleX);
                const refY = Math.floor(y * scaleY);
                const color = referenceColor.getColorAt(refX, refY);
                if (color) {
                  drawingData.data[idx] = parseInt(color.slice(1, 3), 16);
                  drawingData.data[idx + 1] = parseInt(color.slice(3, 5), 16);
                  drawingData.data[idx + 2] = parseInt(color.slice(5, 7), 16);
                  drawingData.data[idx + 3] = 255;
                }
              }
            }
            drawingCtx.putImageData(drawingData, 0, 0);
          }

          playSound('sparkle');
          setHasUnsavedChanges(true);
          setHasAutoColored(true);
        } finally {
          setIsAutoColoring(false);
          setActiveTool('brush');
        }
      }, 50);
    }, [
      referenceColor,
      playSound,
      setHasUnsavedChanges,
      setIsAutoColoring,
      setHasAutoColored,
      setActiveTool,
    ]);

    // Trigger auto-fill when magic-auto tool is selected
    useEffect(() => {
      if (activeTool !== 'magic-auto' || !canvasReadyRef.current) return;

      // Prefer region store (pre-computed, palette-aware, most accurate)
      if (regionStore.state.isReady) {
        handleRegionStoreAutoColor();
        return;
      }

      // Fallback: reference image (holistic AI coloring)
      if (hasColoredReference && referenceColor.state.isReady) {
        handleReferenceAutoColor();
        return;
      }

      // Fallback: direct fill points (no region detection needed)
      if (fillPointsData) {
        handleDirectAutoColor();
        return;
      }

      // No fill points — generate on-demand
      if (!isGeneratingFillPoints) {
        generateFillPointsOnDemand();
      }
    }, [
      activeTool,
      regionStore.state.isReady,
      handleRegionStoreAutoColor,
      hasColoredReference,
      referenceColor.state.isReady,
      handleReferenceAutoColor,
      fillPointsData,
      isGeneratingFillPoints,
      handleDirectAutoColor,
      generateFillPointsOnDemand,
    ]);

    // Get canvas data URL for saving to gallery
    // Uses composite canvas that merges user's colors with line art
    const getCanvasDataUrl = useCallback(() => {
      const canvas = canvasRef.current?.getCompositeCanvas();
      if (!canvas) return null;
      return canvas.toDataURL('image/png');
    }, []);

    // Get canvas element for progress indicator
    const getCanvas = useCallback(() => {
      return canvasRef.current?.getCanvas() || null;
    }, []);

    // Get boundary (line-art) canvas — used by ProgressIndicator to compute
    // the colourable area excluding line pixels.
    const getBoundaryCanvas = useCallback(() => {
      return canvasRef.current?.getBoundaryCanvas() || null;
    }, []);

    // Handle undo by restoring the canvas to the state before the action
    const handleUndo = useCallback(
      (action: CanvasAction) => {
        if (canvasRef.current) {
          // Capture current state (the "after" state) before restoring
          // This is needed for redo to work properly
          const currentState = canvasRef.current.captureCanvasState();
          if (currentState) {
            redoStatesRef.current.set(action.timestamp, currentState);
          }

          // The action's imageData is the state BEFORE the action was performed
          // Restoring to it effectively "undoes" the action
          canvasRef.current.restoreCanvasState(action.imageData);
          playSound('undo');
        }
      },
      [playSound],
    );

    // Handle redo by restoring to the "after" state we captured during undo
    const handleRedo = useCallback(
      (action: CanvasAction) => {
        if (canvasRef.current) {
          // Look up the "after" state we saved during undo
          const afterState = redoStatesRef.current.get(action.timestamp);
          if (afterState) {
            canvasRef.current.restoreCanvasState(afterState);
            // Clean up - remove from map since it's been used
            redoStatesRef.current.delete(action.timestamp);
            playSound('redo');
          }
        }
      },
      [playSound],
    );

    // Handle sticker tool selection - opens the sticker selector modal
    const openStickerSelector = useCallback(() => {
      setIsStickerSelectorOpen(true);
    }, []);

    // Handle start over - clear canvas and saved progress
    const handleStartOver = useCallback(() => {
      if (!canvasRef.current || !coloringImage.id) return;

      // Clear the canvas
      canvasRef.current.clearCanvas();

      // Clear saved progress from localStorage
      clearColoringProgress(coloringImage.id);

      // Clear undo/redo history
      clearHistory();
      redoStatesRef.current.clear();

      // Clear serializable drawing actions
      clearDrawingActions();

      // Reset magic color map (so it re-generates if magic tool is active)
      resetMagicColorMap();

      // Reset to default crayon brush to prevent magic-auto from re-triggering
      setActiveTool('brush');
      setBrushType('crayon');

      // Reset unsaved changes flag
      setHasUnsavedChanges(false);

      // Play sparkle sound for fresh start
      playSound('sparkle');
    }, [
      coloringImage.id,
      clearHistory,
      clearDrawingActions,
      resetMagicColorMap,
      setActiveTool,
      setBrushType,
      setHasUnsavedChanges,
      playSound,
    ]);

    // Expose methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        getCanvas,
        getBoundaryCanvas,
        getCanvasDataUrl,
        handleUndo,
        handleRedo,
        handleStartOver,
        openStickerSelector,
      }),
      [
        getCanvas,
        getBoundaryCanvas,
        getCanvasDataUrl,
        handleUndo,
        handleRedo,
        handleStartOver,
        openStickerSelector,
      ],
    );

    // Auto-save when changes are made (debounced)
    useEffect(() => {
      if (!hasUnsavedChanges || !canvasReadyRef.current || !coloringImage.id) {
        return;
      }

      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Debounce save by 1 second
      saveTimerRef.current = setTimeout(() => {
        const canvas = canvasRef.current?.getCanvas();
        if (canvas) {
          // Generate preview thumbnail for server storage
          const previewDataUrl =
            canvasRef.current?.generatePreviewThumbnail() ?? undefined;
          saveColoringProgress(
            coloringImage.id as string,
            canvas,
            drawingActions,
            previewDataUrl,
          );
          setHasUnsavedChanges(false);
        }
      }, 1000);

      return () => {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
      };
    }, [
      hasUnsavedChanges,
      coloringImage.id,
      setHasUnsavedChanges,
      drawingActions,
    ]);

    // Handle canvas ready - restore any saved progress
    const handleCanvasReady = useCallback(async () => {
      console.log(
        `[ColoringArea] handleCanvasReady called, coloringImage.id=${coloringImage.id}, canvasRef.current=${!!canvasRef.current}`,
      );
      canvasReadyRef.current = true;

      if (!coloringImage.id) {
        console.log(`[ColoringArea] Skipping load - no coloringImage.id`);
        return;
      }

      // Try to load saved progress (actions + optional local snapshot)
      const savedProgress = await loadColoringProgress(coloringImage.id);
      console.log(
        `[ColoringArea] loadColoringProgress returned:`,
        savedProgress
          ? {
              hasImage: !!savedProgress.image,
              actionsCount: savedProgress.actions?.length || 0,
              version: savedProgress.version,
              source: savedProgress.source,
              dimensions: `${savedProgress.sourceWidth}x${savedProgress.sourceHeight}`,
            }
          : 'null',
      );

      if (savedProgress && canvasRef.current) {
        // Restore visual state from local snapshot if available (quick restore)
        if (savedProgress.image) {
          canvasRef.current.restoreFromImage(savedProgress.image);
          console.log(`[ColoringArea] Restored canvas from local snapshot`);
        } else if (savedProgress.actions.length > 0) {
          // Server data only (no local snapshot) - replay actions to restore canvas
          console.log(
            `[ColoringArea] Replaying ${savedProgress.actions.length} actions from server (source dimensions: ${savedProgress.sourceWidth}x${savedProgress.sourceHeight})`,
          );
          let replayedCount = 0;
          for (const action of savedProgress.actions) {
            const success = canvasRef.current.replayAction(
              action,
              savedProgress.sourceWidth,
              savedProgress.sourceHeight,
            );
            if (success) replayedCount++;
          }
          console.log(
            `[ColoringArea] Successfully replayed ${replayedCount}/${savedProgress.actions.length} actions`,
          );

          // Force canvas repaint after bulk replay to flush GPU cache
          // This fixes display issues where canvas content doesn't appear until devtools toggle
          if (replayedCount > 0) {
            requestAnimationFrame(() => {
              canvasRef.current?.forceRepaint();
            });
          }
        }

        // Restore drawing actions to context for future saves
        // Use setDrawingActions directly to avoid triggering hasUnsavedChanges
        // (addDrawingAction sets hasUnsavedChanges(true) which would trigger auto-save)
        if (savedProgress.actions.length > 0) {
          setDrawingActions(savedProgress.actions);
          console.log(
            `[ColoringArea] Restored ${savedProgress.actions.length} drawing actions to context`,
          );
        }
      }
    }, [coloringImage.id, setDrawingActions]);

    // Handle region revealed by magic brush
    const handleRegionRevealed = useCallback(
      (regionId: number) => {
        markRegionColored(regionId);
        setHasUnsavedChanges(true);
      },
      [markRegionColored, setHasUnsavedChanges],
    );

    // Reference-based color lookup for Magic Brush (CSS coords → reference sampling)
    const getRevealColorFromCSS = useCallback(
      (
        cssX: number,
        cssY: number,
        cssWidth: number,
        cssHeight: number,
      ): string | null => {
        if (!referenceColor.state.isReady) return null;
        const normX = cssX / cssWidth;
        const normY = cssY / cssHeight;
        return referenceColor.getColorAtNormalized(normX, normY);
      },
      [referenceColor.state.isReady, referenceColor.getColorAtNormalized],
    );

    // Determine which color source to use for magic tools
    const useReferenceForMagic =
      hasColoredReference && referenceColor.state.isReady;
    const isMagicReady =
      regionStore.state.isReady ||
      useReferenceForMagic ||
      magicColorMapState.isReady;

    return (
      <div className="flex flex-col gap-y-2 md:gap-y-3">
        {/* Auto Color loading modal */}
        <AutoColorModal />

        {/* Desktop Toolbar (md-lg only) - Traditional top toolbar */}
        {/* Hidden on xl+ where sidebar controls are used instead */}
        {/* Note: Progress/Mute moved to page header on desktop for cleaner canvas area */}
        <div className="hidden md:block xl:hidden">
          <ColoringToolbar
            onUndo={handleUndo}
            onRedo={handleRedo}
            onStickerToolSelect={openStickerSelector}
          />
        </div>

        {/* Mobile Top Bar - Minimal with progress, mute, and zoom */}
        <div className="md:hidden flex items-center justify-between gap-3 px-1">
          {/* Left side: Progress bar needs flex-1 to expand and give ProgressIndicator width */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ProgressIndicator
              getCanvas={getCanvas}
              getBoundaryCanvas={getBoundaryCanvas}
              className="flex-1 min-w-0"
            />
            <MuteToggle />
          </div>
          <ZoomControls className="shadow-sm shrink-0" />
        </div>

        {/* Canvas - Shared between mobile and desktop */}
        <div
          ref={canvasWrapperRef}
          className="relative flex-1 flex items-center justify-center md:block"
        >
          <ImageCanvas
            ref={canvasRef}
            coloringImage={coloringImage}
            className="rounded-lg shadow-lg bg-white overflow-hidden"
            onCanvasReady={handleCanvasReady}
            onFirstInteraction={handleFirstInteraction}
            getRevealColor={useReferenceForMagic ? undefined : getColorAtPoint}
            getRevealColorFromCSS={
              useReferenceForMagic ? getRevealColorFromCSS : undefined
            }
            getRevealRegionId={
              useReferenceForMagic ? undefined : getRegionIdAtPoint
            }
            onRegionRevealed={
              useReferenceForMagic ? undefined : handleRegionRevealed
            }
            isMagicRevealReady={isMagicReady}
            regionStore={
              regionStore.state.isReady
                ? {
                    getRegionIdAt: regionStore.getRegionIdAt,
                    getColorForRegion: regionStore.getColorForRegion,
                    isReady: regionStore.state.isReady,
                    width: regionStore.state.width,
                    height: regionStore.state.height,
                  }
                : undefined
            }
          />

          {/* Region-store wait banner — the worker is generating it in
           * the background. On timeout we surface a retry button so the
           * user isn't stuck in a silent poll loop. */}
          {regionStoreStatus === 'timeout' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-xs">
              <div className="bg-white/95 backdrop-blur rounded-2xl border-2 border-crayon-orange/40 px-4 py-3 shadow-lg text-center">
                <p className="text-sm font-medium text-text-primary mb-2">
                  Magic colours are taking a while
                </p>
                <p className="text-xs text-text-primary/70 mb-3">
                  You can still colour by hand while we get things ready.
                </p>
                <button
                  type="button"
                  onClick={handleRegionStoreRetry}
                  className="inline-flex items-center gap-x-1.5 rounded-full bg-crayon-orange px-4 py-1.5 text-xs font-semibold text-white hover:bg-crayon-orange/90 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
          {regionStoreStatus === 'retrying' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-xs">
              <div className="bg-white/95 backdrop-blur rounded-2xl border-2 border-crayon-orange/40 px-4 py-3 shadow-lg text-center">
                <p className="text-sm font-medium text-text-primary">
                  Trying again…
                </p>
              </div>
            </div>
          )}

          {/* Magic overlay — only shown on the LEGACY warm-up path
           * (on-demand fill-points gen / 5×5 colour-map generation for
           * images without a region store). Gated by parent; component
           * itself just handles presentation. */}
          <MagicColorOverlay
            state={
              isMagicToolActive && magicColorMapState.error
                ? 'error'
                : isMagicToolActive &&
                    !regionStore.state.isReady &&
                    (magicColorMapState.isLoading || isGeneratingFillPoints)
                  ? 'loading'
                  : null
            }
            phase={isGeneratingFillPoints ? 'fillPoints' : 'colorMap'}
            loadingMessage={magicColorMapState.loadingMessage ?? undefined}
            errorMessage={magicColorMapState.error ?? undefined}
            onRetry={() => resetMagicColorMap()}
            messages={{
              loadingTitleFillPoints: 'Mixing the magic colours!',
              loadingTitleColorMap: 'Getting the colours ready!',
              loadingBodyFillPoints:
                'This only happens once — hang tight, the rainbow is on its way.',
              errorTitle: 'Oops, the magic got tangled!',
            }}
          />
        </div>

        {/* Action buttons - Desktop style (md-lg only, hidden on xl+ where sidebar has them) */}
        <div className="hidden md:flex xl:hidden flex-wrap items-center justify-center gap-3">
          <StartOverButton onStartOver={handleStartOver} />
          <DownloadPDFButton
            coloringImage={coloringImage}
            getCanvasDataUrl={getCanvasDataUrl}
          />
          <ShareButton
            url={typeof window !== 'undefined' ? window.location.href : ''}
            title={coloringImage.title || 'Coloring Page'}
            description={`Color this ${coloringImage.title || 'fun coloring page'} on Chunky Crayon!`}
            imageUrl={coloringImage.url || undefined}
            getCanvasDataUrl={getCanvasDataUrl}
          />
          {isAuthenticated && coloringImage.id && (
            <SaveToGalleryButton
              coloringImageId={coloringImage.id}
              getCanvasDataUrl={getCanvasDataUrl}
            />
          )}
        </div>

        {/* Mobile Action buttons - Compact row with icon-only buttons */}
        <div className="md:hidden flex items-center justify-center gap-3 py-2 px-2">
          <StartOverButton onStartOver={handleStartOver} />
          <DownloadPDFButton
            coloringImage={coloringImage}
            getCanvasDataUrl={getCanvasDataUrl}
          />
          <ShareButton
            url={typeof window !== 'undefined' ? window.location.href : ''}
            title={coloringImage.title || 'Coloring Page'}
            description={`Color this ${coloringImage.title || 'fun coloring page'} on Chunky Crayon!`}
            imageUrl={coloringImage.url || undefined}
            getCanvasDataUrl={getCanvasDataUrl}
          />
          {isAuthenticated && coloringImage.id && (
            <SaveToGalleryButton
              coloringImageId={coloringImage.id}
              getCanvasDataUrl={getCanvasDataUrl}
            />
          )}
        </div>

        {/* Fixed bottom drawer for mobile - Vaul-based draggable bottom sheet.
            Gated by IntersectionObserver above so it hides when the user
            scrolls past the canvas (e.g. reading tips/comments below). */}
        {isCanvasInViewport && (
          <MobileColoringDrawer
            className="md:hidden"
            onUndo={handleUndo}
            onRedo={handleRedo}
            onStickerToolSelect={openStickerSelector}
          />
        )}

        {/* Sticker selector modal */}
        <StickerSelector
          isOpen={isStickerSelectorOpen}
          onClose={() => setIsStickerSelectorOpen(false)}
        />
      </div>
    );
  },
);

export default ColoringArea;
