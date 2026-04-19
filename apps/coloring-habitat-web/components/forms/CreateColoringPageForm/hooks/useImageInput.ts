"use client";

import { useState, useRef, useCallback } from "react";
import { describeImage } from "@/app/actions/input-processing";

// =============================================================================
// Types
// =============================================================================

export type ImageInputState =
  | "idle"
  | "capturing"
  | "preview"
  | "processing"
  | "complete"
  | "error";

export type ImageInputError =
  | "file_too_large"
  | "invalid_type"
  | "processing_failed"
  | "camera_failed"
  | "heic_unsupported";

export type ImageInputSource = "camera" | "file_picker";

export type ImageInputResult = {
  state: ImageInputState;
  previewUrl: string | null;
  imageBase64: string | null;
  description: string | null;
  subjects: string[];
  isChildDrawing: boolean;
  error: ImageInputError | null;
  source: ImageInputSource | null;
  fileSizeKb: number;
  openCamera: () => void;
  openFilePicker: () => void;
  processImage: () => Promise<void>;
  clearImage: () => void;
  reset: () => void;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
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
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const HEIC_TYPES = ["image/heic", "image/heif"];

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
              reject(new Error("Could not create image blob"));
            }
          },
          "image/jpeg",
          0.85,
        );
      },
      "image/webp",
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
    imageOrientation: "from-image",
    premultiplyAlpha: "default",
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

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas context");
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
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(blob);
  });

export function useImageInput(): ImageInputResult {
  const [state, setState] = useState<ImageInputState>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isChildDrawing, setIsChildDrawing] = useState(false);
  const [error, setError] = useState<ImageInputError | null>(null);
  const [source, setSource] = useState<ImageInputSource | null>(null);
  const [fileSizeKb, setFileSizeKb] = useState(0);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedBlobRef = useRef<Blob | null>(null);

  const cleanupPreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  const reset = useCallback(() => {
    cleanupPreview();
    setState("idle");
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

  const clearImage = useCallback(() => {
    cleanupPreview();
    setState("idle");
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

  const openCamera = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (
      event: React.ChangeEvent<HTMLInputElement>,
      inputSource: ImageInputSource,
    ) => {
      const file = event.target.files?.[0];
      if (!file) return;

      event.target.value = "";

      // HEIC/HEIF can't be decoded by <canvas> on Chrome/Firefox/most mobile
      // webviews. Call it out explicitly instead of failing inside resize().
      const lowered = file.name.toLowerCase();
      if (
        HEIC_TYPES.includes(file.type) ||
        lowered.endsWith(".heic") ||
        lowered.endsWith(".heif")
      ) {
        setError("heic_unsupported");
        setState("error");
        return;
      }

      if (
        !ALLOWED_TYPES.includes(file.type) &&
        !file.type.startsWith("image/")
      ) {
        setError("invalid_type");
        setState("error");
        return;
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError("file_too_large");
        setState("error");
        return;
      }

      setSource(inputSource);
      setFileSizeKb(Math.round(file.size / 1024));
      setState("capturing");

      try {
        const resizedBlob = await resizeImage(file);
        processedBlobRef.current = resizedBlob;

        cleanupPreview();
        const url = URL.createObjectURL(resizedBlob);
        setPreviewUrl(url);

        const base64 = await blobToBase64(resizedBlob);
        setImageBase64(base64);

        setState("preview");
      } catch {
        setError("camera_failed");
        setState("error");
      }
    },
    [cleanupPreview],
  );

  const processImage = useCallback(async () => {
    if (!processedBlobRef.current) {
      setError("processing_failed");
      setState("error");
      return;
    }

    setState("processing");

    try {
      const formData = new FormData();
      formData.append("image", processedBlobRef.current, "image.webp");

      const result = await describeImage(formData);

      if (result.success) {
        setDescription(result.description);
        setSubjects(result.subjects);
        setIsChildDrawing(result.isChildDrawing);
        setState("complete");
      } else {
        setError("processing_failed");
        setState("error");
      }
    } catch {
      setError("processing_failed");
      setState("error");
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
