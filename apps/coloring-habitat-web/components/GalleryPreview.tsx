"use client";

import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart as faHeartSolid } from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartOutline } from "@fortawesome/free-regular-svg-icons";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

const galleryItems = [
  {
    src: "/images/gallery-1.jpg",
    title: "Mandala Serenity",
    category: "Mandalas",
    difficulty: "Medium",
    fav: true,
  },
  {
    src: "/images/gallery-2.jpg",
    title: "Botanical Garden",
    category: "Nature",
    difficulty: "Easy",
    fav: false,
  },
  {
    src: "/images/gallery-3.jpg",
    title: "Ocean Waves",
    category: "Seascapes",
    difficulty: "Hard",
    fav: false,
  },
  {
    src: "/images/gallery-4.jpg",
    title: "Geometric Zen",
    category: "Patterns",
    difficulty: "Medium",
    fav: true,
  },
  {
    src: "/images/gallery-5.jpg",
    title: "Japanese Garden",
    category: "Landscapes",
    difficulty: "Hard",
    fav: false,
  },
  {
    src: "/images/gallery-6.jpg",
    title: "Enchanted Forest",
    category: "Fantasy",
    difficulty: "Easy",
    fav: false,
  },
];

const difficultyColors: Record<string, string> = {
  Easy: "bg-accent/10 text-accent",
  Medium: "bg-primary/10 text-primary",
  Hard: "bg-[#B5838D]/10 text-[#B5838D]",
};

const GalleryPreview = () => {
  return (
    <section className="bg-card py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Popular this week
            </h2>
            <p className="mt-2 text-muted-foreground">
              Free pages from our growing library, loved by the community.
            </p>
          </div>
          <Link
            href="/gallery"
            className="hidden items-center gap-2 rounded-full border-2 border-foreground/15 px-6 py-3 text-sm font-bold text-foreground transition-all hover:border-foreground/30 sm:inline-flex"
          >
            View all
            <FontAwesomeIcon icon={faArrowRight} size="sm" />
          </Link>
        </div>

        {/* Staggered grid */}
        <div className="mt-12 columns-1 gap-6 sm:columns-2 lg:columns-3">
          {galleryItems.map((item, i) => (
            <Link
              key={item.title}
              href="/gallery"
              className="group mb-6 block break-inside-avoid"
            >
              <div
                className={`relative overflow-hidden rounded-2xl bg-secondary ${
                  i % 3 === 0
                    ? "aspect-[3/4]"
                    : i % 3 === 1
                      ? "aspect-square"
                      : "aspect-[4/5]"
                }`}
              >
                <Image
                  src={item.src}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {/* Heart */}
                <button
                  type="button"
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-transform hover:scale-110"
                  onClick={(e) => e.preventDefault()}
                  aria-label={`${item.fav ? "Remove from" : "Add to"} favourites`}
                >
                  <FontAwesomeIcon
                    icon={item.fav ? faHeartSolid : faHeartOutline}
                    size="sm"
                    className={item.fav ? "text-primary" : "text-foreground/50"}
                  />
                </button>
                {/* Difficulty badge */}
                <div className="absolute left-3 top-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${difficultyColors[item.difficulty]}`}
                  >
                    {item.difficulty}
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="font-bold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.category}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 rounded-full border-2 border-foreground/15 px-6 py-3 text-sm font-bold text-foreground"
          >
            View all pages
            <FontAwesomeIcon icon={faArrowRight} size="sm" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default GalleryPreview;
