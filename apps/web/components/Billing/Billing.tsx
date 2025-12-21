'use client';

import { useState } from 'react';
import posthog from 'posthog-js';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';
import { SUBSCRIPTION_PLANS, CREDIT_PACKS } from '@/constants';
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
import { PlanName, Prisma } from '@chunky-crayon/db/types';
import formatNumber from '@/utils/formatNumber';

// make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

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
      toast.error('No active subscription found');
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
      toast.error('Failed to change subscription');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleCreditPurchase = async (pack: any) => {
    if (!hasActiveSubscription) {
      toast.error('Active subscription required to purchase credits');
      return;
    }

    setLoadingCredits(pack.name);

    // PostHog event tracking
    posthog.capture('credits_purchased', {
      pack_name: pack.name,
      credits: pack.credits,
      price: pack.price,
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
        toast.error('Failed to redirect to checkout');
      }
    } catch (error) {
      console.error('Error purchasing credits:', error);
      toast.error('Failed to purchase credits');
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
      toast.error('Failed to open customer portal');
    }
  };

  const getPlanButtonText = (planName: PlanName) => {
    if (loadingPlan === planName) return 'Loading...';
    if (currentSubscription?.planName === planName) return 'Current Plan';
    return 'Change Plan';
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <header className="text-center mb-16">
        <h1 className="font-tondo text-4xl font-extrabold mb-2 text-primary">
          Your Billing & Subscription
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Manage your subscription and purchase additional credits to keep
          creating amazing coloring pages.
        </p>
      </header>

      {/* Current Subscription */}
      <section className="mb-16">
        <h2 className="font-tondo text-2xl font-bold mb-6">Current Plan</h2>
        {currentSubscription ? (
          <Card>
            <CardHeader>
              <CardTitle>{currentSubscription.planName}</CardTitle>
              <CardDescription>
                Your subscription renews on{' '}
                {format(
                  new Date(currentSubscription.currentPeriodEnd),
                  'MMMM d, yyyy',
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Current credits: {formatNumber(user.credits)}
              </p>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleManageSubscription}
                className="bg-orange hover:bg-orange/90 text-white"
              >
                Manage Subscription
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Active Subscription</CardTitle>
              <CardDescription>
                Choose a plan to start creating amazing coloring pages.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                onClick={() => {
                  window.location.href = '/pricing';
                }}
                className="bg-orange hover:bg-orange/90 text-white"
              >
                View Plans
              </Button>
            </CardFooter>
          </Card>
        )}
      </section>

      {/* Credit Packs */}
      {hasActiveSubscription && (
        <section className="mb-16">
          <h2 className="font-tondo text-2xl font-bold mb-6">
            Buy More Credits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CREDIT_PACKS.map((pack) => (
              <Card key={pack.name}>
                <CardHeader>
                  <CardTitle>{pack.name}</CardTitle>
                  <CardDescription>
                    {formatNumber(pack.credits)} credits
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
                    {loadingCredits === pack.name ? 'Loading...' : 'Buy Now'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Available Plans */}
      <section>
        <h2 className="font-tondo text-2xl font-bold mb-6">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {SUBSCRIPTION_PLANS.monthly.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                'flex flex-col h-full border-2 transition-shadow',
                currentSubscription?.planName === plan.key
                  ? 'border-orange shadow-lg scale-105 relative z-10'
                  : 'border-border',
              )}
            >
              {currentSubscription?.planName === plan.key && (
                <span className="absolute -top-4 right-1/2 translate-x-1/2 bg-orange text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  Current Plan
                </span>
              )}
              <CardHeader>
                <CardTitle className="flex flex-col gap-1">
                  <span className="text-center mb-4">
                    <span className="font-tondo">{plan.name}</span>
                  </span>
                  <span className="text-base font-normal text-muted-foreground">
                    {plan.tagline}
                  </span>
                </CardTitle>
                <CardDescription className="mt-2 text-lg font-bold text-primary">
                  {plan.price}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    /mo
                  </span>
                </CardDescription>
                <div className="text-sm text-muted-foreground mt-1">
                  {plan.credits}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-2">
                <ul className="mb-2 space-y-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  className="w-full text-lg py-2 bg-orange hover:bg-orange/90 text-white"
                  onClick={() =>
                    handlePlanChange({
                      planName: plan.key,
                      stripePriceEnv: plan.stripePriceEnv,
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
                    ? 'Manage your subscription in the customer portal'
                    : 'No commitment. Cancel anytime.'}
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Billing;
