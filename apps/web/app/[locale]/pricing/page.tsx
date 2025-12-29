'use client';

import { useState, useEffect } from 'react';
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
} from '@fortawesome/pro-duotone-svg-icons';
import { PlanName, BillingPeriod } from '@chunky-crayon/db/types';
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
import { trackViewContent, trackInitiateCheckout } from '@/utils/pixels';
import FAQ from '@/components/FAQ/FAQ';

// make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

// Map PlanName enum to translation keys
const planKeyMap: Record<PlanName, string> = {
  [PlanName.SPLASH]: 'splash',
  [PlanName.RAINBOW]: 'rainbow',
  [PlanName.SPARKLE]: 'sparkle',
};

const PricingPage = () => {
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
          <h1 className="font-tondo text-4xl font-extrabold mb-2 text-primary">
            {t('heroTitle')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
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
        </header>
      </FadeIn>

      {/* What's Included Section */}
      <FadeIn direction="up" delay={0.1} className="mb-12">
        <section className="text-center">
          <h2 className="font-tondo text-2xl font-bold mb-6 text-primary">
            {t('included.title')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: faSparkles, key: 'aiCreation' },
              { icon: faPalette, key: 'colorOnline' },
              { icon: faBookmark, key: 'saveFavorites' },
              { icon: faShareNodes, key: 'shareCreations' },
              { icon: faStar, key: 'collectStickers' },
              { icon: faMobileScreen, key: 'mobileApps' },
            ].map(({ icon, key }) => (
              <div
                key={key}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-paper-cream/50 border border-paper-cream-dark"
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
                <span className="text-sm text-text-secondary text-center">
                  {t(`included.${key}`)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      <StaggerChildren
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto"
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
                  'flex flex-col h-full border-2 transition-shadow',
                  plan.mostPopular
                    ? 'border-orange shadow-lg scale-105 relative z-10'
                    : 'border-border',
                )}
              >
                {plan.mostPopular && (
                  <span className="absolute -top-4 right-1/2 translate-x-1/2 bg-orange text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    {t('mostPopular')}
                  </span>
                )}
                <CardHeader>
                  <CardTitle className="flex flex-col gap-1">
                    <span className="text-center mb-4">
                      <span className="font-tondo">{planName}</span>
                    </span>
                    <span className="text-base font-normal text-muted-foreground">
                      {planTagline}
                    </span>
                  </CardTitle>
                  <CardDescription className="mt-2 text-lg font-bold text-primary">
                    {plan.price}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      {t('perMonth')}
                    </span>
                  </CardDescription>
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatNumber(parseInt(plan.credits, 10))}{' '}
                    {t('creditsPerMonth')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {planAudience}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-2">
                  <ul className="mb-2 space-y-1">
                    {plan.featureKeys.map((featureKey) => (
                      <li key={featureKey} className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span>{t(`features.${featureKey}`)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Button
                    className="w-full text-lg py-2 bg-orange hover:bg-orange/90 text-white"
                    onClick={() => handlePurchase(plan)}
                    disabled={loadingPlan === planName}
                  >
                    {t('buyNow')}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {t('noCommitment')}
                  </span>
                </CardFooter>
              </Card>
            </StaggerItem>
          );
        })}
      </StaggerChildren>
      {/* FAQ Section */}
      <FAQ namespace="pricing" className="mt-16 max-w-4xl mx-auto" />
    </div>
  );
};

export default PricingPage;
