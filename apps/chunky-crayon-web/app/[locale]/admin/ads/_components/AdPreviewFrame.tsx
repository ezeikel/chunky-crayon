'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/pro-duotone-svg-icons';

type AdPreviewFrameProps = {
  campaignKey: string;
};

// Inline iframe of /start with the campaign param so admins can see
// exactly what visitors will see. Uses same-origin so the embedded
// canvas works (region store fetches, image loads etc.). Nested in a
// scaled wrapper so the desktop layout fits the panel without forcing
// the admin page to be huge.
const AdPreviewFrame = ({ campaignKey }: AdPreviewFrameProps) => {
  const previewUrl = `/start?utm_campaign=${campaignKey}&_admin_preview=1`;
  return (
    <div className="bg-white rounded-coloring-card border border-paper-cream-dark p-2">
      <div className="flex items-center justify-between mb-2 px-2 pt-1">
        <code className="font-mono text-xs text-text-muted">{previewUrl}</code>
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-rooney-sans text-xs text-crayon-orange hover:underline"
        >
          Open in new tab
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
        </a>
      </div>
      <iframe
        src={previewUrl}
        title={`/start preview for ad:${campaignKey}`}
        className="w-full rounded-md border border-paper-cream-dark"
        style={{ height: 720 }}
      />
    </div>
  );
};

export default AdPreviewFrame;
