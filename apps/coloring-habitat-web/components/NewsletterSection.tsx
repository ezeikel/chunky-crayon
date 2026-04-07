"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faCheck } from "@fortawesome/free-solid-svg-icons";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const t = useTranslations("homepage.newsletter");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setEmail("");
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <section className="bg-accent py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-white/70">
              {t("badge")}
            </span>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight leading-tight text-white md:text-5xl">
              {t("title")}
            </h2>
            <p className="mt-5 max-w-md text-white/70">{t("subtitle")}</p>

            <form
              onSubmit={handleSubmit}
              className="mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                required
                className="flex-1 rounded-full border border-white/20 bg-white/10 py-3.5 pl-5 pr-4 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                aria-label="Email address"
              />
              <button
                type="submit"
                disabled={submitted}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-accent transition-all hover:bg-white/90 hover:shadow-lg disabled:opacity-70"
              >
                {submitted ? (
                  <>
                    <FontAwesomeIcon icon={faCheck} size="sm" />
                    {t("subscribed")}
                  </>
                ) : (
                  <>
                    {t("subscribe")}
                    <FontAwesomeIcon icon={faArrowRight} size="sm" />
                  </>
                )}
              </button>
            </form>
            <p className="mt-3 text-xs text-white/50">{t("noSpam")}</p>
          </div>

          <div className="relative mx-auto hidden h-72 w-72 lg:block">
            <div className="absolute left-0 top-4 w-36 -rotate-6 overflow-hidden rounded-2xl shadow-2xl transition-transform hover:rotate-0">
              <Image
                src="/images/gallery-1.jpg"
                alt="Sample daily coloring page"
                width={160}
                height={220}
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
            <div className="absolute left-20 top-0 z-10 w-36 rotate-3 overflow-hidden rounded-2xl shadow-2xl transition-transform hover:rotate-0">
              <Image
                src="/images/gallery-5.jpg"
                alt="Sample daily coloring page"
                width={160}
                height={220}
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
            <div className="absolute left-10 top-16 z-20 w-36 rotate-6 overflow-hidden rounded-2xl shadow-2xl transition-transform hover:rotate-0">
              <Image
                src="/images/gallery-3.jpg"
                alt="Sample daily coloring page"
                width={160}
                height={220}
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
