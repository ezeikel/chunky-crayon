import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleQuestion } from '@fortawesome/pro-duotone-svg-icons';
import type { Campaign } from '@/lib/ads/schema';

type CampaignCreativePanelProps = {
  campaign: Campaign | undefined;
  /** The ad's purposeKey suffix (e.g. 'trex'), used in the not-found copy. */
  assetKey: string;
};

// Static asset paths for the ad creative live in /public/ads/ keyed by
// campaign.id. Convention: `<id>--video.mp4` + `<id>--meta-feed.png` etc.
// Build all four from the campaign id rather than storing them on the
// campaign object — keeps adding new campaigns to a single Campaign{}
// declaration in lib/ads/campaigns.ts.
const creativeUrls = (campaignId: string) => ({
  video: `/ads/${campaignId}--video.mp4`,
  metaFeed: `/ads/${campaignId}--meta-feed.png`,
  pinterest: `/ads/${campaignId}--pinterest.png`,
  stories: `/ads/${campaignId}--stories.png`,
});

const CampaignCreativePanel = ({
  campaign,
  assetKey,
}: CampaignCreativePanelProps) => {
  // Ad-hoc campaigns created via the admin UI won't have a matching
  // entry in lib/ads/campaigns.ts. Show a helpful empty state explaining
  // the link instead of a broken video player.
  if (!campaign) {
    return (
      <div className="bg-white rounded-coloring-card border border-paper-cream-dark p-6 text-center">
        <FontAwesomeIcon
          icon={faCircleQuestion}
          className="text-2xl text-text-muted mb-2"
        />
        <p className="font-rooney-sans text-sm text-text-secondary mb-1">
          No ad creative on file for <code>ad:{assetKey}</code>.
        </p>
        <p className="font-rooney-sans text-xs text-text-muted">
          Add a Campaign with <code>asset.key: &apos;{assetKey}&apos;</code> in{' '}
          <code>apps/chunky-crayon-web/lib/ads/campaigns.ts</code> and run{' '}
          <code>pnpm generate:ads</code> to render the video + still images.
        </p>
      </div>
    );
  }

  const urls = creativeUrls(campaign.id);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-tondo font-bold text-base mb-2">{campaign.name}</h3>
        <p className="font-rooney-sans text-xs text-text-muted">
          Template: <code>{campaign.template}</code> · ID:{' '}
          <code>{campaign.id}</code>
        </p>
      </div>

      {/* Video — only render <video> if the campaign actually has one
          declared (video field is optional on Campaign). The static
          mp4 path may also 404 if generate:ads hasn't been run yet,
          but that fails gracefully in <video>. */}
      {campaign.video ? (
        <div>
          <p className="font-rooney-sans text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            Video creative (
            {campaign.video.scenes
              .reduce((sum, s) => sum + s.duration, 0)
              .toFixed(0)}
            s)
          </p>
          <video
            src={urls.video}
            controls
            playsInline
            className="w-full max-w-xs rounded-md border border-paper-cream-dark bg-black"
          />
        </div>
      ) : null}

      {/* Static placements — three formats, each ~1080x1080 / 1080x1350
          / 1080x1920. Show small thumbs; click opens the full-size in
          a new tab via the underlying <a>. */}
      <div>
        <p className="font-rooney-sans text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
          Static placements
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { label: 'Meta feed', src: urls.metaFeed },
              { label: 'Pinterest', src: urls.pinterest },
              { label: 'Stories', src: urls.stories },
            ] as const
          ).map(({ label, src }) => (
            <a
              key={label}
              href={src}
              target="_blank"
              rel="noreferrer"
              className="block group"
            >
              <div className="relative aspect-square bg-paper-cream rounded-md overflow-hidden border border-paper-cream-dark group-hover:border-crayon-orange">
                <Image
                  src={src}
                  alt={`${campaign.name} — ${label}`}
                  fill
                  sizes="120px"
                  className="object-contain p-1"
                  unoptimized
                />
              </div>
              <p className="font-rooney-sans text-[10px] text-text-muted text-center mt-1">
                {label}
              </p>
            </a>
          ))}
        </div>
      </div>

      {/* Copy — what shows on the canvas + what goes in the Meta ad
          composer. Useful for cross-checking that the right variant is
          live and for grabbing primaryText to paste into Ads Manager. */}
      <div className="space-y-3">
        <p className="font-rooney-sans text-xs font-bold uppercase tracking-wider text-text-muted">
          Copy
        </p>
        <dl className="space-y-2 font-rooney-sans text-sm">
          <div>
            <dt className="text-text-muted text-xs">Headline</dt>
            <dd className="text-text-primary">{campaign.copy.headline}</dd>
          </div>
          {campaign.copy.subhead ? (
            <div>
              <dt className="text-text-muted text-xs">Subhead</dt>
              <dd className="text-text-primary">{campaign.copy.subhead}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-text-muted text-xs">CTA</dt>
            <dd className="text-text-primary">{campaign.copy.cta}</dd>
          </div>
          {campaign.copy.proofQuote ? (
            <div>
              <dt className="text-text-muted text-xs">Proof quote</dt>
              <dd className="text-text-primary italic">
                {campaign.copy.proofQuote}
              </dd>
            </div>
          ) : null}
        </dl>

        {campaign.meta.primaryText.length > 0 ? (
          <div>
            <p className="text-text-muted text-xs font-rooney-sans mb-1">
              Meta primary text variants
            </p>
            <ul className="space-y-1 font-rooney-sans text-xs text-text-secondary list-disc list-inside">
              {campaign.meta.primaryText.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CampaignCreativePanel;
