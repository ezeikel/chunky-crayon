"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faArrowRight,
  faSeedling,
  faLeaf,
  faSpa,
  faWater,
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "@/i18n/routing";
import FaqSection from "@/components/FaqSection";

type BillingInterval = "monthly" | "annual";

const planKeys = ["bloom", "grove", "sanctuary", "oasis"] as const;

const PRICING_FAQ_IDS = [
  "cancelAnytime",
  "rollover",
  "creditsPerPage",
  "audience",
  "gettingStarted",
] as const;

const planConfig = {
  bloom: {
    icon: faSeedling,
    monthlyPrice: 0,
    annualPrice: 0,
    ctaLink: "/gallery" as const,
    highlighted: false,
    featureCount: 4,
  },
  grove: {
    icon: faLeaf,
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    priceId: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROVE_MONTHLY,
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROVE_ANNUAL,
    },
    highlighted: false,
    featureCount: 4,
  },
  sanctuary: {
    icon: faSpa,
    monthlyPrice: 17.99,
    annualPrice: 179.99,
    priceId: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_SANCTUARY_MONTHLY,
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_SANCTUARY_ANNUAL,
    },
    highlighted: true,
    featureCount: 6,
  },
  oasis: {
    icon: faWater,
    monthlyPrice: 29.99,
    annualPrice: 299.99,
    priceId: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_OASIS_MONTHLY,
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_OASIS_ANNUAL,
    },
    highlighted: false,
    featureCount: 7,
  },
};

const PricingPage = () => {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const t = useTranslations("pricing");

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
              {t("title")}
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
              {t("subtitle")}
            </p>

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
                {t("monthly")}
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
                {t("annual")}
                <span className="ml-1.5 text-xs font-bold text-accent">
                  {t("savePercent")}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-4">
            {planKeys.map((key) => {
              const config = planConfig[key];
              const price =
                interval === "monthly"
                  ? config.monthlyPrice
                  : config.annualPrice;
              const priceId =
                "priceId" in config ? config.priceId?.[interval] : undefined;

              return (
                <div
                  key={key}
                  className={`relative flex flex-col rounded-2xl border p-8 ${
                    config.highlighted
                      ? "border-primary bg-primary/[0.02] shadow-lg"
                      : "border-border bg-card"
                  }`}
                >
                  {config.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
                      {t("mostPopular")}
                    </span>
                  )}

                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        config.highlighted
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      <FontAwesomeIcon icon={config.icon} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {t(`plans.${key}.name`)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t(`plans.${key}.description`)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <span className="text-4xl font-extrabold text-foreground">
                      {price === 0 ? t("free") : `£${price}`}
                    </span>
                    {price > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {interval === "monthly" ? t("perMonth") : t("perYear")}
                      </span>
                    )}
                  </div>

                  <ul className="mt-6 flex-1 space-y-3">
                    {Array.from({ length: config.featureCount }).map((_, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-foreground"
                      >
                        <FontAwesomeIcon
                          icon={faCheck}
                          size="xs"
                          className={
                            config.highlighted
                              ? "mt-0.5 text-primary"
                              : "mt-0.5 text-accent"
                          }
                        />
                        {t(`plans.${key}.features.${i}`)}
                      </li>
                    ))}
                  </ul>

                  {"ctaLink" in config && config.ctaLink ? (
                    <Link
                      href={config.ctaLink}
                      className="mt-8 flex items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
                    >
                      {t(`plans.${key}.cta`)}
                      <FontAwesomeIcon icon={faArrowRight} size="sm" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCheckout(priceId)}
                      className={`mt-8 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition-shadow ${
                        config.highlighted
                          ? "bg-primary text-primary-foreground hover:shadow-md"
                          : "border border-foreground text-foreground hover:bg-secondary"
                      }`}
                    >
                      {t(`plans.${key}.cta`)}
                      <FontAwesomeIcon icon={faArrowRight} size="sm" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <FaqSection namespace="pricing.faq" itemIds={PRICING_FAQ_IDS} />
    </>
  );
};

export default PricingPage;
