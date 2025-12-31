'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { ColoringImage } from '@chunky-crayon/db/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage } from '@fortawesome/pro-solid-svg-icons';
import { pdf } from '@react-pdf/renderer';
import ColoringPageDocument from '@/components/pdfs/ColoringPageDocument/ColoringPageDocument';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import fetchSvg from '@/utils/fetchSvg';

const formatTitleForFileName = (title: string | undefined): string => {
  if (!title) {
    return 'chunky-crayon';
  }

  return `${title.toLowerCase().replace(/\s+/g, '-')}-coloring-page.pdf`;
};

type SaveButtonProps = {
  coloringImage: Partial<ColoringImage>;
  getCanvasDataUrl?: () => string | null;
  className?: string;
};

// Kid-friendly button: big, colorful, clear language
// Responsive: icon-only on mobile (44px touch target), icon+text on desktop
const buttonClassName =
  'flex items-center justify-center gap-x-2 md:gap-x-3 text-white font-bold text-base md:text-lg size-11 md:size-auto md:px-8 md:py-4 rounded-full shadow-lg bg-crayon-orange hover:bg-crayon-orange-dark active:scale-95 transition-all duration-150';

type GeneratingState = 'idle' | 'generating' | 'error';

const DownloadPDFButtonContent = ({
  coloringImage,
  getCanvasDataUrl,
  className,
}: SaveButtonProps) => {
  const t = useTranslations('downloadPDFButton');
  const [imageSvg, setImageSvg] = useState<string | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingState, setGeneratingState] =
    useState<GeneratingState>('idle');

  // Fetch SVG data in the parent component (where hooks are supported)
  useEffect(() => {
    if (!coloringImage?.svgUrl || !coloringImage?.qrCodeUrl) {
      setError('Missing SVG URLs');
      setIsLoading(false);
      return;
    }

    const loadSvgs = async () => {
      try {
        const [imageSvgData, qrCodeSvgData] = await Promise.all([
          fetchSvg(coloringImage.svgUrl as string),
          fetchSvg(coloringImage.qrCodeUrl as string),
        ]);
        setImageSvg(imageSvgData);
        setQrCodeSvg(qrCodeSvgData);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load SVGs');
        setIsLoading(false);
      }
    };

    loadSvgs();
  }, [coloringImage?.svgUrl, coloringImage?.qrCodeUrl]);

  // Generate PDF on-demand when clicked (captures fresh canvas data at click time)
  const handlePrint = useCallback(async () => {
    if (!imageSvg || !qrCodeSvg) return;

    setGeneratingState('generating');

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
          coloringImageId={coloringImage.id || ''}
          coloredImageDataUrl={coloredImageDataUrl}
        />
      );

      // Generate PDF blob on-demand
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = formatTitleForFileName(coloringImage.title);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      URL.revokeObjectURL(url);
      setGeneratingState('idle');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setGeneratingState('error');
      // Reset error state after 2 seconds
      setTimeout(() => setGeneratingState('idle'), 2000);
    }
  }, [imageSvg, qrCodeSvg, coloringImage, getCanvasDataUrl]);

  if (!coloringImage) {
    return null;
  }

  if (isLoading) {
    return (
      <button
        className={cn(buttonClassName, 'opacity-60 cursor-wait', className)}
        disabled
        type="button"
      >
        <FontAwesomeIcon
          icon={faImage}
          className="text-xl md:text-2xl animate-pulse"
        />
        <span className="hidden md:inline">{t('loading')}</span>
      </button>
    );
  }

  if (error || !imageSvg || !qrCodeSvg) {
    return (
      <button
        className={cn(
          buttonClassName,
          'opacity-60 cursor-not-allowed',
          className,
        )}
        disabled
        type="button"
      >
        <FontAwesomeIcon icon={faImage} className="text-xl md:text-2xl" />
        <span className="hidden md:inline">{t('error')}</span>
      </button>
    );
  }

  if (generatingState === 'generating') {
    return (
      <button
        className={cn(buttonClassName, 'opacity-60 cursor-wait', className)}
        disabled
        type="button"
      >
        <FontAwesomeIcon
          icon={faImage}
          className="text-xl md:text-2xl animate-pulse"
        />
        <span className="hidden md:inline">{t('creating')}</span>
      </button>
    );
  }

  if (generatingState === 'error') {
    return (
      <button
        className={cn(
          buttonClassName,
          'opacity-60 cursor-not-allowed',
          className,
        )}
        disabled
        type="button"
      >
        <FontAwesomeIcon icon={faImage} className="text-xl md:text-2xl" />
        <span className="hidden md:inline">{t('error')}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className={cn(buttonClassName, className)}
    >
      <FontAwesomeIcon icon={faImage} className="text-xl md:text-2xl" />
      <span className="hidden md:inline">{t('idle')}</span>
    </button>
  );
};

// @react-pdf/renderer uses browser APIs during render, so we need to prevent server-side rendering
const DownloadPDFButton = dynamic(
  () => Promise.resolve(DownloadPDFButtonContent),
  { ssr: false },
);

export default DownloadPDFButton;
