import { Suspense } from 'react';
import { getColoringImageForAdCampaign } from '@/app/data/coloring-image';
import { getCurrencyForRequest } from '@/lib/currency.server';
import Loading from '@/components/Loading/Loading';
import PricingPageClient, { type AdCampaignThumb } from './PricingPageClient';

// Same campaign keys as /start hero + homepage Intro polaroid. Kept in
// sync so the visual continuity from paid traffic carries through.
const CAMPAIGN_KEYS = ['trex', 'dragon', 'foxes'] as const;

type PricingPageProps = {
  searchParams: Promise<{ currency?: string }>;
};

// Server shell — sync, no dynamic access. Currency resolution + the ad
// campaign thumbnail fetch happen in the Suspense child below so the
// page's outer shell stays prerenderable under Cache Components. Per
// the static-first PPR pattern: page handler must be sync; pass
// searchParams Promise into the Suspense child.
const PricingPage = ({ searchParams }: PricingPageProps) => {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto py-12 px-4 min-h-[600px] flex items-center justify-center">
          <Loading size="lg" />
        </div>
      }
    >
      <PricingPageBody searchParams={searchParams} />
    </Suspense>
  );
};

// Dynamic island: awaits searchParams + reads x-vercel-ip-country, so
// it must live inside Suspense to keep the page shell static.
const PricingPageBody = async ({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string }>;
}) => {
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
