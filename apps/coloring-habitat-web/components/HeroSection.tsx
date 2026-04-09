"use client";

import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { Link } from "@/i18n/routing";
import CreateColoringPageForm from "@/components/forms/CreateColoringPageForm/CreateColoringPageForm";
import JoinDailyEmailForm from "@/components/forms/JoinDailyEmailForm/JoinDailyEmailForm";

const HeroSection = () => {
  const t = useTranslations("homepage.hero");

  return (
    <section className="bg-background pb-16 pt-10 md:pb-24 md:pt-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Headline + copy + trust badges (always first) */}
          <div className="order-1 flex flex-col">
            <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t("title")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t("subtitle")}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {(["trustBadge1", "trustBadge2", "trustBadge3"] as const).map(
                (key) => (
                  <span key={key} className="flex items-center gap-1.5">
                    <FontAwesomeIcon
                      icon={faCircleCheck}
                      size="sm"
                      className="text-accent"
                    />
                    {t(key)}
                  </span>
                ),
              )}
            </div>
          </div>

          {/* Create form: 2nd on mobile (below copy), right column on desktop */}
          <div className="order-2 flex flex-col lg:row-span-2">
            <CreateColoringPageForm />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {t("freeCreations")}
            </p>
          </div>

          {/* Email signup: 3rd on mobile, left column row 2 on desktop */}
          <div className="order-3">
            <JoinDailyEmailForm location="hero" />
          </div>
        </div>

        {/* Reviews row below both columns */}
        <div className="mx-auto mt-12 flex max-w-md items-center justify-center gap-3">
          <div className="flex -space-x-2">
            {[
              "bg-[#E63956]",
              "bg-[#008489]",
              "bg-[#914669]",
              "bg-[#CFB299]",
            ].map((bg, i) => (
              <div
                key={i}
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-xs font-bold text-white ${bg}`}
              >
                {["S", "J", "P", "A"][i]}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <FontAwesomeIcon
                key={i}
                icon={faStar}
                size="xs"
                className="text-foreground"
              />
            ))}
            <span className="ml-1 text-sm font-semibold text-foreground">
              4.9
            </span>
          </div>
          <span className="text-sm text-muted-foreground">&middot;</span>
          <Link
            href="/gallery"
            className="text-sm font-semibold text-foreground underline underline-offset-2"
          >
            {t("users")}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
