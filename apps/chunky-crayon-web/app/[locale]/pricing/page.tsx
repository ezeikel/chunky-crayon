import { getColoringImageForAdCampaign } from '@/app/data/coloring-image';
import { getCurrencyForRequest } from '@/lib/currency.server';
import PricingPageClient, { type AdCampaignThumb } from './PricingPageClient';

// Same campaign keys as /start hero + homepage Intro polaroid. Kept in
// sync so the visual continuity from paid traffic carries through.
const CAMPAIGN_KEYS = ['trex', 'dragon', 'foxes'] as const;

// Server shell — pre-fetches the 3 ad coloring page thumbnails so the
// pricing page hero anchor strip can render real product proof. The
// rest of the page is in PricingPageClient because it's interactive
// (toggle state, Stripe redirect, motion components). Currency is
// resolved per-request from x-vercel-ip-country so US traffic sees USD
// pricing. This makes the page dynamic-per-request — acceptable for
// the pricing page given its low traffic relative to content pages.
type PricingPageProps = {
  searchParams: Promise<{ currency?: string }>;
};

const PricingPage = async ({ searchParams }: PricingPageProps) => {
  const search = await searchParams;
  const [thumbs, currency] = await Promise.all([
    Promise.all(
      CAMPAIGN_KEYS.map(async (key) => {
        const image = await getColoringImageForAdCampaign(key);
        if (!image?.url || !image?.alt) return null;
        const thumb: AdCampaignThumb = {
          src: image.url,
          alt: image.alt,
        };
        return thumb;
      }),
    ),
    getCurrencyForRequest(search.currency),
  ]);

  const adImages = thumbs.filter(
    (item): item is AdCampaignThumb => item !== null,
  );

  return <PricingPageClient adImages={adImages} currency={currency} />;
};

export default PricingPage;
