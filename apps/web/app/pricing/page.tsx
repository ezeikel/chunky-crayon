'use client';

import { useState } from 'react';
import posthog from 'posthog-js';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';
import { PlanInterval, SUBSCRIPTION_PLANS } from '@/constants';
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
import { createCheckoutSession } from '../actions/stripe';

const intervalLabels: Record<PlanInterval, string> = {
  monthly: 'Monthly',
  annual: 'Annual (save 15%)',
};

// make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

const PricingPage = () => {
  const [interval, setInterval] = useState<PlanInterval>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const plans = SUBSCRIPTION_PLANS[interval];

  const handlePurchase = async (plan: any) => {
    setLoadingPlan(plan.name);

    // PostHog event tracking
    posthog.capture('pricing_plan_selected', {
      plan_name: plan.name,
      plan_key: plan.key,
      plan_price: plan.price,
      plan_credits: plan.credits,
      billing_interval: interval,
      is_most_popular: plan.mostPopular || false,
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
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <header className="text-center mb-16">
        <h1 className="font-tondo text-4xl font-extrabold mb-2 text-primary">
          Plans for every colouring adventure!
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {`Whether you're a parent, a young artist, or a grown-up who loves to colour, there's a Chunky Crayon plan for you. No account needed to get started!`}
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
              onClick={() => setInterval(key)}
              aria-pressed={interval === key}
            >
              {intervalLabels[key]}
            </button>
          ))}
        </div>
      </header>
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              'flex flex-col h-full border-2 transition-shadow',
              plan.mostPopular
                ? 'border-orange shadow-lg scale-105 relative z-10'
                : 'border-border',
            )}
          >
            {plan.mostPopular && (
              <span className="absolute -top-4 right-1/2 translate-x-1/2 bg-orange text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                Most Popular
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
                {formatNumber(parseInt(plan.credits, 10))} credits/month
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {plan.audience}
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
                onClick={() => handlePurchase(plan)}
                disabled={loadingPlan === plan.name}
              >
                Buy Now
              </Button>
              <span className="text-xs text-muted-foreground">
                No commitment. Cancel anytime.
              </span>
            </CardFooter>
          </Card>
        ))}
      </section>
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="font-tondo text-2xl font-bold mb-4 text-center">
          Frequently Asked Questions
        </h2>
        <ul className="space-y-4 text-sm text-muted-foreground">
          <li>
            <strong>Can I cancel anytime?</strong> Yes! You can cancel your
            subscription at any time, no questions asked.
          </li>
          <li>
            <strong>Do credits roll over?</strong> Some plans allow you to roll
            over unused credits. See plan details for more info.
          </li>
          <li>
            <strong>Is this for kids or adults?</strong> Both! Chunky Crayon is
            perfect for families, kids, and grown-ups who love to colour.
          </li>
          <li>
            <strong>How do I get started?</strong> Just pick a plan and start
            creating colouring pages instantly!
          </li>
        </ul>
      </section>
    </div>
  );
};

export default PricingPage;
