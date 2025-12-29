'use client';

import { useState } from 'react';
import posthog from 'posthog-js';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { SUBSCRIPTION_PLANS, CREDIT_PACKS, TRACKING_EVENTS } from '@/constants';
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
import {
  changeSubscription,
  createCheckoutSession,
  createCustomerPortalSession,
} from '@/app/actions/stripe';
import { format } from 'date-fns';
import { PlanName, BillingPeriod, Prisma } from '@chunky-crayon/db/types';
import formatNumber from '@/utils/formatNumber';
import { trackInitiateCheckout } from '@/utils/pixels';

// make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

// Map PlanName enum to translation keys
const planKeyMap: Record<PlanName, string> = {
  [PlanName.SPLASH]: 'splash',
  [PlanName.RAINBOW]: 'rainbow',
  [PlanName.SPARKLE]: 'sparkle',
};

type BillingProps = {
  user: Prisma.UserGetPayload<{
    select: {
      id: true;
      email: true;
      name: true;
      credits: true;
      subscriptions: {
        select: {
          id: true;
          planName: true;
          status: true;
          currentPeriodEnd: true;
        };
      };
    };
  }>;
};

const Billing = ({ user }: BillingProps) => {
  const t = useTranslations('billing');
  const tPricing = useTranslations('pricing');
  const [loadingPlan, setLoadingPlan] = useState<PlanName | null>(null);
  const [loadingCredits, setLoadingCredits] = useState<string | null>(null);

  const currentSubscription = user.subscriptions?.find(
    (sub) => sub.status === 'ACTIVE',
  );

  const hasActiveSubscription = !!currentSubscription;

  const handlePlanChange = async (plan: {
    planName: PlanName;
    stripePriceEnv: string;
  }) => {
    if (!currentSubscription) {
      toast.error(t('noSubscriptionFound'));
      return;
    }

    setLoadingPlan(plan.planName);

    // PostHog event tracking
    posthog.capture('subscription_plan_changed', {
      current_plan: currentSubscription.planName,
      new_plan: plan.planName,
    });

    try {
      const result = await changeSubscription({
        currentPlanName: currentSubscription.planName,
        newPlanName: plan.planName,
        newPriceId: plan.stripePriceEnv,
      });

      if (result?.success) {
        toast.success(result.message);
      }
    } catch (error) {
      console.error('Error changing subscription:', error);
      toast.error(t('failedToChangeSubscription'));
    } finally {
      setLoadingPlan(null);
    }
  };

  const handlePurchase = async (plan: {
    planName: PlanName;
    stripePriceEnv: string;
    price: string;
  }) => {
    setLoadingPlan(plan.planName);

    // Type-safe PostHog event tracking
    trackEvent(TRACKING_EVENTS.PRICING_PLAN_CLICKED, {
      planName: plan.planName,
      planInterval: BillingPeriod.MONTHLY,
      price: plan.price,
    });

    // Track checkout initiation for Facebook/Pinterest pixels
    const priceInPence = parseInt(plan.price.replace(/[^0-9]/g, ''), 10) * 100;
    trackInitiateCheckout({
      value: priceInPence,
      currency: 'GBP',
      productType: 'subscription',
      planName: plan.planName,
    });

    try {
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const session = await createCheckoutSession(
        plan.stripePriceEnv,
        'subscription',
        '/account/billing',
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
      toast.error(t('failedToCheckout'));
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleCreditPurchase = async (pack: any) => {
    if (!hasActiveSubscription) {
      toast.error(t('noSubscriptionForCredits'));
      return;
    }

    setLoadingCredits(pack.name);

    // PostHog event tracking
    posthog.capture('credits_purchased', {
      pack_name: pack.name,
      credits: pack.credits,
      price: pack.price,
    });

    // Track checkout initiation for Facebook/Pinterest pixels
    const priceInPence = parseInt(pack.price.replace(/[^0-9]/g, ''), 10) * 100;
    trackInitiateCheckout({
      value: priceInPence,
      currency: 'GBP',
      productType: 'credits',
      creditAmount: pack.credits,
    });

    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const session = await createCheckoutSession(
        pack.stripePriceEnv,
        'payment',
      );

      if (!session) throw new Error('Failed to create checkout session');

      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (error) {
        console.error('Stripe redirect error:', error);
        toast.error(t('failedToCheckout'));
      }
    } catch (error) {
      console.error('Error purchasing credits:', error);
      toast.error(t('failedToPurchaseCredits'));
    } finally {
      setLoadingCredits(null);
    }
  };

  const handleManageSubscription = async () => {
    // PostHog event tracking
    posthog.capture('manage_subscription_clicked', {
      current_plan: currentSubscription?.planName,
    });

    try {
      const result = await createCustomerPortalSession();

      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error(t('failedToOpenPortal'));
    }
  };

  const getPlanButtonText = (planName: PlanName) => {
    if (loadingPlan === planName) return t('loading');
    if (currentSubscription?.planName === planName)
      return t('currentPlanBadge');
    // Show "Subscribe" if no active subscription, "Change Plan" if changing existing
    return hasActiveSubscription ? t('changePlan') : t('subscribe');
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <header className="text-center mb-16">
        <h1 className="font-tondo text-4xl font-extrabold mb-2 text-primary">
          {t('pageTitle')}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('pageSubtitle')}
        </p>
      </header>

      {/* Current Subscription */}
      <section className="mb-16">
        <h2 className="font-tondo text-2xl font-bold mb-6">
          {t('currentPlan')}
        </h2>
        {currentSubscription ? (
          <Card>
            <CardHeader>
              <CardTitle>{currentSubscription.planName}</CardTitle>
              <CardDescription>
                {t('renewsOn', {
                  date: format(
                    new Date(currentSubscription.currentPeriodEnd),
                    'MMMM d, yyyy',
                  ),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('currentCredits', { count: formatNumber(user.credits) })}
              </p>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleManageSubscription}
                className="bg-orange hover:bg-orange/90 text-white"
              >
                {t('manageSubscription')}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t('noActiveSubscription')}</CardTitle>
              <CardDescription>
                {t('noSubscriptionDescription')}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                onClick={() => {
                  window.location.href = '/pricing';
                }}
                className="bg-orange hover:bg-orange/90 text-white"
              >
                {t('viewPlans')}
              </Button>
            </CardFooter>
          </Card>
        )}
      </section>

      {/* Credit Packs */}
      {hasActiveSubscription && (
        <section className="mb-16">
          <h2 className="font-tondo text-2xl font-bold mb-6">
            {t('buyMoreCredits')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CREDIT_PACKS.map((pack) => (
              <Card key={pack.name}>
                <CardHeader>
                  <CardTitle>{pack.name}</CardTitle>
                  <CardDescription>
                    {t('credits', { count: formatNumber(pack.credits) })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">
                    {pack.price}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-orange hover:bg-orange/90 text-white"
                    onClick={() => handleCreditPurchase(pack)}
                    disabled={loadingCredits === pack.name}
                  >
                    {loadingCredits === pack.name ? t('loading') : t('buyNow')}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Available Plans */}
      <section>
        <h2 className="font-tondo text-2xl font-bold mb-6">
          {t('availablePlans')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {SUBSCRIPTION_PLANS.monthly.map((plan) => {
            const planTranslationKey = planKeyMap[plan.key];
            const planName = tPricing(`plans.${planTranslationKey}.name`);
            const planTagline = tPricing(`plans.${planTranslationKey}.tagline`);

            return (
              <Card
                key={plan.key}
                className={cn(
                  'flex flex-col h-full border-2 transition-shadow',
                  currentSubscription?.planName === plan.key
                    ? 'border-orange shadow-lg scale-105 relative z-10'
                    : 'border-border',
                )}
              >
                {currentSubscription?.planName === plan.key && (
                  <span className="absolute -top-4 right-1/2 translate-x-1/2 bg-orange text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    {t('currentPlanBadge')}
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
                    {tPricing('creditsPerMonth')}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-2">
                  <ul className="mb-2 space-y-1">
                    {plan.featureKeys.map((featureKey) => (
                      <li key={featureKey} className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span>{tPricing(`features.${featureKey}`)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Button
                    className="w-full text-lg py-2 bg-orange hover:bg-orange/90 text-white"
                    onClick={() =>
                      hasActiveSubscription
                        ? handlePlanChange({
                            planName: plan.key,
                            stripePriceEnv: plan.stripePriceEnv,
                          })
                        : handlePurchase({
                            planName: plan.key,
                            stripePriceEnv: plan.stripePriceEnv,
                            price: plan.price,
                          })
                    }
                    disabled={
                      loadingPlan === plan.key ||
                      currentSubscription?.planName === plan.key
                    }
                  >
                    {getPlanButtonText(plan.key)}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {currentSubscription?.planName === plan.key
                      ? t('manageInPortal')
                      : t('noCommitment')}
                  </span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Billing;
