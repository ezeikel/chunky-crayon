"use client";

import { useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShare, faSpinner, faCheck } from "@fortawesome/pro-solid-svg-icons";
import { uploadArtworkForSharing } from "@/app/actions/share-artwork";
import cn from "@/utils/cn";

type ShareButtonProps = {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  getCanvasDataUrl?: () => string | null;
  className?: string;
};

type ShareState = "idle" | "uploading" | "done";

const buttonClassName =
  "flex items-center justify-center gap-x-2 md:gap-x-3 text-white font-bold text-base md:text-lg size-11 md:size-auto md:px-8 md:py-4 rounded-full shadow-lg bg-primary hover:bg-primary/90 active:scale-95 transition-all duration-150";

const ShareButton = ({
  url,
  title,
  description,
  getCanvasDataUrl,
  className,
}: ShareButtonProps) => {
  const [state, setState] = useState<ShareState>("idle");

  const handleShare = useCallback(async () => {
    let shareImageUrl: string | undefined;

    // Upload colored artwork if available
    if (getCanvasDataUrl) {
      setState("uploading");
      const dataUrl = getCanvasDataUrl();
      if (dataUrl) {
        const result = await uploadArtworkForSharing(dataUrl);
        if (result.success) {
          shareImageUrl = result.imageUrl;
        }
      }
    }

    // Use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || title,
          url,
        });
      } catch {
        // User cancelled or share failed — not an error
      }
    } else {
      // Fallback: copy link to clipboard
      try {
        await navigator.clipboard.writeText(url);
        setState("done");
        setTimeout(() => setState("idle"), 2000);
        return;
      } catch {
        // Clipboard failed silently
      }
    }

    setState("idle");
  }, [url, title, description, getCanvasDataUrl]);

  if (state === "uploading") {
    return (
      <button
        type="button"
        disabled
        className={cn(buttonClassName, "cursor-wait opacity-80", className)}
      >
        <FontAwesomeIcon
          icon={faSpinner}
          className="text-xl md:text-2xl animate-spin"
        />
        <span className="hidden md:inline">Preparing...</span>
      </button>
    );
  }

  if (state === "done") {
    return (
      <button
        type="button"
        disabled
        className={cn(buttonClassName, "opacity-80", className)}
      >
        <FontAwesomeIcon icon={faCheck} className="text-xl md:text-2xl" />
        <span className="hidden md:inline">Link Copied</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(buttonClassName, className)}
    >
      <FontAwesomeIcon icon={faShare} className="text-xl md:text-2xl" />
      <span className="hidden md:inline">Share</span>
    </button>
  );
};

export default ShareButton;
