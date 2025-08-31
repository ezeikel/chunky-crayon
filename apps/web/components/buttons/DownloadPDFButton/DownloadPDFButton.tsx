'use client';

import dynamic from 'next/dynamic';
import { ColoringImage } from '@prisma/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileArrowDown } from '@fortawesome/pro-regular-svg-icons';
import { usePDF } from '@react-pdf/renderer';
import ColoringPageDocument from '@/components/pdfs/ColoringPageDocument/ColoringPageDocument';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics';
import { ANALYTICS_EVENTS } from '@/constants';

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

const DownloadPDFButtonContent = ({
  coloringImage,
  className,
}: SaveButtonProps) => {
  const [instance] = usePDF({
    document: <ColoringPageDocument coloringImage={coloringImage} />,
  });

  if (!coloringImage) {
    return null;
  }

  if (instance.loading) {
    return (
      <button
        className={cn(
          'flex items-center justify-center gap-x-4 text-black font-normal px-4 py-2 rounded-lg shadow-lg bg-white',
          {
            [className as string]: !!className,
          },
        )}
        disabled
        type="button"
      >
        Loading...
      </button>
    );
  }

  if (instance.error) {
    return (
      <button
        className={cn(
          'flex items-center justify-center gap-x-4 text-black font-normal px-4 py-2 rounded-lg shadow-lg bg-white',
          {
            [className as string]: !!className,
          },
        )}
        disabled
        type="button"
      >
        Error
      </button>
    );
  }

  return (
    <a
      href={instance.url || '#'}
      download={formatTitleForFileName(coloringImage.title)}
      className={cn(
        'flex items-center justify-center gap-x-4 text-black font-normal px-4 py-2 rounded-lg shadow-lg bg-white',
        {
          [className as string]: !!className,
        },
      )}
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

// @react-pdf/renderer uses browser APIs during render, so we need to prevent server-side rendering
const DownloadPDFButton = dynamic(
  () => Promise.resolve(DownloadPDFButtonContent),
  { ssr: false },
);

export default DownloadPDFButton;
