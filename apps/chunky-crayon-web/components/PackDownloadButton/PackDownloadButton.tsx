'use client';

import { useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/pro-duotone-svg-icons';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import { EMAIL_CAPTURE_PROMPT_EVENT } from '@/components/EmailCaptureModal/EmailCaptureModal';

// Primary CTA on /coloring-pages/[slug] landing pages. Click → server
// renders a 12-page printable PDF for the landing's tag-matched images
// and serves it as `application/pdf` with attachment disposition, so
// the browser saves to disk instead of trying to render in-tab.
//
// Anchor link (not button + JS) so it works without JS, opens in a new
// nav as a regular download, and screen readers + crawlers see a real
// link. The onClick is purely additive — fires PostHog event before the
// nav, doesn't preventDefault.

type PackDownloadButtonProps = {
  slug: string;
  title: string;
  pageCount: number;
};

const PackDownloadButton = ({
  slug,
  title,
  pageCount,
}: PackDownloadButtonProps) => {
  const onClick = useCallback(() => {
    trackEvent(TRACKING_EVENTS.LANDING_PACK_DOWNLOAD_CLICKED, {
      slug,
      title,
    });
    // Ask the email-capture modal to consider opening. The modal
    // decides whether to actually show based on its own cooldown +
    // captured-state logic. Delay is handled inside the modal so the
    // PDF download starts uninterrupted.
    document.dispatchEvent(new CustomEvent(EMAIL_CAPTURE_PROMPT_EVENT));
  }, [slug, title]);

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '0.5',
  } as React.CSSProperties;

  return (
    <a
      href={`/api/coloring-pages/${slug}/pack.pdf`}
      download={`${slug}.pdf`}
      onClick={onClick}
      className="inline-flex items-center gap-3 bg-btn-orange text-white font-tondo font-extrabold text-lg px-7 py-4 rounded-coloring-card shadow-btn-primary hover:scale-105 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-crayon-yellow"
    >
      <FontAwesomeIcon
        icon={faDownload}
        className="text-2xl"
        style={iconStyle}
      />
      Download {pageCount} free pages
    </a>
  );
};

export default PackDownloadButton;
