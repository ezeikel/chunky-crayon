import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faSeedling,
  faLeaf,
  faSpa,
  faMountain,
  faImages,
  faCalendarDays,
  faUsers,
  faShapes,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Difficulty } from "@one-colored-pixel/db";
import GalleryGrid from "@/components/GalleryGrid/GalleryGrid";
import DifficultyFilter from "@/components/DifficultyFilter/DifficultyFilter";
import Breadcrumbs from "@/components/Breadcrumbs/Breadcrumbs";
import { GALLERY_CATEGORIES } from "@/constants";
import {
  getGalleryImages,
  getDifficultyImages,
  getDifficultyCounts,
  getDifficultyFromSlug,
  getGalleryStats,
  getTodaysDailyImage,
  getFeaturedImages,
  getCategoryCounts,
} from "@/app/data/gallery";
import cn from "@/utils/cn";
import { generateAlternates } from "@/lib/seo";

type HolidaySlug =
  | "christmas"
  | "halloween"
  | "easter"
  | "valentines"
  | "winter"
  | "spring"
  | "summer"
  | "autumn";

const HOLIDAYS: { slug: HolidaySlug; emoji: string; urlSlug: string }[] = [
  { slug: "christmas", emoji: "🎄", urlSlug: "christmas" },
  { slug: "halloween", emoji: "🎃", urlSlug: "halloween" },
  { slug: "easter", emoji: "🐰", urlSlug: "easter" },
  { slug: "valentines", emoji: "💝", urlSlug: "valentines-day" },
  { slug: "winter", emoji: "❄️", urlSlug: "winter" },
  { slug: "spring", emoji: "🌸", urlSlug: "spring" },
  { slug: "summer", emoji: "☀️", urlSlug: "summer" },
  { slug: "autumn", emoji: "🍂", urlSlug: "autumn" },
];

const DIFFICULTY_CARDS: {
  difficulty: Difficulty;
  icon: IconDefinition;
  color: string;
  key: "beginner" | "intermediate" | "advanced" | "expert";
}[] = [
  {
    difficulty: Difficulty.BEGINNER,
    icon: faSeedling,
    color: "text-emerald-600",
    key: "beginner",
  },
  {
    difficulty: Difficulty.INTERMEDIATE,
    icon: faLeaf,
    color: "text-amber-600",
    key: "intermediate",
  },
  {
    difficulty: Difficulty.ADVANCED,
    icon: faSpa,
    color: "text-blue-600",
    key: "advanced",
  },
  {
    difficulty: Difficulty.EXPERT,
    icon: faMountain,
    color: "text-purple-600",
    key: "expert",
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gallery" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: generateAlternates(locale, "/gallery"),
  };
}

type GalleryPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ difficulty?: string; category?: string }>;
};

// ============================================================================
// SECTIONS
// ============================================================================

const GalleryStatsSection = async () => {
  const [t, stats] = await Promise.all([
    getTranslations("gallery"),
    getGalleryStats(),
  ]);

  return (
    <div className="mb-16 grid grid-cols-3 gap-6 border-y border-border py-10">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-primary">
          <FontAwesomeIcon icon={faImages} />
        </div>
        <div className="mt-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          {stats.totalImages.toLocaleString()}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {t("stats.totalPages")}
        </div>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-accent">
          <FontAwesomeIcon icon={faUsers} />
        </div>
        <div className="mt-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          {stats.communityImages.toLocaleString()}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {t("stats.communityPages")}
        </div>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-primary">
          <FontAwesomeIcon icon={faCalendarDays} />
        </div>
        <div className="mt-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          {stats.dailyImages.toLocaleString()}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {t("stats.dailyPages")}
        </div>
      </div>
    </div>
  );
};

