"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import cn from "@/utils/cn";
import {
  changeSubscription,
  createCheckoutSession,
  createCustomerPortalSession,
} from "@/app/actions/stripe";
import { format } from "date-fns";
import { Prisma } from "@one-colored-pixel/db";
import formatNumber from "@/utils/formatNumber";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

type HabitatPlan = {
  key: string;
  name: string;
  tagline: string;
  price: string;
  credits: number;
  features: string[];
  stripePriceEnv: string;
  mostPopular?: boolean;
};

const HABITAT_SUBSCRIPTION_PLANS: HabitatPlan[] = [
  {
    key: "GROVE",
    name: "Grove",
    tagline: "For casual colorists",
    price: "\u00a39.99",
    credits: 300,
    features: [
      "300 credits/month",
      "All coloring features",
      "HD PDF downloads",
      "Save to gallery",
    ],
    stripePriceEnv: process.env
      .NEXT_PUBLIC_STRIPE_PRICE_GROVE_MONTHLY as string,
  },
  {
    key: "SANCTUARY",
    name: "Sanctuary",
    tagline: "For regular colorists",
    price: "\u00a317.99",
    credits: 800,
    features: [
      "800 credits/month",
      "All coloring features",
      "1 month credit rollover",
      "Priority generation",
      "Priority support",
    ],
    stripePriceEnv: process.env
      .NEXT_PUBLIC_STRIPE_PRICE_SANCTUARY_MONTHLY as string,
    mostPopular: true,
  },
  {
    key: "OASIS",
    name: "Oasis",
    tagline: "The complete wellness experience",
    price: "\u00a329.99",
    credits: 2000,
    features: [
      "2,000 credits/month",
      "All coloring features",
      "2 month credit rollover",
      "Commercial use license",
      "Custom color palettes",
      "Ambient soundscapes",
    ],
    stripePriceEnv: process.env
      .NEXT_PUBLIC_STRIPE_PRICE_OASIS_MONTHLY as string,
  },
];

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
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const currentSubscription = user.subscriptions?.find(
    (sub) => sub.status === "ACTIVE",
  );

  const hasActiveSubscription = !!currentSubscription;

  const handlePlanChange = async (plan: HabitatPlan) => {
    if (!currentSubscription) {
      toast.error("No active subscription found.");
      return;
    }

    setLoadingPlan(plan.key);

    try {
      const result = await changeSubscription({
        currentPlanName: currentSubscription.planName,
        newPlanName: plan.key,
        newPriceId: plan.stripePriceEnv,
      });

      if (result?.success) {
        toast.success(result.message);
      } else if (result?.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error changing subscription:", error);
      toast.error("Failed to change subscription. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handlePurchase = async (plan: HabitatPlan) => {
    setLoadingPlan(plan.key);

    try {
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error("Stripe failed to load");
      }

      const session = await createCheckoutSession(
        plan.stripePriceEnv,
        "subscription",
        "/account/billing",
      );

      if (!session || "error" in session) {
        const errorMessage =
          session?.error || "Failed to create checkout session";
        console.error("Checkout session error:", errorMessage);
        toast.error(errorMessage);
        return;
      }

      if (session.id) {
        const { error } = await stripe.redirectToCheckout({
          sessionId: session.id,
        });

        if (error) {
          console.error("Stripe redirect error:", error);
          toast.error(error.message || "Failed to redirect to checkout");
        }
      }
    } catch (error) {
      console.error("Error purchasing plan:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const result = await createCustomerPortalSession();

      if (result?.url) {
        window.location.href = result.url;
      } else if (result?.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast.error("Failed to open subscription management.");
    }
  };

  const getPlanButtonText = (planKey: string) => {
    if (loadingPlan === planKey) return "Loading...";
    if (currentSubscription?.planName === planKey) return "Current Plan";
    return hasActiveSubscription ? "Change Plan" : "Subscribe";
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <header className="text-center mb-16">
        <h1 className="text-4xl font-extrabold mb-2 text-green-800">Billing</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Manage your subscription and credits
        </p>
      </header>

      {/* Current Subscription */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Current Plan</h2>
        {currentSubscription ? (
          <Card>
            <CardHeader>
              <CardTitle>{currentSubscription.planName}</CardTitle>
              <CardDescription>
                Renews on{" "}
                {format(
                  new Date(currentSubscription.currentPeriodEnd),
                  "MMMM d, yyyy",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You have <strong>{formatNumber(user.credits)} credits</strong>{" "}
                remaining.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleManageSubscription}
                className="bg-green-700 hover:bg-green-800 text-white"
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
                Choose a plan below to get started with Coloring Habitat.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </section>

      {/* Available Plans */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {HABITAT_SUBSCRIPTION_PLANS.map((plan) => (
            <Card
              key={plan.key}
              className={cn(
                "flex flex-col h-full border-2 transition-shadow",
                currentSubscription?.planName === plan.key
                  ? "border-green-600 shadow-lg scale-105 relative z-10"
                  : plan.mostPopular
                    ? "border-green-400"
                    : "border-border",
              )}
            >
              {currentSubscription?.planName === plan.key && (
                <span className="absolute -top-4 right-1/2 translate-x-1/2 bg-green-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  Current Plan
                </span>
              )}
              {plan.mostPopular &&
                currentSubscription?.planName !== plan.key && (
                  <span className="absolute -top-4 right-1/2 translate-x-1/2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    Most Popular
                  </span>
                )}
              <CardHeader>
                <CardTitle className="flex flex-col gap-1">
                  <span className="text-center mb-2">{plan.name}</span>
                  <span className="text-base font-normal text-muted-foreground">
                    {plan.tagline}
                  </span>
                </CardTitle>
                <CardDescription className="mt-2 text-lg font-bold text-green-800">
                  {plan.price}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    /month
                  </span>
                </CardDescription>
                <div className="text-sm text-muted-foreground mt-1">
                  {formatNumber(plan.credits)} credits/month
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-2">
                <ul className="mb-2 space-y-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="text-green-600">&#10003;</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  className="w-full text-lg py-2 bg-green-700 hover:bg-green-800 text-white"
                  onClick={() =>
                    hasActiveSubscription
                      ? handlePlanChange(plan)
                      : handlePurchase(plan)
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
                    ? "Manage in billing portal"
                    : "Cancel anytime, no commitment"}
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
