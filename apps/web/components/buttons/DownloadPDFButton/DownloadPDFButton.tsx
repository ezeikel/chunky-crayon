'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ColoringImage } from '@chunky-crayon/db/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint } from '@fortawesome/pro-solid-svg-icons';
import { usePDF } from '@react-pdf/renderer';
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
  className?: string;
};

// Kid-friendly button: big, colorful, clear language
// Responsive: icon-only on mobile (44px touch target), icon+text on desktop
const buttonClassName =
  'flex items-center justify-center gap-x-2 md:gap-x-3 text-white font-bold text-base md:text-lg size-11 md:size-auto md:px-8 md:py-4 rounded-full shadow-lg bg-crayon-orange hover:bg-crayon-orange-dark active:scale-95 transition-all duration-150';

// Inner component that renders the PDF once all data is ready
// This avoids the "Cannot read properties of null" error by only calling usePDF
// when we have a valid document to render
const PDFDownloadReady = ({
  imageSvg,
  qrCodeSvg,
  coloringImage,
  className,
}: {
  imageSvg: string;
  qrCodeSvg: string;
  coloringImage: Partial<ColoringImage>;
  className?: string;
}) => {
  // Memoize the document to prevent unnecessary re-renders
  const document = useMemo(
    () => (
      <ColoringPageDocument
        imageSvg={imageSvg}
        qrCodeSvg={qrCodeSvg}
        coloringImageId={coloringImage.id || ''}
      />
    ),
    [imageSvg, qrCodeSvg, coloringImage.id],
  );

  const [instance] = usePDF({ document });

  if (instance.loading) {
    return (
      <button
        className={cn(buttonClassName, 'opacity-60 cursor-wait', className)}
        disabled
        type="button"
      >
        <FontAwesomeIcon
          icon={faPrint}
          className="text-xl md:text-2xl animate-pulse"
        />
        <span className="hidden md:inline">Loading...</span>
      </button>
    );
  }

  if (instance.error) {
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
        <FontAwesomeIcon icon={faPrint} className="text-xl md:text-2xl" />
        <span className="hidden md:inline">Oops!</span>
      </button>
    );
  }

  return (
    <a
      href={instance.url || '#'}
      download={formatTitleForFileName(coloringImage.title)}
      className={cn(buttonClassName, className)}
      onClick={() => {
        trackEvent(TRACKING_EVENTS.DOWNLOAD_PDF_CLICKED, {
          coloringImageId: coloringImage.id as string,
          title: coloringImage.title,
        });
      }}
    >
      <FontAwesomeIcon icon={faPrint} className="text-xl md:text-2xl" />
      <span className="hidden md:inline">Print</span>
    </a>
  );
};

const DownloadPDFButtonContent = ({
  coloringImage,
  className,
}: SaveButtonProps) => {
  const [imageSvg, setImageSvg] = useState<string | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          icon={faPrint}
          className="text-xl md:text-2xl animate-pulse"
        />
        <span className="hidden md:inline">Loading...</span>
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
        <FontAwesomeIcon icon={faPrint} className="text-xl md:text-2xl" />
        <span className="hidden md:inline">Oops!</span>
      </button>
    );
  }

  // Only render the PDF component when all data is ready
  return (
    <PDFDownloadReady
      imageSvg={imageSvg}
      qrCodeSvg={qrCodeSvg}
      coloringImage={coloringImage}
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
