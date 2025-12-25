'use client';

import { useRef, useCallback, useEffect } from 'react';
import { ColoringImage } from '@chunky-crayon/db/types';
import ImageCanvas, {
  ImageCanvasHandle,
} from '@/components/ImageCanvas/ImageCanvas';
import ColoringToolbar from '@/components/ColoringToolbar/ColoringToolbar';
import ProgressIndicator from '@/components/ProgressIndicator';
import MuteToggle from '@/components/MuteToggle';
import DownloadPDFButton from '@/components/buttons/DownloadPDFButton/DownloadPDFButton';
import StartOverButton from '@/components/buttons/StartOverButton/StartOverButton';
import ShareButton from '@/components/buttons/ShareButton';
import SaveToGalleryButton from '@/components/buttons/SaveToGalleryButton';
import { CanvasAction, useColoringContext } from '@/contexts/coloring';
import { useSound } from '@/hooks/useSound';
import {
  saveColoringProgress,
  loadColoringProgress,
  clearColoringProgress,
} from '@/utils/coloringStorage';

type ColoringAreaProps = {
  coloringImage: Partial<ColoringImage>;
  isAuthenticated?: boolean;
};

const ColoringArea = ({
  coloringImage,
  isAuthenticated = false,
}: ColoringAreaProps) => {
  const canvasRef = useRef<ImageCanvasHandle>(null);
  // Store the "after" states for redo - keyed by timestamp
  const redoStatesRef = useRef<Map<number, ImageData>>(new Map());
  // Track if canvas is ready
  const canvasReadyRef = useRef(false);
  // Debounce timer for auto-save
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Track if ambient sound has been initialized
  const ambientInitializedRef = useRef(false);

  const { hasUnsavedChanges, setHasUnsavedChanges, clearHistory } =
    useColoringContext();
  const { playSound, loadAmbient, playAmbient, stopAmbient } = useSound();

  // Handle first canvas interaction - load and play ambient sound
  // NOTE: Browser autoplay policy requires user interaction before audio can play - we cannot auto-play on page load
  // TODO: Trigger ambient sound on ANY page interaction (color pick, button click), not just canvas stroke
  // TODO: Improve ElevenLabs ambient sound prompts - current sounds are low quality/not fitting
  const handleFirstInteraction = useCallback(async () => {
    if (coloringImage.ambientSoundUrl && !ambientInitializedRef.current) {
      ambientInitializedRef.current = true;
      await loadAmbient(coloringImage.ambientSoundUrl);
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

  // Get canvas data URL for saving to gallery
  const getCanvasDataUrl = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  }, []);

  // Get canvas element for progress indicator
  const getCanvas = useCallback(() => {
    return canvasRef.current?.getCanvas() || null;
  }, []);

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
        saveColoringProgress(coloringImage.id as string, canvas);
        setHasUnsavedChanges(false);
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, coloringImage.id, setHasUnsavedChanges]);

  // Handle canvas ready - restore any saved progress
  const handleCanvasReady = useCallback(async () => {
    canvasReadyRef.current = true;

    if (!coloringImage.id) return;

    // Try to load saved progress
    const savedImage = await loadColoringProgress(coloringImage.id);
    if (savedImage && canvasRef.current) {
      canvasRef.current.restoreFromImage(savedImage);
    }
  }, [coloringImage.id]);

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

    // Reset unsaved changes flag
    setHasUnsavedChanges(false);

    // Play sparkle sound for fresh start
    playSound('sparkle');
  }, [coloringImage.id, clearHistory, setHasUnsavedChanges, playSound]);

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <ColoringToolbar
          className="self-center"
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
        <div className="flex items-center gap-3">
          <ProgressIndicator getCanvas={getCanvas} className="relative" />
          <MuteToggle />
        </div>
      </div>
      <ImageCanvas
        ref={canvasRef}
        coloringImage={coloringImage}
        className="rounded-lg shadow-lg bg-white overflow-hidden"
        onCanvasReady={handleCanvasReady}
        onFirstInteraction={handleFirstInteraction}
      />
      <div className="flex flex-wrap items-center justify-center gap-3">
        <StartOverButton onStartOver={handleStartOver} />
        <DownloadPDFButton coloringImage={coloringImage} />
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
    </div>
  );
};

export default ColoringArea;
