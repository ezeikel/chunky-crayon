'use client';

import { useState, useEffect, useRef } from 'react';
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
import { faCheck } from '@fortawesome/pro-solid-svg-icons';
import { PlanName, BillingPeriod } from '@one-colored-pixel/db/types';
import {
  PlanInterval,
  SOCIAL_PROOF_STATS,
  SUBSCRIPTION_PLANS,
  CREDIT_PACKS_PUBLIC,
  TRACKING_EVENTS,
} from '@/constants';
import { type Currency, DEFAULT_CURRENCY } from '@/lib/currency';
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
import { createCheckoutSession } from '@/app/actions/stripe';
import FadeIn from '@/components/motion/FadeIn';
import StaggerChildren from '@/components/motion/StaggerChildren';
import StaggerItem from '@/components/motion/StaggerItem';
import CrayonScribble from '@/components/Intro/CrayonScribble';
import { trackViewContent, trackInitiateCheckout } from '@/utils/pixels';
import FAQ from '@/components/FAQ/FAQ';
import Testimonials, { StarRating } from '@/components/Testimonials';
import { Experiment } from '@/components/experiment/Experiment';

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

// PostHog layout-experiment variants. Flag key: pricing-page-layout.
// `subscriptions_primary` = today's behavior (subs on top, packs below).
// `packs_primary` = packs on top, subscription tier below.
export type PricingLayoutVariant = 'subscriptions_primary' | 'packs_primary';

type SectionPosition = 'primary' | 'secondary';

type PricingPageClientProps = {
  adImages?: AdCampaignThumb[];
  currency?: Currency;
  variant?: PricingLayoutVariant;
};