const DailyImageSection = async () => {
  const [t, dailyImage] = await Promise.all([
    getTranslations("gallery"),
    getTodaysDailyImage(),
  ]);

  if (!dailyImage || !dailyImage.svgUrl) return null;

  return (
    <section className="mb-16">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon
            icon={faCalendarDays}
            className="text-xl text-primary"
          />
          <h2 className="text-2xl font-bold text-foreground">
            {t("dailyPage")}
          </h2>
        </div>
        <Link
          href="/gallery/daily"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
        >
          {t("viewAllDaily")}
          <FontAwesomeIcon icon={faArrowRight} size="xs" />
        </Link>
      </div>
      <div className="rounded-3xl bg-secondary p-6 md:p-10">
        <div className="flex flex-col items-center gap-8 md:flex-row">
          <Link
            href={`/coloring-image/${dailyImage.id}`}
            className="group relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-background shadow-sm transition-shadow hover:shadow-md"
          >
            <Image
              src={dailyImage.svgUrl}
              alt={dailyImage.title || "Daily coloring page"}
              fill
              className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-bold text-foreground md:text-3xl">
              {dailyImage.title || t("dailyPage")}
            </h3>
            {dailyImage.description && (
              <p className="mt-3 max-w-xl text-muted-foreground line-clamp-3">
                {dailyImage.description}
              </p>
            )}
            <Link
              href={`/coloring-image/${dailyImage.id}`}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:shadow-lg"
            >
              {t("startColoring")}
              <FontAwesomeIcon icon={faArrowRight} size="sm" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const CommunityHighlightsSection = async () => {
  const [t, allImages] = await Promise.all([
    getTranslations("gallery"),
    getFeaturedImages(6),
  ]);
  const images = allImages.filter((img) => img.svgUrl);

  if (images.length === 0) return null;

  return (
    <section className="mb-16">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faUsers} className="text-xl text-accent" />
          <h2 className="text-2xl font-bold text-foreground">
            {t("communityCreations")}
          </h2>
        </div>
        <Link
          href="/gallery"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
        >
          {t("viewAllCommunity")}
          <FontAwesomeIcon icon={faArrowRight} size="xs" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
        {images.map((image) => (
          <Link
            key={image.id}
            href={`/coloring-image/${image.id}`}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-background transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <Image
              src={image.svgUrl as string}
              alt={image.title || "Coloring page"}
              fill
              className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
        ))}
      </div>
    </section>
  );
};

const DifficultyCardsSection = async () => {
  const [t, counts] = await Promise.all([
    getTranslations("gallery"),
    getDifficultyCounts(),
  ]);

  return (
    <section className="mb-16">
      <div className="mb-6 flex items-center gap-3">
        <FontAwesomeIcon icon={faShapes} className="text-xl text-primary" />
        <h2 className="text-2xl font-bold text-foreground">
          {t("browseByDifficulty")}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {DIFFICULTY_CARDS.map((card) => (
          <Link
            key={card.difficulty}
            href={`/gallery?difficulty=${card.difficulty.toLowerCase()}`}
            className="group rounded-2xl border border-border bg-card p-5 text-center transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
              <FontAwesomeIcon
                icon={card.icon}
                className={cn("text-lg", card.color)}
              />
            </div>
            <h3 className="mt-4 font-bold text-foreground">
              {t(`difficulty.${card.key}.title`)}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {counts[card.difficulty] || 0} {t("stats.pagesSuffix")}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t(`difficulty.${card.key}.description`)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

const CategoryCardsSection = async () => {
  const [t, counts] = await Promise.all([
    getTranslations("gallery"),
    getCategoryCounts(),
  ]);

  return (
    <section className="mb-16">
      <div className="mb-6 flex items-center gap-3">
        <FontAwesomeIcon icon={faImages} className="text-xl text-accent" />
        <h2 className="text-2xl font-bold text-foreground">
          {t("browseByCategory")}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {GALLERY_CATEGORIES.map((category) => (
          <Link
            key={category.id}
            href={`/gallery/${category.slug}`}
            className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <h3 className="font-bold text-foreground group-hover:text-primary">
              {t(`categories.${category.id}.name`)}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {counts[category.slug] || 0} {t("stats.pagesSuffix")}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t(`categories.${category.id}.description`)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

const FilterPillsSection = async ({
  difficultySlug,
  difficulty,
  difficultyCounts,
}: {
  difficultySlug?: string;
  difficulty: Difficulty | null;
  difficultyCounts: Record<Difficulty, number>;
}) => {
  const t = await getTranslations("gallery");

  return (
    <div className="mb-8">
      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/gallery"
          className={cn(
            "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-all",
            !difficultySlug
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          {t("filters.all")}
        </Link>
        {GALLERY_CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/gallery/${cat.slug}`}
            className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
          >
            {t(`categories.${cat.id}.name`)}
          </Link>
        ))}
      </div>

      {/* Holidays & Seasons */}
      <div className="mt-4 flex flex-wrap gap-2">
        {HOLIDAYS.map((event) => (
          <Link
            key={event.slug}
            href={`/gallery/holidays/${event.urlSlug}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
          >
            <span>{event.emoji}</span>
            <span>{t(`holidays.${event.slug}`)}</span>
          </Link>
        ))}
      </div>

      {/* Difficulty filter */}
      <DifficultyFilter
        currentDifficulty={difficulty}
        counts={difficultyCounts}
        className="mt-4"
      />
    </div>
  );
};

const SeoContentSection = async () => {
  const t = await getTranslations("gallery");

  return (
    <section className="mt-20 border-t border-border pt-12">
      <h2 className="text-2xl font-bold text-foreground md:text-3xl">
        {t("seo.aboutTitle")}
      </h2>
      <div className="mt-6 max-w-4xl space-y-4 leading-relaxed text-muted-foreground">
        <p>{t("seo.aboutParagraph1")}</p>
        <p>{t("seo.aboutParagraph2")}</p>
        <p>{t("seo.aboutParagraph3")}</p>
      </div>
    </section>
  );
};

// ============================================================================
// PAGE
// ============================================================================

const GalleryContent = async ({
  searchParams,
}: {
  searchParams: Promise<{ difficulty?: string; category?: string }>;
}) => {
  const [t, tBreadcrumbs] = await Promise.all([
    getTranslations("gallery"),
    getTranslations("breadcrumbs"),
  ]);

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
      <Breadcrumbs
        items={[
          { label: tBreadcrumbs("home"), href: "/" },
          { label: tBreadcrumbs("gallery") },
        ]}
        className="mb-6"
      />

      {/* Hero */}
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {t("heroSubtitle")}
        </p>
      </div>

      <GalleryStatsSection />
      <DailyImageSection />
      <CommunityHighlightsSection />
      <DifficultyCardsSection />
      <CategoryCardsSection />
      <FilterPillsSection
        difficultySlug={difficultySlug}
        difficulty={difficulty}
        difficultyCounts={difficultyCounts}
      />

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

      <SeoContentSection />
    </>
  );
};

const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="mb-6 h-6 w-48 rounded bg-secondary" />
    <div className="mb-4 h-12 w-1/2 rounded bg-secondary" />
    <div className="mb-12 h-6 w-2/3 rounded bg-secondary" />
    <div className="mb-16 h-24 rounded bg-secondary" />
    <div className="mb-16 h-80 rounded-3xl bg-secondary" />
    <div className="mb-16 grid grid-cols-2 gap-4 sm:grid-cols-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="aspect-square rounded-xl bg-secondary" />
      ))}
    </div>
  </div>
);

const GalleryPage = async ({ searchParams }: GalleryPageProps) => {
  return (
    <main className="bg-background py-12">
      <div className="mx-auto max-w-7xl px-6">
        <Suspense fallback={<LoadingSkeleton />}>
          <GalleryContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
};

export default GalleryPage;
