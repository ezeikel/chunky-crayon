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
import { ColoringImage } from '@chunky-crayon/db/types';
import ImageCanvas, {
  ImageCanvasHandle,
} from '@/components/ImageCanvas/ImageCanvas';
import ColoringToolbar from '@/components/ColoringToolbar/ColoringToolbar';
import MobileColoringDrawer from '@/components/MobileColoringDrawer/MobileColoringDrawer';
import StickerSelector from '@/components/StickerSelector';
import ProgressIndicator from '@/components/ProgressIndicator';
import MuteToggle from '@/components/MuteToggle';
import ZoomControls from '@/components/ZoomControls/ZoomControls';
import DownloadPDFButton from '@/components/buttons/DownloadPDFButton/DownloadPDFButton';
import StartOverButton from '@/components/buttons/StartOverButton/StartOverButton';
import ShareButton from '@/components/buttons/ShareButton';
import SaveToGalleryButton from '@/components/buttons/SaveToGalleryButton';
import { CanvasAction, useColoringContext } from '@/contexts/coloring';
import { useSound } from '@/hooks/useSound';
import { useMagicColorMap } from '@/hooks/useMagicColorMap';
import type { GridColorMap } from '@/lib/ai';
import {
  saveColoringProgress,
  loadColoringProgress,
  clearColoringProgress,
} from '@/utils/coloringStorage';

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
    } = useColoringContext();
    const { playSound, loadAmbient, playAmbient, stopAmbient } = useSound();

    // Parse pre-computed color map from static page data (generated at image creation time)
    const preComputedColorMap = useMemo<GridColorMap | null>(() => {
      if (!coloringImage.colorMapJson) return null;
      try {
        return JSON.parse(coloringImage.colorMapJson) as GridColorMap;
      } catch {
        console.error('[ColoringArea] Failed to parse colorMapJson');
        return null;
      }
    }, [coloringImage.colorMapJson]);

    // Magic Color Map for reveal mode and auto-color
    // Uses pre-computed data for instant color assignment (no AI call needed)
    const {
      state: magicColorMapState,
      generateColorMap,
      getColorAtPoint,
      getRegionIdAtPoint,
      markRegionColored,
      getAllColorsForAutoFill,
      reset: resetMagicColorMap,
    } = useMagicColorMap({ preComputedColorMap });

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

    // Generate color map when any magic tool is selected
    const isMagicToolActive =
      activeTool === 'magic-reveal' || activeTool === 'magic-auto';

    useEffect(() => {
      if (!isMagicToolActive || !canvasReadyRef.current) return;

      // Skip if already ready or loading
      if (magicColorMapState.isReady || magicColorMapState.isLoading) return;

      const drawingCanvas = canvasRef.current?.getCanvas();
      const boundaryCanvas = canvasRef.current?.getBoundaryCanvas();

      if (!drawingCanvas || !boundaryCanvas) return;

      generateColorMap(drawingCanvas, boundaryCanvas);
    }, [
      isMagicToolActive,
      magicColorMapState.isReady,
      magicColorMapState.isLoading,
      generateColorMap,
    ]);

    // Handle auto-color - fill all remaining regions at once
    const handleAutoColor = useCallback(() => {
      const regionsToFill = getAllColorsForAutoFill();

      if (regionsToFill.length === 0) return;

      // Fill each region with its assigned color
      // Note: centroids are in canvas pixel coordinates (DPR-scaled), so we pass isCanvasPixels=true
      for (const { regionId, color, centroid } of regionsToFill) {
        const success = canvasRef.current?.fillRegionAtPoint(
          Math.round(centroid.x),
          Math.round(centroid.y),
          color,
          true, // isCanvasPixels - centroids from region detection are in canvas pixels
        );

        if (success) {
          markRegionColored(regionId);
        }
      }

      // Play celebration sound
      playSound('sparkle');
      setHasUnsavedChanges(true);
    }, [
      getAllColorsForAutoFill,
      markRegionColored,
      playSound,
      setHasUnsavedChanges,
    ]);

    // Trigger auto-fill when magic-auto tool is selected and color map is ready
    useEffect(() => {
      if (activeTool === 'magic-auto' && magicColorMapState.isReady) {
        handleAutoColor();
      }
    }, [activeTool, magicColorMapState.isReady, handleAutoColor]);

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
          saveColoringProgress(
            coloringImage.id as string,
            canvas,
            drawingActions,
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
            getRevealColor={getColorAtPoint}
            getRevealRegionId={getRegionIdAtPoint}
            onRegionRevealed={handleRegionRevealed}
            isMagicRevealReady={magicColorMapState.isReady}
          />

          {/* Magic Loading Overlay - Shows when magic tools are analyzing the image */}
          {isMagicToolActive && magicColorMapState.isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg z-10">
              <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-crayon-purple/10 to-crayon-pink/10 border-2 border-crayon-purple/20 shadow-lg">
                <div className="relative">
                  <div className="size-12 border-4 border-crayon-purple/30 border-t-crayon-purple rounded-full animate-spin" />
                  <span className="absolute inset-0 flex items-center justify-center text-2xl">
                    ✨
                  </span>
                </div>
                <p className="text-sm font-bold text-crayon-purple text-center max-w-[200px]">
                  {magicColorMapState.loadingMessage ||
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
