"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faArrowRight,
  faSeedling,
  faLeaf,
  faSpa,
  faWater,
} from "@fortawesome/free-solid-svg-icons";

type BillingInterval = "monthly" | "annual";

const plans = [
  {
    name: "Bloom",
    icon: faSeedling,
    description: "Start your coloring journey",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "2 free creations daily",
      "Access to free library",
      "Online coloring canvas",
      "PDF downloads",
    ],
    cta: "Get started free",
    ctaLink: "/gallery",
    highlighted: false,
  },
  {
    name: "Grove",
    icon: faLeaf,
    description: "For casual colorists",
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    priceId: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROVE_MONTHLY,
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROVE_ANNUAL,
    },
    features: [
      "300 credits/month",
      "All coloring features",
      "HD PDF downloads",
      "Save to gallery",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    name: "Sanctuary",
    icon: faSpa,
    description: "For regular colorists",
    monthlyPrice: 17.99,
    annualPrice: 179.99,
    priceId: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_SANCTUARY_MONTHLY,
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_SANCTUARY_ANNUAL,
    },
    features: [
      "800 credits/month",
      "Everything in Grove",
      "1 month credit rollover",
      "Priority generation",
      "Daily email page",
      "Priority support",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Oasis",
    icon: faWater,
    description: "The complete wellness experience",
    monthlyPrice: 29.99,
    annualPrice: 299.99,
    priceId: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_OASIS_MONTHLY,
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_OASIS_ANNUAL,
    },
    features: [
      "2,000 credits/month",
      "Everything in Sanctuary",
      "2 month credit rollover",
      "Commercial use license",
      "Exclusive collections",
      "Custom color palettes",
      "Ambient soundscapes",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
];

const PricingPage = () => {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  const handleCheckout = async (priceId: string | undefined) => {
    if (!priceId) return;
    const { createCheckoutSession } = await import("@/app/actions/stripe");
    await createCheckoutSession(priceId);
  };

  return (
    <>
      <main className="bg-background py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Simple, honest pricing
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
              Start free and upgrade when you&apos;re ready. No hidden fees,
              cancel anytime.
            </p>

            {/* Billing toggle */}
            <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-secondary p-1">
              <button
                type="button"
                onClick={() => setInterval("monthly")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                  interval === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setInterval("annual")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                  interval === "annual"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Annual
                <span className="ml-1.5 text-xs font-bold text-accent">
                  Save 17%
                </span>
              </button>
            </div>
          </div>

          {/* Plan cards */}
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-4">
            {plans.map((plan) => {
              const price =
                interval === "monthly" ? plan.monthlyPrice : plan.annualPrice;
              const priceId = plan.priceId?.[interval];

              return (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border p-8 ${
                    plan.highlighted
                      ? "border-primary bg-primary/[0.02] shadow-lg"
                      : "border-border bg-card"
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
                      Most popular
                    </span>
                  )}

                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        plan.highlighted
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      <FontAwesomeIcon icon={plan.icon} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <span className="text-4xl font-extrabold text-foreground">
                      {price === 0 ? "Free" : `£${price}`}
                    </span>
                    {price > 0 && (
                      <span className="text-sm text-muted-foreground">
                        /{interval === "monthly" ? "mo" : "yr"}
                      </span>
                    )}
                  </div>

                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-sm text-foreground"
                      >
                        <FontAwesomeIcon
                          icon={faCheck}
                          size="xs"
                          className={
                            plan.highlighted
                              ? "mt-0.5 text-primary"
                              : "mt-0.5 text-accent"
                          }
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {plan.ctaLink ? (
                    <Link
                      href={plan.ctaLink}
                      className="mt-8 flex items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
                    >
                      {plan.cta}
                      <FontAwesomeIcon icon={faArrowRight} size="sm" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCheckout(priceId)}
                      className={`mt-8 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition-shadow ${
                        plan.highlighted
                          ? "bg-primary text-primary-foreground hover:shadow-md"
                          : "border border-foreground text-foreground hover:bg-secondary"
                      }`}
                    >
                      {plan.cta}
                      <FontAwesomeIcon icon={faArrowRight} size="sm" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
};

export default PricingPage;
