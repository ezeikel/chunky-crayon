'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSparkles,
  faPalette,
  faBookmark,
  faShareNodes,
  faStar,
  faMobileScreen,
  faPeopleRoof,
} from '@fortawesome/pro-duotone-svg-icons';
import {
  faCheck,
  faStar as faStarSolid,
} from '@fortawesome/pro-solid-svg-icons';
import { PlanName, BillingPeriod } from '@one-colored-pixel/db/types';
import { PlanInterval, SUBSCRIPTION_PLANS, TRACKING_EVENTS } from '@/constants';
import { trackEvent } from '@/utils/analytics-client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import cn from '@/utils/cn';
import formatNumber from '@/utils/formatNumber';
import { createCheckoutSession } from '@/app/actions/stripe';
import FadeIn from '@/components/motion/FadeIn';
import StaggerChildren from '@/components/motion/StaggerChildren';
import StaggerItem from '@/components/motion/StaggerItem';
import CrayonScribble from '@/components/Intro/CrayonScribble';
import { trackViewContent, trackInitiateCheckout } from '@/utils/pixels';
import FAQ from '@/components/FAQ/FAQ';

// Stable seed per plan key so the price underline is the same shape on
// every render — without this each navigation re-renders a different
// rough.js squiggle, which reads as flickery instead of hand-drawn.
const planSeeds: Record<PlanName, number> = {
  [PlanName.SPLASH]: 142,
  [PlanName.RAINBOW]: 287,
  [PlanName.SPARKLE]: 419,
};

// make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

// Map PlanName enum to translation keys
const planKeyMap: Record<PlanName, string> = {
  [PlanName.SPLASH]: 'splash',
  [PlanName.RAINBOW]: 'rainbow',
  [PlanName.SPARKLE]: 'sparkle',
};

// Server pre-fetches the 3 ad campaign coloring pages and passes them
// down so the hero anchor strip can render real product proof without
// turning this page into a server component.
export type AdCampaignThumb = {
  src: string;
  alt: string;
};

type PricingPageClientProps = {
  adImages?: AdCampaignThumb[];
};

