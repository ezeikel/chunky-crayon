'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ColoringImage } from '@chunky-crayon/db/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileArrowDown } from '@fortawesome/pro-regular-svg-icons';
import { usePDF } from '@react-pdf/renderer';
import ColoringPageDocument from '@/components/pdfs/ColoringPageDocument/ColoringPageDocument';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics';
import { ANALYTICS_EVENTS } from '@/constants';
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

const buttonClassName =
  'flex items-center justify-center gap-x-4 text-black font-normal px-4 py-2 rounded-lg shadow-lg bg-white';

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
      <button className={cn(buttonClassName, className)} disabled type="button">
        Loading...
      </button>
    );
  }

  if (instance.error) {
    return (
      <button className={cn(buttonClassName, className)} disabled type="button">
        Error
      </button>
    );
  }

  return (
    <a
      href={instance.url || '#'}
      download={formatTitleForFileName(coloringImage.title)}
      className={cn(buttonClassName, className)}
      onClick={() =>
        trackEvent(ANALYTICS_EVENTS.CLICKED_SAVE_COLORING_IMAGE, {
          id: coloringImage.id as string,
        })
      }
    >
      Download PDF
      <FontAwesomeIcon icon={faFileArrowDown} className="text-3xl text-black" />
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
      <button className={cn(buttonClassName, className)} disabled type="button">
        Loading...
      </button>
    );
  }

  if (error || !imageSvg || !qrCodeSvg) {
    return (
      <button className={cn(buttonClassName, className)} disabled type="button">
        Error
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
