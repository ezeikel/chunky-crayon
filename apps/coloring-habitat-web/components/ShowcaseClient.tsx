"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ShowcaseImage } from "./ShowcaseSection";

type CategoryInfo = {
  slug: string;
  name: string;
  tags: string[];
};

type ShowcaseClientProps = {
  images: (ShowcaseImage & { svgUrl: string })[];
  categories: CategoryInfo[];
};

const ShowcaseClient = ({ images, categories }: ShowcaseClientProps) => {
  const [activeFilter, setActiveFilter] = useState("all");
  const t = useTranslations("homepage.showcase");

  const filtered =
    activeFilter === "all"
      ? images
      : images.filter((img) => {
          const cat = categories.find((c) => c.slug === activeFilter);
          if (!cat) return false;
          return img.tags.some((tag) => cat.tags.includes(tag));
        });

  const displayImages = filtered.slice(0, 6);

  return (
    <section className="border-t border-border bg-background py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-4">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`flex-none rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              activeFilter === "all"
                ? "border-foreground bg-foreground text-background"
                : "border-border text-foreground hover:border-foreground"
            }`}
          >
            {t("filters.all")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setActiveFilter(cat.slug)}
              className={`flex-none rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                activeFilter === cat.slug
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground hover:border-foreground"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <h2 className="mt-8 text-2xl font-extrabold tracking-tight text-foreground">
          {t("title")}
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {displayImages.map((item) => (
            <Link
              key={item.id}
              href={`/coloring-image/${item.id}`}
              className="group"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                <Image
                  src={item.svgUrl}
                  alt={item.title || "Coloring page"}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-semibold text-foreground line-clamp-1">
                  {item.title || "Coloring Page"}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {t("free")}
                  </span>{" "}
                  &middot; {t("printReady")}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {displayImages.length === 0 && (
          <p className="mt-8 text-center text-muted-foreground">
            No pages in this category yet. Check back soon!
          </p>
        )}

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

export default ShowcaseClient;
