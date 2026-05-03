'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { ColoringImage } from '@one-colored-pixel/db/types';
import { faPrint } from '@fortawesome/pro-duotone-svg-icons';
import { ActionButton } from '@one-colored-pixel/coloring-ui';
import { pdf } from '@react-pdf/renderer';
import ColoringPageDocument from '@/components/pdfs/ColoringPageDocument/ColoringPageDocument';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import { fetchSvg } from '@one-colored-pixel/canvas';
import { proxyR2Url } from '@/utils/proxyR2Url';

// Print = open the same A4 PDF the Save button generates in a new
// window and trigger the browser's native print dialog. On iOS this
// surfaces AirPrint; on desktop it's the standard system print
// sheet. We pre-open the window inside the click handler (with
// about:blank) so popup blockers don't kill it during the async PDF
// generation; once the blob is ready we point the window at it.

type PrintButtonProps = {
  coloringImage: Partial<ColoringImage>;
  getCanvasDataUrl?: () => string | null;
  className?: string;
};

type PrintingState = 'idle' | 'preparing' | 'error';

const PrintButtonContent = ({
  coloringImage,
  getCanvasDataUrl,
  className,
}: PrintButtonProps) => {
  const t = useTranslations('printButton');
  const [imageSvg, setImageSvg] = useState<string | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printingState, setPrintingState] = useState<PrintingState>('idle');

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

  const handlePrint = useCallback(async () => {
    if (!imageSvg || !qrCodeSvg) return;

    // Open the popup synchronously inside the click so iOS Safari +
    // strict popup blockers don't block it. The PDF generation that
    // follows is async; if we opened the window after, it'd be
    // attributed to a non-user-gesture and get blocked.
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setPrintingState('error');
      setTimeout(() => setPrintingState('idle'), 2000);
      return;
    }

    setPrintingState('preparing');

    try {
      const coloredImageDataUrl = getCanvasDataUrl?.() || null;

      trackEvent(TRACKING_EVENTS.PRINT_CLICKED, {
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

      // Point the pre-opened window at the PDF blob and call print()
      // once it's loaded. setTimeout gives browsers a tick after
      // navigation before print() sees the embedded PDF.
      printWindow.location.href = url;
      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch {
            // print() can throw on some embedded PDF viewers; the
            // user can still trigger Cmd+P / browser-menu print.
          }
        }, 500);
      };

      // Revoke the blob URL after a delay long enough for the print
      // dialog to capture the document. Revoking immediately breaks
      // print on Chrome.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      setPrintingState('idle');
    } catch (err) {
      console.error('Failed to prepare print PDF:', err);
      printWindow.close();
      setPrintingState('error');
      setTimeout(() => setPrintingState('idle'), 2000);
    }
  }, [imageSvg, qrCodeSvg, coloringImage, getCanvasDataUrl]);

  if (!coloringImage) return null;

  if (isLoading) {
    return (
      <ActionButton
        size="tile"
        tone="tool"
        icon={faPrint}
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
        tone="tool"
        icon={faPrint}
        label={t('error')}
        disabled
        className={className}
      />
    );
  }

  if (printingState === 'preparing') {
    return (
      <ActionButton
        size="tile"
        tone="tool"
        icon={faPrint}
        label={t('printing')}
        disabled
        className={className}
      />
    );
  }

  if (printingState === 'error') {
    return (
      <ActionButton
        size="tile"
        tone="tool"
        icon={faPrint}
        label={t('error')}
        disabled
        className={className}
      />
    );
  }

  return (
    <ActionButton
      size="tile"
      tone="tool"
      icon={faPrint}
      label={t('idle')}
      onClick={handlePrint}
      className={className}
    />
  );
};

const PrintButton = dynamic(() => Promise.resolve(PrintButtonContent), {
  ssr: false,
});

export default PrintButton;
