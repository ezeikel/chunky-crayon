import { getTranslations } from 'next-intl/server';
import { getColoringImageForAdCampaign } from '@/app/data/coloring-image';
import IntroClient, { type IntroCycleItem } from './IntroClient';

// Logged-out hero. Parents are the buyers, kids are the users — so the
// copy leads with the pain ("5pm Googling") rather than the kid-focused
// mascot/emoji treatment used post-login. Cycling thumbnail shows real
// coloring pages generated for paid Meta ad campaigns, giving anonymous
// visitors the same product proof ad clickers see on /start.
type IntroProps = {
  className?: string;
};

// Keep in sync with lib/ads/campaigns.ts campaign keys. Each entry here
// must also exist in `coloring_images` with purposeKey 'ad:<key>' — the
// server fetch below silently drops any key whose thumbnail is missing
// so the homepage never ships a broken Image.
const CAMPAIGN_KEYS = ['trex', 'dragon', 'foxes'] as const;

type CampaignKey = (typeof CAMPAIGN_KEYS)[number];

const CAMPAIGN_WORDS: Record<CampaignKey, string> = {
  trex: 'T-rex',
  dragon: 'dragon',
  foxes: 'fox',
};

const Intro = async ({ className }: IntroProps) => {
  const t = await getTranslations('homepage');

  // Parallel-fetch all campaign thumbnails. Any that resolve to null
  // (row not backfilled yet, or deleted) are dropped from the cycle so
  // the page still renders without broken tiles.
  const thumbs = await Promise.all(
    CAMPAIGN_KEYS.map(async (key) => {
      const image = await getColoringImageForAdCampaign(key);
      if (!image?.id || !image?.url || !image?.alt) return null;
      const item: IntroCycleItem = {
        word: CAMPAIGN_WORDS[key],
        campaignKey: key,
        imageId: image.id,
        thumbUrl: image.url,
        alt: image.alt,
      };
      return item;
    }),
  );

  const cycle = thumbs.filter((item): item is IntroCycleItem => item !== null);

  // Fallback if every ad image is missing — page still renders with a
  // static headline word. Should never happen in prod; covers local
  // dev before backfill runs.
  const finalCycle: IntroCycleItem[] =
    cycle.length > 0
      ? cycle
      : [
          {
            word: 'dinosaur',
            campaignKey: 'fallback',
            imageId: '', // clickable link hidden via !imageId guard client-side
            thumbUrl: '/images/colo.svg',
            alt: 'Chunky Crayon placeholder',
          },
        ];

  return (
    <IntroClient
      className={className}
      eyebrow={t('heroEyebrow')}
      headlinePrefix={t('heroTitlePrefix')}
      headlineSuffix={t('heroTitleSuffix')}
      subtitle={t('heroSubtitle')}
      cta={t('heroThumbCaption')}
      cycle={finalCycle}
    />
  );
};

export default Intro;
