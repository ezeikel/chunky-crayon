import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getColoringImageForAdCampaign } from '@/app/data/coloring-image';
import { getOGImageUrl } from '@/lib/og/r2-url';
import StartHero from './components/StartHero';
import StartProblem from './components/StartProblem';
import StartHowItWorks from './components/StartHowItWorks';
import LandingDemo from '@/components/LandingDemo/LandingDemo';
import StartFeatures from './components/StartFeatures';
import StartPricing from './components/StartPricing';
import StartFinalCta from './components/StartFinalCta';
import Testimonials from '@/components/Testimonials';
import FAQ from '@/components/FAQ';
import LandingPageViewTracker from '@/components/LandingPageViewTracker';

// Known UTM campaign keys we build campaign-aware copy for. If a visitor
// lands with an unknown/missing key we fall back to the 'default' variant
// in translations.
const KNOWN_CAMPAIGNS = ['trex', 'foxes', 'dragon'] as const;
type CampaignKey = (typeof KNOWN_CAMPAIGNS)[number];

const resolveCampaign = (raw: string | undefined): CampaignKey | 'default' => {
  if (!raw) return 'default';
  return (KNOWN_CAMPAIGNS as readonly string[]).includes(raw)
    ? (raw as CampaignKey)
    : 'default';
};

type StartPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    utm_campaign?: string;
    utm_source?: string;
    utm_medium?: string;
  }>;
};

export async function generateMetadata({
  params,
}: StartPageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = 'The Coloring App That Takes Requests | Chunky Crayon';
  const description =
    'Your kid describes the scene. You get a printable coloring page in about 2 minutes. 2 free pages to try, no account needed.';
  const url = `https://chunkycrayon.com/${locale}/start`;
  const ogImage = getOGImageUrl('start');
  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      // Pre-rendered PNG on R2. See lib/og/r2-url.ts.
      images: ogImage ?? undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ?? undefined,
    },
    // Paid-traffic landing — no reason to index it. Keeps the URL out of
    // SEO and prevents organic visitors from hitting the campaign-aware
    // variant without the utm context.
    robots: { index: false, follow: true },
  };
}

// Dynamic inner component — reads searchParams + queries the DB for the
// campaign's coloring image. Isolated so the static scaffold of the page
// can prerender at build time while this streams in. Per our app-level
// pattern "static shell + Suspense around dynamic pockets".
async function StartHeroAsync({
  searchParams,
}: {
  searchParams: Promise<{
    utm_campaign?: string;
    utm_source?: string;
    utm_medium?: string;
  }>;
}) {
  const { utm_campaign, utm_source, utm_medium } = await searchParams;
  const campaign = resolveCampaign(utm_campaign);

  // Fetch the campaign's coloring image so the hero can show it + the
  // Try-Coloring CTA can deep-link. For 'default' we use the T-rex image
  // as the demo — it's the strongest-performing creative and covers the
  // case where a visitor lands on /start without a utm_campaign param.
  const imageCampaign = campaign === 'default' ? 'trex' : campaign;
  const image = await getColoringImageForAdCampaign(imageCampaign);

  const t = await getTranslations('start');

  return (
    <>
      {/* Fires LANDING_PAGE_VIEWED on mount with the utm context. Lives
          here so it shares the same async boundary that resolves
          searchParams — no double parse. */}
      <LandingPageViewTracker
        page="start"
        utmCampaign={utm_campaign}
        utmSource={utm_source}
        utmMedium={utm_medium}
      />
      <StartHero
        campaign={campaign}
        title={t(`hero.${campaign}.title`)}
        subtitle={t(`hero.${campaign}.subtitle`)}
        eyebrow={t('eyebrow')}
        tryColoringLabel={t('tryColoring')}
        ctaLabel={t('cta')}
        ctaSubtext={t('ctaSubtext')}
        experimentCtaSubtext={{
          urgency: t('experiments.startCta.urgency'),
          proof: t('experiments.startCta.proof'),
        }}
        image={image}
      />
    </>
  );
}

// Placeholder for the hero while campaign image + translations resolve.
// Deliberately the same vertical footprint as the real hero so the rest
// of the page doesn't jump when it streams in.
function HeroFallback() {
  return (
    <section className="py-12 md:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[480px] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-crayon-orange/30 border-t-crayon-orange animate-spin" />
      </div>
    </section>
  );
}

// Static body of the page. Only the hero depends on searchParams + the
// DB image row, so that's the only part we suspend. getTranslations
// reads headers() internally, so we can't cache this — it's fast enough
// to re-render per request in practice.
async function StartStaticBody() {
  const t = await getTranslations('start');

  return (
    <>
      <StartProblem title={t('problem.title')} body={t('problem.body')} />
      <StartHowItWorks
        title={t('howItWorks.title')}
        steps={{
          describe: {
            title: t('howItWorks.steps.describe.title'),
            body: t('howItWorks.steps.describe.body'),
          },
          draw: {
            title: t('howItWorks.steps.draw.title'),
            body: t('howItWorks.steps.draw.body'),
          },
          color: {
            title: t('howItWorks.steps.color.title'),
            body: t('howItWorks.steps.color.body'),
          },
        }}
      />
      <LandingDemo
        title={t('demo.title')}
        body={t('demo.body')}
        idleLabel={t('demo.idleLabel')}
        drawingLabel={t('demo.drawingLabel')}
        drawingSubLabel={t('demo.drawingSubLabel')}
        playLabel={t('demo.playLabel')}
        pauseLabel={t('demo.pauseLabel')}
        page="start"
      />
      <StartFeatures
        title={t('features.title')}
        items={{
          unlimited: {
            title: t('features.items.unlimited.title'),
            body: t('features.items.unlimited.body'),
          },
          family: {
            title: t('features.items.family.title'),
            body: t('features.items.family.body'),
          },
          print: {
            title: t('features.items.print.title'),
            body: t('features.items.print.body'),
          },
        }}
      />
      {/* Testimonials + FAQ are designed to be rendered inside a parent
          that provides horizontal padding (the homepage uses PageWrap).
          /start sets per-section padding so we wrap them here to match
          the visual edge of StartFeatures / StartPricing above + below. */}
      <div className="px-4 md:px-6 lg:px-8">
        <Testimonials />
      </div>
      <StartPricing
        title={t('pricing.title')}
        body={t('pricing.body')}
        ctaLabel={t('pricing.cta')}
      />
      <div className="px-4 md:px-6 lg:px-8">
        <FAQ />
      </div>
      <StartFinalCta
        title={t('finalCta.title')}
        body={t('finalCta.body')}
        ctaLabel={t('cta')}
        ctaSubtext={t('ctaSubtext')}
      />
    </>
  );
}

// Outer page resolves params (for locale — cheap, non-dynamic) up-front
// then passes promise-props down to suspended children. Mirrors the
// pattern used by gallery/[category] which has the same static-shell +
// streamed-dynamic-pocket shape and prerenders cleanly.
export default async function StartPage({
  params,
  searchParams,
}: StartPageProps) {
  await params;
  return (
    <>
      <Suspense fallback={<HeroFallback />}>
        <StartHeroAsync searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={null}>
        <StartStaticBody />
      </Suspense>
    </>
  );
}
