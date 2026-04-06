import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import GalleryGrid from "@/components/GalleryGrid/GalleryGrid";
import DifficultyFilter from "@/components/DifficultyFilter/DifficultyFilter";
import { GALLERY_CATEGORIES, getCategoryBySlug } from "@/constants";
import {
  getCategoryImages,
  getCategoryImagesWithDifficulty,
  getDifficultyCounts,
  getDifficultyFromSlug,
  getAllCategorySlugs,
} from "@/app/data/gallery";
import cn from "@/utils/cn";

type CategoryPageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ difficulty?: string }>;
};

export async function generateStaticParams() {
  return getAllCategorySlugs();
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const category = getCategoryBySlug(categorySlug);

  if (!category) {
    return { title: "Category not found" };
  }

  return {
    title: `${category.name} Coloring Pages`,
    description: category.description,
    keywords: category.keywords,
  };
}

const CategoryPage = async ({ params, searchParams }: CategoryPageProps) => {
  await connection();

  const { category: categorySlug } = await params;
  const { difficulty: difficultySlug } = await searchParams;

  const category = getCategoryBySlug(categorySlug);
  if (!category) {
    notFound();
  }

  const difficulty = difficultySlug
    ? getDifficultyFromSlug(difficultySlug)
    : null;

  const [data, difficultyCounts] = await Promise.all([
    difficulty
      ? getCategoryImagesWithDifficulty(categorySlug, difficulty)
      : getCategoryImages(categorySlug),
    getDifficultyCounts(),
  ]);

  return (
    <>
      <main className="bg-background py-12">
        <div className="mx-auto max-w-7xl px-6">
          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/gallery" className="hover:text-foreground">
              Gallery
            </Link>
            <span>/</span>
            <span className="text-foreground">{category.name}</span>
          </nav>

          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            {category.name} Coloring Pages
          </h1>
          <p className="mt-2 text-muted-foreground">{category.description}</p>

          {/* Category filter pills */}
          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              href="/gallery"
              className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
            >
              All
            </Link>
            {GALLERY_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/gallery/${cat.slug}`}
                className={cn(
                  "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-all",
                  cat.slug === categorySlug
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {cat.name}
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
              galleryType="category"
              categorySlug={categorySlug}
              difficultySlug={difficultySlug}
            />
          </div>
        </div>
      </main>
    </>
  );
};

export default CategoryPage;