const PricingPageClient = ({ adImages = [] }: PricingPageClientProps) => {
  const t = useTranslations('pricing');
  const tErrors = useTranslations('errors');
  const [interval, setInterval] = useState<PlanInterval>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const plans = SUBSCRIPTION_PLANS[interval];

  const intervalLabels: Record<PlanInterval, string> = {
    monthly: t('monthly'),
    annual: t('annual'),
  };

  // Track pricing page view for PostHog and Facebook/Pinterest pixels
  useEffect(() => {
    trackEvent(TRACKING_EVENTS.PRICING_PAGE_VIEWED, {
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    });
    trackViewContent({
      contentType: 'pricing',
      contentName: 'Subscription Plans',
    });
  }, []);

  const handlePurchase = async (plan: (typeof plans)[0]) => {
    const planTranslationKey = planKeyMap[plan.key];
    const planName = t(`plans.${planTranslationKey}.name`);
    setLoadingPlan(planName);

    // Type-safe PostHog event tracking
    trackEvent(TRACKING_EVENTS.PRICING_PLAN_CLICKED, {
      planName: plan.key,
      planInterval:
        interval === 'monthly' ? BillingPeriod.MONTHLY : BillingPeriod.ANNUAL,
      price: plan.price,
    });

    // Track checkout initiation for Facebook/Pinterest pixels
    const priceInPence = parseInt(plan.price.replace(/[^0-9]/g, ''), 10) * 100;
    trackInitiateCheckout({
      value: priceInPence,
      currency: 'GBP',
      productType: 'subscription',
      planName: plan.key,
    });

    try {
      // get stripe.js instance
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const session = await createCheckoutSession(
        plan.stripePriceEnv,
        'subscription',
      );

      if (!session || !session.id) {
        const errorMessage =
          session?.error || 'Failed to create checkout session';
        console.error('Checkout session error:', errorMessage);
        toast.error(errorMessage);
        return;
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (error) {
        console.error('Stripe redirect error:', error);
        toast.error(error.message || 'Failed to redirect to checkout');
      }
    } catch (error) {
      console.error('Error purchasing plan:', error);
      toast.error(tErrors('unexpectedError'));
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <FadeIn direction="up" duration={0.6}>
        <header className="text-center mb-16">
          <h1 className="font-tondo font-bold text-text-primary text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.05] tracking-tight mb-4 max-w-3xl mx-auto">
            {t('heroTitle')}
          </h1>
          <p className="font-rooney-sans text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            {t('heroSubtitle')}
          </p>
          <div className="flex justify-center items-center gap-4 mt-6">
            {(['monthly', 'annual'] as PlanInterval[]).map((key) => (
              <button
                key={key}
                type="button"
                className={cn(
                  'px-4 py-2 rounded-full font-semibold transition',
                  interval === key
                    ? 'bg-orange text-white shadow'
                    : 'bg-orange/10 text-orange hover:bg-orange/20',
                )}
                onClick={() => {
                  if (interval !== key) {
                    trackEvent(TRACKING_EVENTS.PRICING_INTERVAL_TOGGLED, {
                      fromInterval: interval,
                      toInterval: key,
                    });
                    setInterval(key);
                  }
                }}
                aria-pressed={interval === key}
              >
                {intervalLabels[key]}
              </button>
            ))}
          </div>

          {/* Trust strip — sits between toggle and the rest of the page so
              cold paid visitors see star rating + risk reversal before
              any prices, in line with standard pricing-page CRO
              patterns. Stars render via FontAwesome solid so they
              inherit the brand orange and stay consistent across
              fonts. */}
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-6 text-sm text-text-secondary">
            <span className="inline-flex items-center gap-2 font-semibold text-crayon-orange">
              <span className="inline-flex gap-0.5" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <FontAwesomeIcon
                    key={i}
                    icon={faStarSolid}
                    className="text-sm"
                  />
                ))}
              </span>
              <span>{t('trustStrip.rating')}</span>
            </span>
            <span aria-hidden className="opacity-40">
              ·
            </span>
            <span>{t('trustStrip.cancel')}</span>
          </div>
        </header>
      </FadeIn>

      {/* Anchor strip — actual coloring pages from the live ad
          campaigns. Visual continuity with paid traffic ("yes, those
          pages — your subscription unlocks all of them") + a small
          permission-to-skim moment before the plan cards. Slight
          rotations + paper-cutout shadow keep it on-brand vs a flat
          gallery row. */}
      {adImages.length > 0 && (
        <FadeIn direction="up" delay={0.05} className="mb-12">
          <div className="flex justify-center items-end gap-4 sm:gap-6 max-w-3xl mx-auto px-4">
            {adImages.map((img, i) => {
              const rotations = [
                '-rotate-[4deg]',
                'rotate-[2deg]',
                '-rotate-[2deg]',
              ];
              return (
                <div
                  key={img.src}
                  className={cn(
                    'relative bg-white rounded-sm p-2 pb-3 shadow-[0_8px_20px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)] border border-black/5 transition-transform duration-300 hover:rotate-0 hover:scale-105',
                    rotations[i % rotations.length],
                  )}
                >
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-sm overflow-hidden bg-paper-cream">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="(max-width: 640px) 96px, (max-width: 768px) 112px, 128px"
                      className="object-contain"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </FadeIn>
      )}

      {/* Plans — moved ABOVE "Every plan unlocks" so cold paid visitors
          see prices before features. The order swap is the single
          biggest CRO move on this page. */}
      <StaggerChildren
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch"
        staggerDelay={0.15}
        delay={0.2}
      >
        {plans.map((plan) => {
          const planTranslationKey = planKeyMap[plan.key];
          const planName = t(`plans.${planTranslationKey}.name`);
          const planTagline = t(`plans.${planTranslationKey}.tagline`);
          const planAudience = t(`plans.${planTranslationKey}.audience`);

          return (
            <StaggerItem key={plan.key} className="h-full">
              <Card
                className={cn(
                  'flex flex-col h-full border-2 rounded-3xl transition-all duration-300',
                  plan.mostPopular
                    ? 'border-crayon-orange shadow-2xl shadow-crayon-orange/20 lg:scale-[1.06] lg:-translate-y-2 relative z-10 bg-white ring-2 ring-crayon-orange/30 ring-offset-4 ring-offset-paper'
                    : 'border-paper-cream-dark hover:border-crayon-orange/40 bg-white/90 hover:-translate-y-1 transition-transform duration-300',
                )}
              >
                {plan.mostPopular && (
                  // Ribbon-style "Most Popular" banner — slight tilt + drop
                  // shadow so it reads as a paper cutout pinned to the
                  // card, not a generic pill. Sparkles icon stays.
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 -rotate-[3deg] bg-gradient-to-br from-crayon-orange to-crayon-orange-dark text-white text-sm font-tondo font-bold px-6 py-2 rounded-full shadow-[0_6px_16px_rgba(218,115,83,0.35)] whitespace-nowrap inline-flex items-center gap-2 ring-2 ring-white/40">
                    <FontAwesomeIcon
                      icon={faSparkles}
                      className="text-sm"
                      style={
                        {
                          '--fa-primary-color': '#ffffff',
                          '--fa-secondary-color': '#fde68a',
                          '--fa-secondary-opacity': '1',
                        } as React.CSSProperties
                      }
                    />
                    {t('mostPopular')}
                  </span>
                )}
                <CardHeader className="pt-8">
                  <CardTitle className="flex flex-col gap-1 text-center">
                    <span className="font-tondo text-2xl mb-2">{planName}</span>
                    <span className="text-base font-normal text-text-secondary leading-snug">
                      {planTagline}
                    </span>
                  </CardTitle>
                  <CardDescription className="mt-4 text-center">
                    <span className="block">
                      <span className="relative inline-block">
                        <span className="relative z-10 text-3xl font-tondo font-bold text-text-primary">
                          {plan.price}
                        </span>
                        {/* Hand-drawn underline behind the price.
                            Decorative; absolute-positioned so it doesn't
                            shift layout while roughjs hydrates. */}
                        <CrayonScribble
                          seed={planSeeds[plan.key]}
                          className="absolute left-0 right-0 -bottom-1 w-full h-[10px] pointer-events-none text-crayon-orange/70"
                        />
                      </span>
                      <span className="text-base font-normal text-text-secondary ml-1.5">
                        {interval === 'annual' ? t('perYear') : t('perMonth')}
                      </span>
                    </span>
                  </CardDescription>
                  <div className="mt-3 text-sm text-text-secondary text-center max-w-[18rem] mx-auto">
                    {planAudience}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-2">
                  <ul className="mb-2 space-y-2">
                    {plan.featureKeys.map((featureKey) => (
                      <li
                        key={featureKey}
                        className="flex items-start gap-2.5 text-text-primary"
                      >
                        <span
                          aria-hidden
                          className="mt-1 inline-flex w-5 h-5 shrink-0 items-center justify-center rounded-full bg-crayon-orange/15 text-crayon-orange"
                        >
                          <FontAwesomeIcon
                            icon={faCheck}
                            className="text-[10px]"
                          />
                        </span>
                        <span className="leading-snug">
                          {t(`features.${featureKey}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 pb-6">
                  <Button
                    className={cn(
                      'w-full text-base font-tondo font-bold py-6 rounded-full text-white transition-transform',
                      plan.mostPopular
                        ? 'bg-crayon-orange hover:bg-crayon-orange-dark hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-crayon-orange/30'
                        : 'bg-text-primary hover:bg-text-primary/90 hover:scale-[1.02] active:scale-[0.98]',
                    )}
                    onClick={() => handlePurchase(plan)}
                    disabled={loadingPlan === planName}
                  >
                    {t('buyNow')}
                  </Button>
                  <span className="text-xs text-text-secondary text-center">
                    {t('trialMicroCopy', { price: plan.price })}
                  </span>
                  <span className="text-sm text-text-secondary text-center mt-1">
                    {t('noCommitment')}
                  </span>
                </CardFooter>
              </Card>
            </StaggerItem>
          );
        })}
      </StaggerChildren>

      {/* Escape hatch for visitors who aren't ready for a plan but
          would still pay for a one-off. Sits below the plan grid so it
          doesn't compete with the subscription pitch — anyone who
          scrolled past three plan cards thinking "too much commitment"
          gets one last chance before bouncing. */}
      <FadeIn direction="up" delay={0.05} className="mt-10 text-center">
        <a
          href="/color-as-you-go"
          className="inline-flex items-center gap-1.5 font-tondo font-bold text-base text-text-primary hover:text-crayon-orange transition-colors underline underline-offset-4 decoration-crayon-orange/40 hover:decoration-crayon-orange"
        >
          {t('notReadyForPlan')}
          <span aria-hidden>→</span>
        </a>
      </FadeIn>

      {/* What every plan unlocks — moved BELOW the plans, rewritten as
          outcomes. Visitors who've already seen prices now read this
          as "what I get" rather than "what's expected of me". */}
      <FadeIn direction="up" delay={0.1} className="mt-20">
        <section className="text-center">
          <h2 className="font-tondo text-2xl md:text-3xl font-bold mb-8 text-text-primary">
            {t('included.title')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: faSparkles, key: 'aiCreation' },
              { icon: faPalette, key: 'colorOnline' },
              { icon: faPeopleRoof, key: 'familySharing' },
              { icon: faBookmark, key: 'saveFavorites' },
              { icon: faShareNodes, key: 'shareCreations' },
              { icon: faStar, key: 'collectStickers' },
              { icon: faMobileScreen, key: 'mobileApps' },
            ].map(({ icon, key }) => (
              <div
                key={key}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/60 border border-paper-cream-dark hover:border-crayon-orange/40 transition-colors"
              >
                <FontAwesomeIcon
                  icon={icon}
                  className="text-2xl text-crayon-orange"
                  style={
                    {
                      '--fa-primary-color': 'hsl(var(--crayon-orange))',
                      '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
                      '--fa-secondary-opacity': '1',
                    } as React.CSSProperties
                  }
                />
                <span className="text-sm text-text-secondary text-center leading-snug">
                  {t(`included.${key}`)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* FAQ Section */}
      <FAQ namespace="pricing" className="mt-16 max-w-4xl mx-auto" />

      {/* Final CTA — closing moment for visitors who scrolled the whole
          page unconvinced. Repeats the primary trial CTA + a secondary
          link back to the plan grid for those still comparing. */}
      <FadeIn direction="up" className="mt-20">
        <section className="text-center max-w-2xl mx-auto">
          <h2 className="font-tondo text-3xl md:text-4xl font-bold mb-4 text-text-primary">
            {t('finalCta.title')}
          </h2>
          <p className="text-lg text-text-secondary mb-8 leading-relaxed">
            {t('finalCta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              className="font-tondo font-bold text-base text-white bg-crayon-orange hover:bg-crayon-orange-dark px-8 py-6 rounded-full shadow-lg shadow-crayon-orange/30 hover:scale-[1.02] active:scale-[0.98] transition-transform"
              onClick={() => {
                const recommended = plans.find((p) => p.mostPopular);
                if (recommended) handlePurchase(recommended);
              }}
            >
              {t('finalCta.primary')}
            </Button>
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="font-tondo font-bold text-sm text-text-secondary hover:text-crayon-orange underline-offset-4 hover:underline transition-colors"
            >
              {t('finalCta.secondary')}
            </button>
          </div>
        </section>
      </FadeIn>
    </div>
  );
};

export default PricingPageClient;
