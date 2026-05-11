import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { getColoringImageForAdCampaign } from '@/app/data/coloring-image';
import { getCurrencyForRequest } from '@/lib/currency.server';
import { getFeatureFlagVariant } from '@/flags';
import { ANONYMOUS_ID_COOKIE } from '@/lib/conversion-api';
import Loading from '@/components/Loading/Loading';
import PricingPageClient, {
  type AdCampaignThumb,
  type PricingLayoutVariant,
} from './PricingPageClient';

const PRICING_FLAG = 'pricing-page-layout';
const PRICING_DEFAULT_VARIANT: PricingLayoutVariant = 'subscriptions_primary';

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

  // Resolve the visitor's PostHog distinctId: prefer the logged-in
  // userId, fall back to the cc_anon_id cookie (set in proxy.ts for
  // every visitor). Without a stable id PostHog can't keep variant
  // assignment sticky across sessions.
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const distinctId =
    session?.user?.id ?? cookieStore.get(ANONYMOUS_ID_COOKIE)?.value ?? null;

  const [thumbs, currency, variant] = await Promise.all([
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
    distinctId
      ? getFeatureFlagVariant<PricingLayoutVariant>(
          PRICING_FLAG,
          distinctId,
          PRICING_DEFAULT_VARIANT,
        )
      : Promise.resolve(PRICING_DEFAULT_VARIANT),
  ]);

  const adImages = thumbs.filter(
    (item): item is AdCampaignThumb => item !== null,
  );

  return (
    <PricingPageClient
      adImages={adImages}
      currency={currency}
      variant={variant}
    />
  );
};

export default PricingPage;
