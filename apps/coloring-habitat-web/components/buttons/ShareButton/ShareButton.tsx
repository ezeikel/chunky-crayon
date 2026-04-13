"use client";

import { useState, useCallback } from "react";
import { faShare, faSpinner, faCheck } from "@fortawesome/pro-solid-svg-icons";
import { ActionButton } from "@one-colored-pixel/coloring-ui";
import { uploadArtworkForSharing } from "@/app/actions/share-artwork";

type ShareButtonProps = {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  getCanvasDataUrl?: () => string | null;
  className?: string;
};

type ShareState = "idle" | "uploading" | "done";

const ShareButton = ({
  url,
  title,
  description,
  getCanvasDataUrl,
  className,
}: ShareButtonProps) => {
  const [state, setState] = useState<ShareState>("idle");

  const handleShare = useCallback(async () => {
    if (getCanvasDataUrl) {
      setState("uploading");
      const dataUrl = getCanvasDataUrl();
      if (dataUrl) {
        await uploadArtworkForSharing(dataUrl);
      }
    }

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
      <ActionButton
        size="compact"
        tone="accent"
        icon={faSpinner}
        label="Preparing..."
        disabled
        className={className}
      />
    );
  }

  if (state === "done") {
    return (
      <ActionButton
        size="compact"
        tone="success"
        icon={faCheck}
        label="Link Copied"
        disabled
        className={className}
      />
    );
  }

  return (
    <ActionButton
      size="compact"
      tone="accent"
      icon={faShare}
      label="Share"
      onClick={handleShare}
      className={className}
    />
  );
};

export default ShareButton;
