'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { ColoringImage } from '@one-colored-pixel/db/types';
import { faFloppyDisk } from '@fortawesome/pro-solid-svg-icons';
import { ActionButton } from '@one-colored-pixel/coloring-ui';
import { pdf } from '@react-pdf/renderer';
import ColoringPageDocument from '@/components/pdfs/ColoringPageDocument/ColoringPageDocument';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import { fetchSvg } from '@one-colored-pixel/canvas';
import { proxyR2Url } from '@/utils/proxyR2Url';

// Save = download the coloring page as a PDF to disk. Mirror of the
// old DownloadPDFButton, renamed + re-iconed (faFloppyDisk) so it
// reads as "save to your device" instead of the misleading "print"
// icon on the previous component. Print is a separate button now;
// see PrintButton.

const formatTitleForFileName = (title: string | undefined): string => {
  if (!title) return 'chunky-crayon';
  return `${title.toLowerCase().replace(/\s+/g, '-')}-coloring-page.pdf`;
};

type SaveButtonProps = {
  coloringImage: Partial<ColoringImage>;
  getCanvasDataUrl?: () => string | null;
  className?: string;
};

type GeneratingState = 'idle' | 'generating' | 'error';

const SaveButtonContent = ({
  coloringImage,
  getCanvasDataUrl,
  className,
}: SaveButtonProps) => {
  const t = useTranslations('saveButton');
  const [imageSvg, setImageSvg] = useState<string | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingState, setGeneratingState] =
    useState<GeneratingState>('idle');

  useEffect(() => {
    if (!coloringImage?.svgUrl || !coloringImage?.qrCodeUrl) {
      setError('Missing SVG URLs');
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
        setError('Failed to load SVGs');
        setIsLoading(false);
      }
    };

    loadSvgs();
  }, [coloringImage?.svgUrl, coloringImage?.qrCodeUrl]);

  const handleSave = useCallback(async () => {
    if (!imageSvg || !qrCodeSvg) return;

    setGeneratingState('generating');

    try {
      // Capture fresh canvas state at click time so the PDF includes
      // any colour the user has applied since this component mounted.
      const coloredImageDataUrl = getCanvasDataUrl?.() || null;

      trackEvent(TRACKING_EVENTS.DOWNLOAD_PDF_CLICKED, {
        coloringImageId: coloringImage.id as string,
        title: coloringImage.title,
      });

      const doc = (
        <ColoringPageDocument
          imageSvg={imageSvg}
          qrCodeSvg={qrCodeSvg}
          coloringImageId={coloringImage.id || ''}
          coloredImageDataUrl={coloredImageDataUrl}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = formatTitleForFileName(coloringImage.title);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      setGeneratingState('idle');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setGeneratingState('error');
      setTimeout(() => setGeneratingState('idle'), 2000);
    }
  }, [imageSvg, qrCodeSvg, coloringImage, getCanvasDataUrl]);

  if (!coloringImage) return null;

  if (isLoading) {
    return (
      <ActionButton
        size="tile"
        tone="secondary"
        icon={faFloppyDisk}
        label={t('loading')}
        disabled
        className={className}
      />
    );
  }

  if (error || !imageSvg || !qrCodeSvg) {
    return (
      <ActionButton
        size="tile"
        tone="secondary"
        icon={faFloppyDisk}
        label={t('error')}
        disabled
        className={className}
      />
    );
  }

  if (generatingState === 'generating') {
    return (
      <ActionButton
        size="tile"
        tone="secondary"
        icon={faFloppyDisk}
        label={t('saving')}
        disabled
        className={className}
      />
    );
  }

  if (generatingState === 'error') {
    return (
      <ActionButton
        size="tile"
        tone="secondary"
        icon={faFloppyDisk}
        label={t('error')}
        disabled
        className={className}
      />
    );
  }

  return (
    <ActionButton
      size="tile"
      tone="accent"
      icon={faFloppyDisk}
      label={t('idle')}
      onClick={handleSave}
      className={className}
    />
  );
};

// @react-pdf/renderer uses browser APIs so we can't SSR this.
const SaveButton = dynamic(() => Promise.resolve(SaveButtonContent), {
  ssr: false,
});

export default SaveButton;
