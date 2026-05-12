'use client';

import { useCallback, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faSpinnerThird } from '@fortawesome/pro-duotone-svg-icons';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import { EMAIL_CAPTURE_PROMPT_EVENT } from '@/components/EmailCaptureModal/EmailCaptureModal';

// Always-visible download icon overlay on every gallery card. Tap →
// single-page PDF for that image. Skips the detail-page detour.
//
// Sits INSIDE the card's parent <Link>, so the click handler must stop
// propagation + prevent the link nav. Then we trigger the download via
// programmatic navigation (window.location). Tried `<a download>` inside
// the Link first — Next.js' Link sometimes intercepts the tap anyway, so
// being explicit is more reliable.
//
// PostHog event fires immediately; the actual PDF render is server-side
// and gets its own COMPLETED event there.

type GalleryCardDownloadButtonProps = {
  /** Coloring image id — used to build the PDF URL. */
  coloringImageId: string;
  /** Optional path the user is downloading from (e.g. the landing slug)
   * so PostHog can attribute conversions to the right surface. */
  fromPath?: string;
};

const GalleryCardDownloadButton = ({
  coloringImageId,
  fromPath,
}: GalleryCardDownloadButtonProps) => {
  const [pending, setPending] = useState(false);

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (pending) return;
      setPending(true);

      trackEvent(TRACKING_EVENTS.GALLERY_CARD_DOWNLOAD_CLICKED, {
        coloringImageId,
        fromPath,
      });

      // Ask the email-capture modal to consider opening (modal handles
      // eligibility + delay internally).
      document.dispatchEvent(new CustomEvent(EMAIL_CAPTURE_PROMPT_EVENT));

      // Programmatic nav to the PDF endpoint. The Content-Disposition
      // header serves it as a download instead of navigating away.
      window.location.href = `/api/coloring-images/${coloringImageId}/pdf`;

      // Re-enable the button after a short delay in case the user
      // doesn't actually leave the page (download flow keeps current
      // tab open).
      setTimeout(() => setPending(false), 3000);
    },
    [coloringImageId, fromPath, pending],
  );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Download this coloring page as a PDF"
      className="absolute top-2 right-2 size-9 rounded-full bg-white/95 backdrop-blur shadow-md hover:scale-110 hover:bg-white transition flex items-center justify-center z-10"
    >
      <FontAwesomeIcon
        icon={pending ? faSpinnerThird : faDownload}
        className={`text-base text-crayon-orange ${
          pending ? 'animate-spin' : ''
        }`}
      />
    </button>
  );
};

export default GalleryCardDownloadButton;
