"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { ColoringImage } from "@one-colored-pixel/db/types";
import { faImage } from "@fortawesome/pro-solid-svg-icons";
import { ActionButton } from "@one-colored-pixel/coloring-ui";
import { pdf } from "@react-pdf/renderer";
import ColoringPageDocument from "@/components/pdfs/ColoringPageDocument/ColoringPageDocument";
import { trackEvent } from "@/utils/analytics-client";
import { TRACKING_EVENTS } from "@/constants";
import { fetchSvg } from "@one-colored-pixel/canvas";
import { proxyR2Url } from "@/utils/proxyR2Url";

const formatTitleForFileName = (title: string | undefined): string => {
  if (!title) {
    return "coloring-habitat";
  }

  return `${title.toLowerCase().replace(/\s+/g, "-")}-coloring-page.pdf`;
};

type SaveButtonProps = {
  coloringImage: Partial<ColoringImage>;
  getCanvasDataUrl?: () => string | null;
  className?: string;
};

type GeneratingState = "idle" | "generating" | "error";

const DownloadPDFButtonContent = ({
  coloringImage,
  getCanvasDataUrl,
  className,
}: SaveButtonProps) => {
  const t = useTranslations("downloadPDFButton");
  const [imageSvg, setImageSvg] = useState<string | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingState, setGeneratingState] =
    useState<GeneratingState>("idle");

  // Fetch SVG data in the parent component (where hooks are supported)
  useEffect(() => {
    if (!coloringImage?.svgUrl || !coloringImage?.qrCodeUrl) {
      setError("Missing SVG URLs");
      setIsLoading(false);
      return;
    }

    const loadSvgs = async () => {
      try {
        const [imageSvgData, qrCodeSvgData] = await Promise.all([
          fetchSvg(proxyR2Url(coloringImage.svgUrl as string)),
          fetchSvg(proxyR2Url(coloringImage.qrCodeUrl as string)),
        ]);
        setImageSvg(imageSvgData);
        setQrCodeSvg(qrCodeSvgData);
        setIsLoading(false);
      } catch (err) {
        setError("Failed to load SVGs");
        setIsLoading(false);
      }
    };

    loadSvgs();
  }, [coloringImage?.svgUrl, coloringImage?.qrCodeUrl]);

  // Generate PDF on-demand when clicked (captures fresh canvas data at click time)
  const handlePrint = useCallback(async () => {
    if (!imageSvg || !qrCodeSvg) return;

    setGeneratingState("generating");

    try {
      // Capture fresh canvas data at click time (not at render time!)
      // This is the key fix - getCanvasDataUrl is called when user clicks,
      // so we get the current colored state, not stale/empty data
      const coloredImageDataUrl = getCanvasDataUrl?.() || null;

      trackEvent(TRACKING_EVENTS.DOWNLOAD_PDF_CLICKED, {
        coloringImageId: coloringImage.id as string,
        title: coloringImage.title,
      });

      // Create PDF document with current canvas state
      const doc = (
        <ColoringPageDocument
          imageSvg={imageSvg}
          qrCodeSvg={qrCodeSvg}
          coloringImageId={coloringImage.id || ""}
          coloredImageDataUrl={coloredImageDataUrl}
        />
      );

      // Generate PDF blob on-demand
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      // Trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = formatTitleForFileName(coloringImage.title);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      URL.revokeObjectURL(url);
      setGeneratingState("idle");
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      setGeneratingState("error");
      // Reset error state after 2 seconds
      setTimeout(() => setGeneratingState("idle"), 2000);
    }
  }, [imageSvg, qrCodeSvg, coloringImage, getCanvasDataUrl]);

  if (!coloringImage) {
    return null;
  }

  if (isLoading) {
    return (
      <ActionButton
        size="compact"
        tone="accent"
        icon={faImage}
        label={t("loading")}
        disabled
        className={className}
      />
    );
  }

  if (error || !imageSvg || !qrCodeSvg) {
    return (
      <ActionButton
        size="compact"
        tone="accent"
        icon={faImage}
        label={t("error")}
        disabled
        className={className}
      />
    );
  }

  if (generatingState === "generating") {
    return (
      <ActionButton
        size="compact"
        tone="accent"
        icon={faImage}
        label={t("creating")}
        disabled
        className={className}
      />
    );
  }

  if (generatingState === "error") {
    return (
      <ActionButton
        size="compact"
        tone="accent"
        icon={faImage}
        label={t("error")}
        disabled
        className={className}
      />
    );
  }

  return (
    <ActionButton
      size="compact"
      tone="accent"
      icon={faImage}
      label={t("idle")}
      onClick={handlePrint}
      className={className}
    />
  );
};

// @react-pdf/renderer uses browser APIs during render, so we need to prevent server-side rendering
const DownloadPDFButton = dynamic(
  () => Promise.resolve(DownloadPDFButtonContent),
  { ssr: false },
);

export default DownloadPDFButton;
