"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart as faHeartSolid } from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartOutline } from "@fortawesome/free-regular-svg-icons";
import { Link } from "@/i18n/routing";

const filterKeys = [
  "all",
  "mandalas",
  "nature",
  "geometric",
  "landscapes",
  "fantasy",
  "animals",
] as const;

const pages = [
  {
    src: "/images/gallery-1.jpg",
    title: "Mandala Serenity",
    category: "mandalas",
    rating: 4.93,
    fav: true,
  },
  {
    src: "/images/gallery-2.jpg",
    title: "Botanical Garden",
    category: "nature",
    rating: 4.91,
    fav: false,
  },
  {
    src: "/images/gallery-3.jpg",
    title: "Ocean Waves",
    category: "landscapes",
    rating: 4.92,
    fav: false,
  },
  {
    src: "/images/gallery-4.jpg",
    title: "Geometric Zen",
    category: "geometric",
    rating: 4.96,
    fav: true,
  },
  {
    src: "/images/gallery-5.jpg",
    title: "Japanese Garden",
    category: "landscapes",
    rating: 4.87,
    fav: false,
  },
  {
    src: "/images/gallery-6.jpg",
    title: "Enchanted Forest",
    category: "fantasy",
    rating: 4.98,
    fav: false,
  },
];

const ShowcaseSection = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const t = useTranslations("homepage.showcase");

  const filtered =
    activeFilter === "all"
      ? pages
      : pages.filter((p) => p.category === activeFilter);

  return (
    <section className="border-t border-border bg-background py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-4">
          {filterKeys.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`flex-none rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                activeFilter === f
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground hover:border-foreground"
              }`}
            >
              {t(`filters.${f}`)}
            </button>
          ))}
        </div>

        <h2 className="mt-8 text-2xl font-extrabold tracking-tight text-foreground">
          {t("title")}
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Link key={item.title} href="/gallery" className="group">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                <Image
                  src={item.src}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-transform hover:scale-110"
                  onClick={(e) => e.preventDefault()}
                  aria-label={
                    item.fav ? t("removeFromFavorites") : t("addToFavorites")
                  }
                >
                  <FontAwesomeIcon
                    icon={item.fav ? faHeartSolid : faHeartOutline}
                    size="sm"
                    className={item.fav ? "text-primary" : "text-foreground/70"}
                  />
                </button>
              </div>
              <div className="mt-3 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`filters.${item.category}`)}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {t("free")}
                    </span>{" "}
                    &middot; {t("printReady")}
                  </p>
                </div>
                <div className="flex items-center gap-1 pt-0.5">
                  <FontAwesomeIcon
                    icon={faHeartSolid}
                    size="xs"
                    className="text-foreground"
                  />
                  <span className="text-sm font-semibold text-foreground">
                    {item.rating}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/gallery"
            className="inline-flex rounded-lg border border-foreground px-6 py-3 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
          >
            {t("showAll")}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ShowcaseSection;
