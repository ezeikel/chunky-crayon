"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { faHeart, faSpinner, faCheck } from "@fortawesome/free-solid-svg-icons";
import { ActionButton } from "@one-colored-pixel/coloring-ui";
import { saveArtworkToGallery } from "@/app/actions/saved-artwork";
import { cn } from "@/lib/utils";

type SaveToGalleryButtonProps = {
  coloringImageId: string;
  getCanvasDataUrl: () => string | null;
  className?: string;
};

type SaveState = "idle" | "saving" | "success" | "error";

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
      <ActionButton
        size="compact"
        tone="accent"
        icon={faSpinner}
        label={t("saving")}
        disabled
        className={className}
      />
    );
  }

  if (state === "success") {
    return (
      <ActionButton
        size="compact"
        tone="success"
        icon={faCheck}
        label={t("saved")}
        disabled
        className={className}
      />
    );
  }

  if (state === "error") {
    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <ActionButton
          size="compact"
          tone="accent"
          icon={faHeart}
          label={t("tryAgain")}
          onClick={handleSave}
        />
        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
      </div>
    );
  }

  return (
    <ActionButton
      size="compact"
      tone="accent"
      icon={faHeart}
      label={t("idle")}
      onClick={handleSave}
      className={className}
    />
  );
};

export default SaveToGalleryButton;