const PricingPageClient = ({
  adImages = [],
  currency = DEFAULT_CURRENCY,
  variant = 'subscriptions_primary',
}: PricingPageClientProps) => {
  const t = useTranslations('pricing');
  const tErrors = useTranslations('errors');
  const [interval, setInterval] = useState<PlanInterval>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const plans = SUBSCRIPTION_PLANS[interval];

  const intervalLabels: Record<PlanInterval, string> = {
    monthly: t('monthly'),
    annual: t('annual'),
  };

  // Secondary section visibility tracking — fires once when scrolled
  // into view. We measure "did the visitor at least see the alternative
  // offer" separately from "did they click on it".
  const secondaryRef = useRef<HTMLDivElement | null>(null);
  const secondaryViewedRef = useRef(false);

  const secondaryType: 'subscription' | 'pack' =
    variant === 'subscriptions_primary' ? 'pack' : 'subscription';

  // Track pricing page view + variant assignment on mount.
  useEffect(() => {
    trackEvent(TRACKING_EVENTS.PRICING_PAGE_VIEWED, {
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    });
    trackEvent(TRACKING_EVENTS.PRICING_VARIANT_ASSIGNED, { variant });
    trackViewContent({
      contentType: 'pricing',
      contentName: 'Subscription Plans',
    });
  }, [variant]);

  // IntersectionObserver — fires PRICING_SECONDARY_SECTION_VIEWED the
  // first time the secondary section enters viewport. Single-shot.
  useEffect(() => {
    const node = secondaryRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !secondaryViewedRef.current) {
            secondaryViewedRef.current = true;
            trackEvent(TRACKING_EVENTS.PRICING_SECONDARY_SECTION_VIEWED, {
              variant,
              secondaryType,
            });
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [variant, secondaryType]);

  const handlePlanPurchase = async (
    plan: (typeof plans)[0],
    section: SectionPosition,
  ) => {
    const planTranslationKey = planKeyMap[plan.key];
    const planName = t(`plans.${planTranslationKey}.name`);
    const priceEntry = plan.prices[currency];
    setLoadingPlan(planName);

    trackEvent(TRACKING_EVENTS.PRICING_PLAN_CLICKED, {
      productType: 'subscription',
      planName: plan.key,
      planInterval:
        interval === 'monthly' ? BillingPeriod.MONTHLY : BillingPeriod.ANNUAL,
      price: priceEntry.display,
      variant,
      section,
    });

    // Meta Pixel InitiateCheckout — dedupe with server CAPI via shared
    // eventId. Pinterest piggybacks on Purchase, no InitiateCheckout
    // there.
    const priceInMinorUnits =
      parseInt(priceEntry.display.replace(/[^0-9]/g, ''), 10) * 100;
    const initiateCheckoutEventId = crypto.randomUUID();
    trackInitiateCheckout({
      value: priceInMinorUnits,
      currency,
      productType: 'subscription',
      planName: plan.key,
      eventId: initiateCheckoutEventId,
    });

    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const session = await createCheckoutSession(
        priceEntry.stripePriceEnv,
        'subscription',
        undefined,
        initiateCheckoutEventId,
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

  const handlePackPurchase = async (
    pack: (typeof CREDIT_PACKS_PUBLIC)[0],
    section: SectionPosition,
  ) => {
    const priceEntry = pack.prices[currency];
    setLoadingPack(pack.key);

    trackEvent(TRACKING_EVENTS.PRICING_PLAN_CLICKED, {
      productType: 'pack',
      packKey: pack.key as
        | 'PUBLIC_CREDITS_50'
        | 'PUBLIC_CREDITS_200'
        | 'PUBLIC_CREDITS_500',
      credits: pack.credits,
      price: priceEntry.display,
      variant,
      section,
    });

    const priceInMinorUnits = Math.round(
      parseFloat(priceEntry.display.replace(/[^0-9.]/g, '')) * 100,
    );
    const initiateCheckoutEventId = crypto.randomUUID();
    trackInitiateCheckout({
      value: priceInMinorUnits,
      currency,
      productType: 'credits',
      creditAmount: pack.credits,
      eventId: initiateCheckoutEventId,
    });

    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const session = await createCheckoutSession(
        priceEntry.stripePriceEnv,
        'payment',
        '/pricing',
        initiateCheckoutEventId,
      );

      if (!session || !session.id) {
        const errorMessage = session?.error || 'Failed to start checkout';
        console.error('Pack checkout session error:', errorMessage);
        toast.error(errorMessage);
        return;
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id,
      });
      if (error) {
        console.error('Stripe redirect error:', error);
        toast.error(error.message || 'Checkout failed');
      }
    } catch (err) {
      console.error('[pack-checkout]', err);
      toast.error(tErrors('unexpectedError'));
    } finally {
      setLoadingPack(null);
    }
  };

  const handleSecondaryCtaClick = () => {
    trackEvent(TRACKING_EVENTS.PRICING_SECONDARY_CTA_CLICKED, {
      variant,
      secondaryType,
    });
    secondaryRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  // ============================================================
  // Section renderers
  // ============================================================

  const renderSubscriptionsSection = (section: SectionPosition) => {
    const isPrimary = section === 'primary';
    return (
      <StaggerChildren
        className={cn(
          'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch',
          !isPrimary && 'gap-6 max-w-4xl',
        )}
        staggerDelay={isPrimary ? 0.15 : 0.05}
        delay={isPrimary ? 0.2 : 0}
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
                  plan.mostPopular && isPrimary
                    ? 'border-crayon-orange shadow-2xl shadow-crayon-orange/20 lg:scale-[1.06] lg:-translate-y-2 relative z-10 bg-white ring-2 ring-crayon-orange/30 ring-offset-4 ring-offset-paper'
                    : 'border-paper-cream-dark hover:border-crayon-orange/40 bg-white/90 hover:-translate-y-1 transition-transform duration-300',
                )}
              >
                {plan.mostPopular && isPrimary && (
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
                <CardHeader className={cn(isPrimary ? 'pt-8' : 'pt-5')}>
                  <CardTitle className="flex flex-col gap-1 text-center">
                    <span
                      className={cn(
                        'font-tondo mb-2',
                        isPrimary ? 'text-2xl' : 'text-xl',
                      )}
                    >
                      {planName}
                    </span>
                    <span
                      className={cn(
                        'font-normal text-text-secondary leading-snug',
                        isPrimary ? 'text-base' : 'text-sm',
                      )}
                    >
                      {planTagline}
                    </span>
                  </CardTitle>
                  <CardDescription
                    className={cn(isPrimary ? 'mt-4' : 'mt-2', 'text-center')}
                  >
                    <span className="block">
                      <span className="relative inline-block">
                        <span
                          className={cn(
                            'relative z-10 font-tondo font-bold text-text-primary',
                            isPrimary ? 'text-3xl' : 'text-2xl',
                          )}
                        >
                          {plan.prices[currency].display}
                        </span>
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
                  {isPrimary && (
                    <div className="mt-3 text-sm text-text-secondary text-center max-w-[18rem] mx-auto">
                      {planAudience}
                    </div>
                  )}
                </CardHeader>
                <CardContent
                  className={cn(
                    'flex-1 flex flex-col gap-2',
                    !isPrimary && 'pb-2',
                  )}
                >
                  <ul
                    className={cn(
                      'mb-2',
                      isPrimary ? 'space-y-2' : 'space-y-1.5',
                    )}
                  >
                    {plan.featureKeys.map((featureKey) => (
                      <li
                        key={featureKey}
                        className={cn(
                          'flex items-start gap-2.5 text-text-primary',
                          !isPrimary && 'text-sm',
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'inline-flex shrink-0 items-center justify-center rounded-full bg-crayon-orange/15 text-crayon-orange',
                            isPrimary ? 'mt-1 w-5 h-5' : 'mt-0.5 w-4 h-4',
                          )}
                        >
                          <FontAwesomeIcon
                            icon={faCheck}
                            className={cn(
                              isPrimary ? 'text-[10px]' : 'text-[8px]',
                            )}
                          />
                        </span>
                        <span className="leading-snug">
                          {t(`features.${featureKey}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter
                  className={cn(
                    'flex flex-col gap-2',
                    isPrimary ? 'pb-6' : 'pb-4',
                  )}
                >
                  <Button
                    variant={
                      plan.mostPopular && isPrimary ? 'default' : 'neutral'
                    }
                    className={cn(
                      'w-full rounded-full hover:scale-[1.02] active:scale-[0.98]',
                      isPrimary ? 'text-base py-6' : 'text-sm py-4',
                    )}
                    onClick={() => handlePlanPurchase(plan, section)}
                    disabled={loadingPlan === planName}
                  >
                    {t('buyNow')}
                  </Button>
                  {isPrimary && (
                    <>
                      <span className="text-xs text-text-secondary text-center">
                        {t('trialMicroCopy', {
                          price: plan.prices[currency].display,
                        })}
                      </span>
                      <span className="text-sm text-text-secondary text-center mt-1">
                        {t('noCommitment')}
                      </span>
                    </>
                  )}
                </CardFooter>
              </Card>
            </StaggerItem>
          );
        })}
      </StaggerChildren>
    );
  };

  const renderPacksSection = (section: SectionPosition) => {
    const isPrimary = section === 'primary';
    return (
      <StaggerChildren
        className={cn(
          'grid grid-cols-1 sm:grid-cols-3 gap-6 mx-auto items-stretch',
          isPrimary ? 'max-w-4xl gap-8' : 'max-w-3xl gap-4',
        )}
        staggerDelay={isPrimary ? 0.15 : 0.05}
        delay={isPrimary ? 0.2 : 0}
      >
        {CREDIT_PACKS_PUBLIC.map((pack) => {
          const isMostPopular = pack.key === 'PUBLIC_CREDITS_200';
          const priceDisplay = pack.prices[currency].display;
          return (
            <StaggerItem key={pack.key} className="h-full">
              <Card
                className={cn(
                  'flex flex-col h-full border-2 rounded-3xl transition-all duration-300',
                  isMostPopular && isPrimary
                    ? 'border-crayon-orange shadow-2xl shadow-crayon-orange/20 lg:scale-[1.04] lg:-translate-y-1 relative z-10 bg-white ring-2 ring-crayon-orange/30 ring-offset-4 ring-offset-paper'
                    : 'border-paper-cream-dark hover:border-crayon-orange/40 bg-white/90 hover:-translate-y-1',
                )}
              >
                <CardHeader className={cn(isPrimary ? 'pt-8' : 'pt-5')}>
                  <CardTitle className="text-center">
                    <span
                      className={cn(
                        'font-tondo',
                        isPrimary ? 'text-2xl' : 'text-xl',
                      )}
                    >
                      {pack.name}
                    </span>
                  </CardTitle>
                  <CardDescription
                    className={cn(isPrimary ? 'mt-4' : 'mt-2', 'text-center')}
                  >
                    <span className="block">
                      <span
                        className={cn(
                          'font-tondo font-bold text-text-primary',
                          isPrimary ? 'text-3xl' : 'text-2xl',
                        )}
                      >
                        {priceDisplay}
                      </span>
                    </span>
                    <span className="block mt-1 text-sm text-text-secondary">
                      {t('secondary.packCardCredits', { count: pack.credits })}
                    </span>
                  </CardDescription>
                </CardHeader>
                {isPrimary && (
                  <CardContent className="flex-1 flex flex-col items-center text-center px-6">
                    <p className="font-rooney-sans text-text-secondary leading-relaxed text-sm">
                      {/* No per-pack tagline in this surface — keep it
                          minimal so the credit count + price do the work. */}
                    </p>
                  </CardContent>
                )}
                <CardFooter
                  className={cn(
                    'flex flex-col gap-2',
                    isPrimary ? 'pb-6' : 'pb-4',
                  )}
                >
                  <Button
                    variant={isMostPopular && isPrimary ? 'default' : 'neutral'}
                    className={cn(
                      'w-full rounded-full hover:scale-[1.02] active:scale-[0.98]',
                      isPrimary ? 'text-base py-6' : 'text-sm py-4',
                    )}
                    onClick={() => handlePackPurchase(pack, section)}
                    disabled={loadingPack === pack.key}
                  >
                    {t('secondary.packCardCta')}
                  </Button>
                </CardFooter>
              </Card>
            </StaggerItem>
          );
        })}
      </StaggerChildren>
    );
  };

  // Variant decides order: which section is primary, which is secondary.
  const primarySectionType =
    variant === 'subscriptions_primary' ? 'subscriptions' : 'packs';
  const secondaryHeaderKey =
    variant === 'subscriptions_primary'
      ? 'secondary.packsHeader'
      : 'secondary.subscriptionsHeader';
  const secondaryBodyKey =
    variant === 'subscriptions_primary'
      ? 'secondary.packsBody'
      : 'secondary.subscriptionsBody';
  const secondaryCtaKey =
    variant === 'subscriptions_primary'
      ? 'secondary.ctaSeePacks'
      : 'secondary.ctaSeePlans';

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

          {/* Monthly / Annual toggle. Lives in the header so it sits
              clear of the subscription card grid (otherwise it visually
              collides with the "Most Popular" ribbon on the centered
              Rainbow card). Hidden in packs-primary variant where the
              subscription tier is condensed + monthly-only. */}
          {variant === 'subscriptions_primary' && (
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
          )}

          {/* Secondary CTA in the hero gives visitors who already know
              they want the other option an early path. */}
          <button
            type="button"
            onClick={handleSecondaryCtaClick}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-crayon-orange hover:text-crayon-orange-dark underline-offset-4 hover:underline transition-colors"
          >
            {t(secondaryCtaKey)} <span aria-hidden>→</span>
          </button>

          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-6 text-sm text-text-secondary">
            <Experiment
              flag="exp-pricing-trust"
              defaultVariant="control"
              variants={{
                control: (
                  <>
                    <a
                      href="#testimonials"
                      onClick={() => {
                        trackEvent(TRACKING_EVENTS.SOCIAL_PROOF_CLICKED, {
                          location: 'pricing',
                          surface: 'trust_strip',
                        });
                      }}
                      className="inline-flex items-center gap-2 font-semibold text-crayon-orange hover:text-crayon-orange-dark hover:underline underline-offset-4 decoration-2 transition-colors cursor-pointer"
                    >
                      <StarRating rating={SOCIAL_PROOF_STATS.averageRating} />
                      <span>{t('trustStrip.rating')}</span>
                    </a>
                    <span aria-hidden className="opacity-40">
                      ·
                    </span>
                    <span>{t('trustStrip.cancel')}</span>
                  </>
                ),
                guarantee: (
                  <>
                    <a
                      href="#testimonials"
                      onClick={() => {
                        trackEvent(TRACKING_EVENTS.SOCIAL_PROOF_CLICKED, {
                          location: 'pricing',
                          surface: 'trust_strip',
                        });
                      }}
                      className="inline-flex items-center gap-2 font-semibold text-crayon-orange hover:text-crayon-orange-dark hover:underline underline-offset-4 decoration-2 transition-colors cursor-pointer"
                    >
                      <StarRating rating={SOCIAL_PROOF_STATS.averageRating} />
                      <span>{t('trustStrip.rating')}</span>
                    </a>
                    <span aria-hidden className="opacity-40">
                      ·
                    </span>
                    <span>{t('trustStrip.guarantee')}</span>
                  </>
                ),
              }}
            />
          </div>
        </header>
      </FadeIn>

      {/* Anchor strip — actual coloring pages from the live ad
          campaigns. Visual continuity with paid traffic. */}
      {adImages.length > 0 && (
        <FadeIn direction="up" delay={0.05} className="mb-12">
          <div className="flex justify-center items-end gap-2 sm:gap-6 max-w-3xl mx-auto px-4">
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
                  <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-sm overflow-hidden bg-paper-cream">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="(max-width: 640px) 80px, (max-width: 768px) 112px, 128px"
                      className="object-contain"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </FadeIn>
      )}

      {/* PRIMARY section */}
      {primarySectionType === 'subscriptions'
        ? renderSubscriptionsSection('primary')
        : renderPacksSection('primary')}

      {/* SECONDARY section — condensed cards below a soft divider with
          a "for the other audience" pitch. Lives in its own IO ref so
          we can measure "did they see this alternative" separately
          from "did they click on it". */}
      <div
        ref={secondaryRef}
        className="mt-20 pt-12 border-t-2 border-dashed border-paper-cream-dark"
      >
        <FadeIn direction="up" duration={0.4}>
          <header className="text-center mb-8">
            <h2 className="font-tondo text-2xl md:text-3xl font-bold text-text-primary mb-2">
              {t(secondaryHeaderKey)}
            </h2>
            <p className="text-base text-text-secondary max-w-xl mx-auto">
              {t(secondaryBodyKey)}
            </p>
          </header>
        </FadeIn>

        {primarySectionType === 'subscriptions'
          ? renderPacksSection('secondary')
          : renderSubscriptionsSection('secondary')}
      </div>

      {/* What every plan unlocks. */}
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

      <Testimonials location="pricing" className="mt-16" />

      <FAQ namespace="pricing" className="mt-16 max-w-4xl mx-auto" />

      {/* Final CTA. Always points at subscriptions because that's the
          higher-LTV outcome; visitors who want packs have the secondary
          section above. */}
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
              className="px-8 py-6 rounded-full hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                const recommended = plans.find((p) => p.mostPopular);
                if (recommended) handlePlanPurchase(recommended, 'primary');
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
