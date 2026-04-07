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
import { useTranslations } from "next-intl";
import formatNumber from "@/utils/formatNumber";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

type HabitatPlan = {
  key: string;
  translationKey: string;
  price: string;
  credits: number;
  stripePriceEnv: string;
  mostPopular?: boolean;
};

const HABITAT_SUBSCRIPTION_PLANS: HabitatPlan[] = [
  {
    key: "GROVE",
    translationKey: "grove",
    price: "\u00a39.99",
    credits: 300,
    stripePriceEnv: process.env
      .NEXT_PUBLIC_STRIPE_PRICE_GROVE_MONTHLY as string,
  },
  {
    key: "SANCTUARY",
    translationKey: "sanctuary",
    price: "\u00a317.99",
    credits: 800,
    stripePriceEnv: process.env
      .NEXT_PUBLIC_STRIPE_PRICE_SANCTUARY_MONTHLY as string,
    mostPopular: true,
  },
  {
    key: "OASIS",
    translationKey: "oasis",
    price: "\u00a329.99",
    credits: 2000,
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
  const t = useTranslations("billing");
  const tPricing = useTranslations("pricing");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const currentSubscription = user.subscriptions?.find(
    (sub) => sub.status === "ACTIVE",
  );

  const hasActiveSubscription = !!currentSubscription;

  const handlePlanChange = async (plan: HabitatPlan) => {
    if (!currentSubscription) {
      toast.error(t("errors.noActiveSubscription"));
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
      toast.error(t("errors.changeSubscriptionFailed"));
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
          session?.error || t("errors.checkoutSessionFailed");
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
          toast.error(error.message || t("errors.redirectFailed"));
        }
      }
    } catch (error) {
      console.error("Error purchasing plan:", error);
      toast.error(t("errors.checkoutFailed"));
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
      toast.error(t("errors.portalFailed"));
    }
  };

  const getPlanButtonText = (planKey: string) => {
    if (loadingPlan === planKey) return t("loading");
    if (currentSubscription?.planName === planKey) return t("currentPlan");
    return hasActiveSubscription ? t("changePlan") : t("subscribe");
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <header className="text-center mb-16">
        <h1 className="text-4xl font-extrabold mb-2 text-green-800">
          {t("pageTitle")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("pageSubtitle")}
        </p>
      </header>

      {/* Current Subscription */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">{t("currentPlan")}</h2>
        {currentSubscription ? (
          <Card>
            <CardHeader>
              <CardTitle>{currentSubscription.planName}</CardTitle>
              <CardDescription>
                {t("renewsOn", {
                  date: format(
                    new Date(currentSubscription.currentPeriodEnd),
                    "MMMM d, yyyy",
                  ),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t.rich("currentCredits", {
                  credits: formatNumber(user.credits),
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleManageSubscription}
                className="bg-green-700 hover:bg-green-800 text-white"
              >
                {t("manageSubscription")}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("noActiveSubscription")}</CardTitle>
              <CardDescription>
                {t("noActiveSubscriptionDescription")}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </section>

      {/* Available Plans */}
      <section>
        <h2 className="text-2xl font-bold mb-6">{t("availablePlans")}</h2>
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
                  {t("currentPlan")}
                </span>
              )}
              {plan.mostPopular &&
                currentSubscription?.planName !== plan.key && (
                  <span className="absolute -top-4 right-1/2 translate-x-1/2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    {t("mostPopular")}
                  </span>
                )}
              <CardHeader>
                <CardTitle className="flex flex-col gap-1">
                  <span className="text-center mb-2">
                    {tPricing(`plans.${plan.translationKey}.name`)}
                  </span>
                  <span className="text-base font-normal text-muted-foreground">
                    {tPricing(`plans.${plan.translationKey}.description`)}
                  </span>
                </CardTitle>
                <CardDescription className="mt-2 text-lg font-bold text-green-800">
                  {plan.price}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {t("perMonth")}
                  </span>
                </CardDescription>
                <div className="text-sm text-muted-foreground mt-1">
                  {t("creditsPerMonth", {
                    credits: formatNumber(plan.credits),
                  })}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-2">
                <ul className="mb-2 space-y-1">
                  {(
                    tPricing.raw(
                      `plans.${plan.translationKey}.features`,
                    ) as string[]
                  ).map((feature) => (
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
                    ? t("manageInPortal")
                    : t("cancelAnytime")}
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
