'use client';

import { useState, useRef, useCallback } from 'react';
import { describeImage } from '@/app/actions/input-processing';

// =============================================================================
// Types
// =============================================================================

export type ImageInputState =
  | 'idle'
  | 'capturing'
  | 'preview'
  | 'processing'
  | 'complete'
  | 'error';

export type ImageInputError =
  | 'file_too_large'
  | 'invalid_type'
  | 'processing_failed'
  | 'camera_failed'
  | 'heic_unsupported';

export type ImageInputSource = 'camera' | 'file_picker';

export type ImageInputResult = {
  state: ImageInputState;
  /** Preview URL for selected image */
  previewUrl: string | null;
  /** Base64 data URL of the resized WebP, ready for server submission */
  imageBase64: string | null;
  /** Description from AI after processing */
  description: string | null;
  /** Detected subjects in the image */
  subjects: string[];
  /** Whether the image appears to be a child's drawing */
  isChildDrawing: boolean;
  /** Error type if state is 'error' */
  error: ImageInputError | null;
  /** Source of the current image */
  source: ImageInputSource | null;
  /** Original file size in KB */
  fileSizeKb: number;
  /** Open camera to capture photo */
  openCamera: () => void;
  /** Open file picker to select image */
  openFilePicker: () => void;
  /** Process the selected image with AI */
  processImage: () => Promise<void>;
  /** Clear image and reset state */
  clearImage: () => void;
  /** Reset to idle state */
  reset: () => void;
  /** Hidden file input ref for camera */
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  /** Hidden file input ref for file picker */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  /** Handle file input change */
  handleFileChange: (
    event: React.ChangeEvent<HTMLInputElement>,
    source: ImageInputSource,
  ) => void;
};

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE_MB = 10;
const MAX_IMAGE_DIMENSION = 1536;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const HEIC_TYPES = ['image/heic', 'image/heif'];

// =============================================================================
// Helper Functions
// =============================================================================

const canvasToBlobWithFallback = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        canvas.toBlob(
          (jpegBlob) => {
            if (jpegBlob) {
              resolve(jpegBlob);
            } else {
              reject(new Error('Could not create image blob'));
            }
          },
          'image/jpeg',
          0.85,
        );
      },
      'image/webp',
      0.85,
    );
  });

/**
 * Resize image to max dimensions while respecting EXIF orientation,
 * and convert to WebP for smaller file size. Uses createImageBitmap with
 * imageOrientation: 'from-image' so iPhone photos uploaded in Chrome/Firefox
 * aren't sideways or upside-down.
 */
async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
    premultiplyAlpha: 'default',
  });

  try {
    let { width, height } = bitmap;

    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      if (width > height) {
        height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
        width = MAX_IMAGE_DIMENSION;
      } else {
        width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
        height = MAX_IMAGE_DIMENSION;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    ctx.drawImage(bitmap, 0, 0, width, height);

    return await canvasToBlobWithFallback(canvas);
  } finally {
    bitmap.close();
  }
}

// =============================================================================
// Hook
// =============================================================================

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
    reader.readAsDataURL(blob);
  });

export function useImageInput(): ImageInputResult {
  // State
  const [state, setState] = useState<ImageInputState>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isChildDrawing, setIsChildDrawing] = useState(false);
  const [error, setError] = useState<ImageInputError | null>(null);
  const [source, setSource] = useState<ImageInputSource | null>(null);
  const [fileSizeKb, setFileSizeKb] = useState(0);

  // Refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedBlobRef = useRef<Blob | null>(null);

  // Cleanup preview URL
  const cleanupPreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  // Reset to initial state
  const reset = useCallback(() => {
    cleanupPreview();
    setState('idle');
    setPreviewUrl(null);
    setImageBase64(null);
    setDescription(null);
    setSubjects([]);
    setIsChildDrawing(false);
    setError(null);
    setSource(null);
    setFileSizeKb(0);
    processedBlobRef.current = null;
  }, [cleanupPreview]);

  // Clear image but stay ready for new input
  const clearImage = useCallback(() => {
    cleanupPreview();
    setState('idle');
    setPreviewUrl(null);
    setImageBase64(null);
    setDescription(null);
    setSubjects([]);
    setIsChildDrawing(false);
    setError(null);
    setSource(null);
    setFileSizeKb(0);
    processedBlobRef.current = null;
  }, [cleanupPreview]);

  // Open camera
  const openCamera = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  // Open file picker
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file selection
  const handleFileChange = useCallback(
    async (
      event: React.ChangeEvent<HTMLInputElement>,
      inputSource: ImageInputSource,
    ) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Reset input value so same file can be selected again
      event.target.value = '';

      // HEIC/HEIF can't be decoded by <canvas> on Chrome/Firefox/most mobile
      // webviews. Call it out explicitly instead of failing inside resize().
      const lowered = file.name.toLowerCase();
      if (
        HEIC_TYPES.includes(file.type) ||
        lowered.endsWith('.heic') ||
        lowered.endsWith('.heif')
      ) {
        setError('heic_unsupported');
        setState('error');
        return;
      }

      // Validate file type
      if (
        !ALLOWED_TYPES.includes(file.type) &&
        !file.type.startsWith('image/')
      ) {
        setError('invalid_type');
        setState('error');
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError('file_too_large');
        setState('error');
        return;
      }

      setSource(inputSource);
      setFileSizeKb(Math.round(file.size / 1024));
      setState('capturing');

      try {
        // Resize and convert image
        const resizedBlob = await resizeImage(file);
        processedBlobRef.current = resizedBlob;

        // Create preview URL
        cleanupPreview();
        const url = URL.createObjectURL(resizedBlob);
        setPreviewUrl(url);

        // Encode as base64 now so submit is instant
        const base64 = await blobToBase64(resizedBlob);
        setImageBase64(base64);

        setState('preview');
      } catch (err) {
        console.error('Image processing error:', err);
        setError('camera_failed');
        setState('error');
      }
    },
    [cleanupPreview],
  );

  // Process image with AI
  const processImage = useCallback(async () => {
    if (!processedBlobRef.current) {
      setError('processing_failed');
      setState('error');
      return;
    }

    setState('processing');

    try {
      // Create FormData with image
      const formData = new FormData();
      formData.append('image', processedBlobRef.current, 'image.webp');

      const result = await describeImage(formData);

      if (result.success) {
        setDescription(result.description);
        setSubjects(result.subjects);
        setIsChildDrawing(result.isChildDrawing);
        setState('complete');
      } else {
        setError('processing_failed');
        setState('error');
      }
    } catch (err) {
      console.error('Image description error:', err);
      setError('processing_failed');
      setState('error');
    }
  }, []);

  return {
    state,
    previewUrl,
    imageBase64,
    description,
    subjects,
    isChildDrawing,
    error,
    source,
    fileSizeKb,
    openCamera,
    openFilePicker,
    processImage,
    clearImage,
    reset,
    cameraInputRef,
    fileInputRef,
    handleFileChange,
  };
}

export default useImageInput;
