"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faSpinner, faCheck } from "@fortawesome/free-solid-svg-icons";
import { saveArtworkToGallery } from "@/app/actions/saved-artwork";
import { cn } from "@/lib/utils";

type SaveToGalleryButtonProps = {
  coloringImageId: string;
  getCanvasDataUrl: () => string | null;
  className?: string;
};

type SaveState = "idle" | "saving" | "success" | "error";

const buttonClassName =
  "flex items-center justify-center gap-x-2 md:gap-x-3 text-white font-bold text-base md:text-lg size-11 md:size-auto md:px-8 md:py-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200";

const SaveToGalleryButton = ({
  coloringImageId,
  getCanvasDataUrl,
  className,
}: SaveToGalleryButtonProps) => {
  const t = useTranslations("saveToGallery");
  const [state, setState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setState("saving");
    setErrorMessage(null);

    try {
      const dataUrl = getCanvasDataUrl();
      if (!dataUrl) {
        setState("error");
        setErrorMessage(t("errors.captureArtwork"));
        return;
      }

      const result = await saveArtworkToGallery(coloringImageId, dataUrl);

      if (result.success) {
        setState("success");
        setTimeout(() => setState("idle"), 3000);
      } else {
        setState("error");
        setErrorMessage(result.error);
      }
    } catch {
      setState("error");
      setErrorMessage(t("errors.generic"));
    }
  }, [coloringImageId, getCanvasDataUrl]);

  if (state === "saving") {
    return (
      <button
        type="button"
        disabled
        className={cn(buttonClassName, "bg-primary cursor-wait", className)}
      >
        <FontAwesomeIcon
          icon={faSpinner}
          className="text-xl md:text-2xl animate-spin"
        />
        <span className="hidden md:inline">{t("saving")}</span>
      </button>
    );
  }

  if (state === "success") {
    return (
      <button
        type="button"
        disabled
        className={cn(buttonClassName, "bg-accent cursor-default", className)}
      >
        <FontAwesomeIcon icon={faCheck} className="text-xl md:text-2xl" />
        <span className="hidden md:inline">{t("saved")}</span>
      </button>
    );
  }

  if (state === "error") {
    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <button
          type="button"
          onClick={handleSave}
          className={cn(
            buttonClassName,
            "bg-primary hover:bg-primary/90 active:scale-95",
          )}
        >
          <FontAwesomeIcon icon={faHeart} className="text-xl md:text-2xl" />
          <span className="hidden md:inline">{t("tryAgain")}</span>
        </button>
        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      className={cn(
        buttonClassName,
        "bg-primary hover:bg-primary/90 active:scale-95",
        className,
      )}
    >
      <FontAwesomeIcon icon={faHeart} className="text-xl md:text-2xl" />
      <span className="hidden md:inline">{t("idle")}</span>
    </button>
  );
};

export default SaveToGalleryButton;
