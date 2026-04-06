"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCamera,
  faImages,
  faRotateRight,
  faSpinner,
  faCheck,
  faCloudArrowUp,
} from "@fortawesome/free-solid-svg-icons";
import useUser from "@/hooks/useUser";
import { trackEvent } from "@/utils/analytics-client";
import { TRACKING_EVENTS } from "@/constants";
import { Button } from "@/components/ui/button";
import SubmitButton from "@/components/buttons/SubmitButton/SubmitButton";
import { cn } from "@/lib/utils";
import { useInputMode } from "./InputModeContext";
import { useImageInput } from "../hooks/useImageInput";

type ImageInputProps = {
  className?: string;
};

const ImageInput = ({ className }: ImageInputProps) => {
  const {
    canGenerate,
    blockedReason,
    hasActiveSubscription,
    handleAuthAction,
    isGuest,
    remainingGenerations,
  } = useUser();

  const { description, setDescription, setIsProcessing } = useInputMode();

  const {
    state,
    previewUrl,
    description: aiDescription,
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
  } = useImageInput();

  const [isDragging, setIsDragging] = useState(false);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (aiDescription) {
      setDescription(aiDescription);
    }
  }, [aiDescription, setDescription]);

  useEffect(() => {
    setIsProcessing(state === "processing");
  }, [state, setIsProcessing]);

  useEffect(() => {
    if (state === "preview" && source) {
      if (source === "camera") {
        trackEvent(TRACKING_EVENTS.IMAGE_INPUT_CAPTURED, { source: "camera" });
      } else {
        trackEvent(TRACKING_EVENTS.IMAGE_INPUT_UPLOADED, {
          fileType: "image",
          fileSizeKb,
        });
      }
    }
  }, [state, source, fileSizeKb]);

  useEffect(() => {
    if (state === "complete" && aiDescription && source) {
      trackEvent(TRACKING_EVENTS.IMAGE_INPUT_PROCESSED, {
        description: aiDescription,
        subjects,
        isChildDrawing,
      });
    }
  }, [state, aiDescription, subjects, isChildDrawing, source]);

  useEffect(() => {
    if (state === "complete" && aiDescription && submitButtonRef.current) {
      const timer = setTimeout(() => {
        submitButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state, aiDescription]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canInteract) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canInteract) return;
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const syntheticEvent = {
        target: { files: [file], value: "" },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(syntheticEvent, "file_picker");
    }
  };

  const handleRetry = () => reset();

  const canInteract = canGenerate;

  const getButtonConfig = () => {
    if (canGenerate) {
      if (isGuest) {
        return {
          text: `Create my page (${remainingGenerations} free left)`,
          isSubmit: true,
        };
      }
      return { text: "Create my page", isSubmit: true };
    }

    if (blockedReason === "guest_limit_reached") {
      return {
        text: "Sign up for free",
        action: () => {
          trackEvent(TRACKING_EVENTS.GUEST_SIGNUP_CLICKED, {
            location: "image_input",
          });
          handleAuthAction("signin");
        },
        subtext: "Create an account to unlock more creations",
        isSubmit: false,
      };
    }

    if (blockedReason === "no_credits") {
      return {
        text: hasActiveSubscription ? "Buy credits" : "View plans",
        action: () => handleAuthAction("billing"),
        subtext: hasActiveSubscription
          ? "Get more credits to keep creating"
          : "Subscribe for unlimited creativity",
        isSubmit: false,
      };
    }

    return {
      text: "Get started",
      action: () => handleAuthAction("signin"),
      subtext: "Sign in to start creating",
      isSubmit: false,
    };
  };

  const buttonConfig = getButtonConfig();

  // Error state
  if (state === "error") {
    const errorMessages: Record<string, string> = {
      file_too_large: "Image is too large. Please use an image under 10MB.",
      invalid_type:
        "Invalid image format. Please use JPEG, PNG, WebP, or HEIC.",
      processing_failed: "Couldn't process the image. Please try again.",
      camera_failed: "Camera failed. Please try uploading a photo instead.",
    };

    return (
      <div
        className={cn("flex flex-col items-center gap-4 py-8", className)}
        role="tabpanel"
        id="image-input-panel"
        aria-labelledby="image-mode-tab"
      >
        <p className="text-center text-foreground font-semibold">
          {errorMessages[error || "processing_failed"]}
        </p>
        <Button onClick={handleRetry} variant="outline">
          <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
          Try again
        </Button>
      </div>
    );
  }

  // Processing state
  if (state === "processing" || state === "capturing") {
    return (
      <div
        className={cn("flex flex-col items-center gap-4 py-8", className)}
        role="tabpanel"
        id="image-input-panel"
        aria-labelledby="image-mode-tab"
      >
        <FontAwesomeIcon
          icon={faSpinner}
          className="text-5xl animate-spin text-primary"
        />
        <p className="text-center text-foreground font-semibold">
          {state === "capturing"
            ? "Processing your photo..."
            : "Analyzing the image..."}
        </p>
      </div>
    );
  }

  // Preview state
  if (state === "preview" && previewUrl) {
    return (
      <div
        className={cn("flex flex-col items-center gap-4", className)}
        role="tabpanel"
        id="image-input-panel"
        aria-labelledby="image-mode-tab"
      >
        <p className="text-center text-foreground font-semibold">
          Great picture!
        </p>

        <div className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-lg border-2 border-primary">
          <Image
            src={previewUrl}
            alt="Image preview"
            fill
            className="object-cover"
          />
        </div>

        <div className="flex gap-3">
          <Button onClick={clearImage} variant="outline">
            <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
            Pick another
          </Button>
          <Button onClick={processImage}>
            <FontAwesomeIcon icon={faCheck} className="mr-2" />
            Use this
          </Button>
        </div>
      </div>
    );
  }

  // Complete state
  if (state === "complete" && aiDescription) {
    const isDescriptionReady = description.trim().length > 0;

    return (
      <div
        className={cn("flex flex-col items-center gap-5 py-4", className)}
        role="tabpanel"
        id="image-input-panel"
        aria-labelledby="image-mode-tab"
      >
        <div className="relative w-full max-w-xs">
          <div className="bg-background border border-border rounded-2xl p-3 pb-4 shadow-lg">
            {previewUrl && (
              <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3">
                <Image
                  src={previewUrl}
                  alt="Uploaded image"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <p className="text-center text-foreground text-base leading-relaxed">
              {isChildDrawing ? "✏️ " : "📸 "}
              <span className="font-bold">I see:</span> {aiDescription}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 mt-2">
          {buttonConfig.isSubmit ? (
            <SubmitButton
              ref={submitButtonRef}
              text="Create my coloring page"
              className="text-lg px-8 py-6 rounded-lg"
              disabled={!isDescriptionReady}
            />
          ) : (
            <Button
              onClick={buttonConfig.action}
              className="text-lg px-8 py-6 rounded-lg h-auto"
              type="button"
            >
              {buttonConfig.text}
            </Button>
          )}

          {buttonConfig.subtext && (
            <p className="text-sm text-center text-muted-foreground">
              {buttonConfig.subtext}
            </p>
          )}

          <button
            type="button"
            onClick={handleRetry}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Not quite right? Try again
          </button>
        </div>
      </div>
    );
  }

  // Idle state
  return (
    <div
      className={cn("flex flex-col items-center gap-6 py-4", className)}
      role="tabpanel"
      id="image-input-panel"
      aria-labelledby="image-mode-tab"
    >
      <p className="text-center text-foreground font-semibold text-lg">
        {canInteract
          ? "Take a photo or upload an image"
          : blockedReason === "guest_limit_reached"
            ? "You've used your free creations. Sign up to continue!"
            : blockedReason === "no_credits"
              ? "You've run out of credits."
              : "Sign in to upload"}
      </p>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange(e, "camera")}
        disabled={!canInteract}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, "file_picker")}
        disabled={!canInteract}
      />

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={openCamera}
          disabled={!canInteract}
          className={cn(
            "flex flex-col items-center justify-center gap-2",
            "w-28 h-28 rounded-2xl",
            "transition-all duration-200 ease-out",
            "focus:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-2",
            canInteract
              ? "bg-primary text-white hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
              : "bg-muted cursor-not-allowed text-muted-foreground",
          )}
          aria-label="Take a photo"
        >
          <FontAwesomeIcon icon={faCamera} className="text-3xl" />
          <span className="text-sm font-bold">Camera</span>
        </button>

        <button
          type="button"
          onClick={openFilePicker}
          disabled={!canInteract}
          className={cn(
            "flex flex-col items-center justify-center gap-2",
            "w-28 h-28 rounded-2xl",
            "transition-all duration-200 ease-out",
            "focus:outline-none focus-visible:ring-4 focus-visible:ring-accent focus-visible:ring-offset-2",
            canInteract
              ? "bg-accent text-white hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
              : "bg-muted cursor-not-allowed text-muted-foreground",
          )}
          aria-label="Upload an image"
        >
          <FontAwesomeIcon icon={faImages} className="text-3xl" />
          <span className="text-sm font-bold">Upload</span>
        </button>
      </div>

      {/* Drop zone for desktop */}
      {canInteract && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "w-full py-6 px-4 border-2 border-dashed rounded-xl",
            "transition-all duration-200",
            "flex flex-col items-center gap-2",
            isDragging
              ? "border-primary bg-primary/10 scale-[1.02]"
              : "border-border hover:border-primary/50",
          )}
        >
          <FontAwesomeIcon
            icon={faCloudArrowUp}
            className={cn(
              "text-2xl transition-colors",
              isDragging ? "text-primary" : "text-muted-foreground",
            )}
          />
          <p className="text-sm text-muted-foreground text-center">
            {isDragging ? "Drop it here!" : "or drag and drop an image"}
          </p>
        </div>
      )}

      <p className="text-sm text-muted-foreground text-center">
        Share a drawing, photo, or any image to transform
      </p>

      {!canInteract && (
        <>
          {!buttonConfig.isSubmit && (
            <Button onClick={buttonConfig.action} type="button">
              {buttonConfig.text}
            </Button>
          )}
          {buttonConfig.subtext && (
            <p className="text-sm text-center text-muted-foreground">
              {buttonConfig.subtext}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default ImageInput;
