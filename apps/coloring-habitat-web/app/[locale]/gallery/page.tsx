import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import GalleryGrid from "@/components/GalleryGrid/GalleryGrid";
import DifficultyFilter from "@/components/DifficultyFilter/DifficultyFilter";
import { GALLERY_CATEGORIES } from "@/constants";
import {
  getGalleryImages,
  getDifficultyImages,
  getDifficultyCounts,
  getDifficultyFromSlug,
} from "@/app/data/gallery";
import cn from "@/utils/cn";
import { generateAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: "Gallery",
    description:
      "Browse our collection of intricate coloring pages for adults. Filter by category or difficulty.",
    alternates: generateAlternates(locale, "/gallery"),
  };
}

type GalleryPageProps = {
  searchParams: Promise<{ difficulty?: string; category?: string }>;
};

const GalleryPage = async ({ searchParams }: GalleryPageProps) => {
  const { difficulty: difficultySlug } = await searchParams;
  const difficulty = difficultySlug
    ? getDifficultyFromSlug(difficultySlug)
    : null;

  const [data, difficultyCounts] = await Promise.all([
    difficulty ? getDifficultyImages(difficulty) : getGalleryImages(),
    getDifficultyCounts(),
  ]);

  return (
    <>
      <main className="bg-background py-12">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            Gallery
          </h1>
          <p className="mt-2 text-muted-foreground">
            Browse our collection of intricate coloring pages for relaxation and
            mindfulness
          </p>

          {/* Category filter pills */}
          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              href="/gallery"
              className={cn(
                "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-all",
                !difficultySlug
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              All
            </Link>
            {GALLERY_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/gallery/${cat.slug}`}
                className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {/* Holidays & Seasons */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { slug: "christmas", name: "Christmas", emoji: "🎄" },
              { slug: "halloween", name: "Halloween", emoji: "🎃" },
              { slug: "easter", name: "Easter", emoji: "🐰" },
              { slug: "valentines-day", name: "Valentine's", emoji: "💝" },
              { slug: "winter", name: "Winter", emoji: "❄️" },
              { slug: "spring", name: "Spring", emoji: "🌸" },
              { slug: "summer", name: "Summer", emoji: "☀️" },
              { slug: "autumn", name: "Autumn", emoji: "🍂" },
            ].map((event) => (
              <Link
                key={event.slug}
                href={`/gallery/holidays/${event.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
              >
                <span>{event.emoji}</span>
                <span>{event.name}</span>
              </Link>
            ))}
          </div>

          {/* Difficulty filter */}
          <Suspense fallback={null}>
            <DifficultyFilter
              currentDifficulty={difficulty}
              counts={difficultyCounts}
              className="mt-4"
            />
          </Suspense>

          {/* Gallery grid */}
          <div className="mt-8">
            <GalleryGrid
              initialImages={data.images}
              initialCursor={data.nextCursor}
              initialHasMore={data.hasMore}
              galleryType={difficulty ? "difficulty" : "all"}
              difficultySlug={difficultySlug}
            />
          </div>
        </div>
      </main>
    </>
  );
};

export default GalleryPage;
