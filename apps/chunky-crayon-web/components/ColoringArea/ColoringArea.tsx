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
import { useMagicColorMap } from '@/hooks/useMagicColorMap';
import type { GridColorMap, FillPointsData } from '@/lib/ai';
import {
  saveColoringProgress,
  loadColoringProgress,
  clearColoringProgress,
} from '@one-colored-pixel/coloring-ui';
import { generateRegionFillPoints } from '@/app/actions/generate-color-map';
import { generateColoredReference } from '@/app/actions/generate-colored-reference';
import { detectAllRegions } from '@one-colored-pixel/canvas';

type ColoringAreaProps = {
  coloringImage: Partial<ColoringImage>;
  isAuthenticated?: boolean;
};

export type ColoringAreaHandle = {
  getCanvas: () => HTMLCanvasElement | null;
  getCanvasDataUrl: () => string | null;
  handleUndo: (action: CanvasAction) => void;
  handleRedo: (action: CanvasAction) => void;
  handleStartOver: () => void;
  openStickerSelector: () => void;
};

const ColoringArea = forwardRef<ColoringAreaHandle, ColoringAreaProps>(
  ({ coloringImage, isAuthenticated = false }, ref) => {
    const canvasRef = useRef<ImageCanvasHandle>(null);
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

    // Handle first canvas interaction - load and play ambient sound
    // NOTE: Browser autoplay policy requires user interaction before audio can play - we cannot auto-play on page load
    // TODO: Trigger ambient sound on ANY page interaction (color pick, button click), not just canvas stroke
    // TODO: Improve ElevenLabs ambient sound prompts - current sounds are low quality/not fitting
    const handleFirstInteraction = useCallback(async () => {
      console.log('[ColoringArea] handleFirstInteraction called', {
        hasAmbientUrl: !!coloringImage.ambientSoundUrl,
        ambientUrl: coloringImage.ambientSoundUrl,
        alreadyInitialized: ambientInitializedRef.current,
      });
      if (coloringImage.ambientSoundUrl && !ambientInitializedRef.current) {
        ambientInitializedRef.current = true;
        console.log('[ColoringArea] Loading ambient sound...');
        await loadAmbient(coloringImage.ambientSoundUrl);
        console.log('[ColoringArea] Playing ambient sound...');
        playAmbient();
      }
    }, [coloringImage.ambientSoundUrl, loadAmbient, playAmbient]);

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
    // gap-fill pass for ~100% coverage while keeping flat coloring look
    const handleReferenceAutoColor = useCallback(() => {
      const drawingCanvas = canvasRef.current?.getCanvas();
      const boundaryCanvas = canvasRef.current?.getBoundaryCanvas();
      if (!drawingCanvas || !boundaryCanvas || !referenceColor.state.isReady)
        return;

      const refDims = referenceColor.getDimensions();
      if (!refDims) return;

      setIsAutoColoring(true);

      // Phase 1: Region-based fill (flat colors, respects boundaries)
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

      for (const region of regionMap.regions) {
        const normX = region.centroid.x / regionMap.width;
        const normY = region.centroid.y / regionMap.height;
        const color = referenceColor.getColorAtNormalized(normX, normY);

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

      // Phase 2: Gap fill — paint remaining transparent non-boundary pixels
      const drawingCtx = drawingCanvas.getContext('2d');
      const boundaryCtx = boundaryCanvas.getContext('2d');
      if (drawingCtx && boundaryCtx) {
        const width = drawingCanvas.width;
        const height = drawingCanvas.height;
        const drawingData = drawingCtx.getImageData(0, 0, width, height);
        const boundaryData = boundaryCtx.getImageData(0, 0, width, height);
        const scaleX = refDims.width / width;
        const scaleY = refDims.height / height;

        let gapsFilled = 0;
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
              gapsFilled++;
            }
          }
        }

        if (gapsFilled > 0) {
          drawingCtx.putImageData(drawingData, 0, 0);
        }
      }

      setIsAutoColoring(false);
      playSound('sparkle');
      setHasUnsavedChanges(true);
    }, [referenceColor, playSound, setHasUnsavedChanges, setIsAutoColoring]);

    // Trigger auto-fill when magic-auto tool is selected
    useEffect(() => {
      if (activeTool !== 'magic-auto' || !canvasReadyRef.current) return;

      // Prefer reference image (holistic AI coloring)
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
        getCanvasDataUrl,
        handleUndo,
        handleRedo,
        handleStartOver,
        openStickerSelector,
      }),
      [
        getCanvas,
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
    const isMagicReady = useReferenceForMagic || magicColorMapState.isReady;

    return (
      <div className="flex flex-col gap-y-2 md:gap-y-3">
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
              className="flex-1 min-w-0"
            />
            <MuteToggle />
          </div>
          <ZoomControls className="shadow-sm shrink-0" />
        </div>

        {/* Canvas - Shared between mobile and desktop */}
        <div className="relative flex-1 flex items-center justify-center md:block">
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
          />

          {/* Magic Loading Overlay - Shows when magic tools are analyzing the image */}
          {isMagicToolActive &&
            (magicColorMapState.isLoading || isGeneratingFillPoints) && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg z-10">
                <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-crayon-purple/10 to-crayon-pink/10 border-2 border-crayon-purple/20 shadow-lg">
                  <div className="relative">
                    <div className="size-12 border-4 border-crayon-purple/30 border-t-crayon-purple rounded-full animate-spin" />
                    <span className="absolute inset-0 flex items-center justify-center text-2xl">
                      ✨
                    </span>
                  </div>
                  <p className="text-sm font-bold text-crayon-purple text-center max-w-[200px]">
                    {isGeneratingFillPoints
                      ? 'Preparing magic colors for the first time...'
                      : magicColorMapState.loadingMessage ||
                        'Preparing magic colors...'}
                  </p>
                </div>
              </div>
            )}

          {/* Magic Error Overlay - Shows if magic analysis fails */}
          {isMagicToolActive && magicColorMapState.error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg z-10">
              <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-crayon-pink/10 border-2 border-crayon-pink/30 shadow-lg">
                <span className="text-3xl">😕</span>
                <p className="text-sm font-bold text-crayon-pink text-center max-w-[200px]">
                  {magicColorMapState.error}
                </p>
                <button
                  type="button"
                  onClick={() => resetMagicColorMap()}
                  className="px-4 py-2 text-sm font-bold text-white bg-crayon-purple rounded-full hover:bg-crayon-purple/90 active:scale-95 transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
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

        {/* Fixed bottom drawer for mobile - Vaul-based draggable bottom sheet */}
        <MobileColoringDrawer
          className="md:hidden"
          onUndo={handleUndo}
          onRedo={handleRedo}
          onStickerToolSelect={openStickerSelector}
        />

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
