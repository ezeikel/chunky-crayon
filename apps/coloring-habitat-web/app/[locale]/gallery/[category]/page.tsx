import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import GalleryGrid from "@/components/GalleryGrid/GalleryGrid";
import DifficultyFilter from "@/components/DifficultyFilter/DifficultyFilter";
import Breadcrumbs from "@/components/Breadcrumbs";
import CategoryFaq from "@/components/CategoryFaq";
import { GALLERY_CATEGORIES, getCategoryBySlug } from "@/constants";
import {
  getCategoryImages,
  getCategoryImagesWithDifficulty,
  getDifficultyCounts,
  getDifficultyFromSlug,
  getAllCategorySlugs,
} from "@/app/data/gallery";
import cn from "@/utils/cn";
import { generateAlternates } from "@/lib/seo";

type CategoryPageProps = {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{ difficulty?: string }>;
};

export async function generateStaticParams() {
  return getAllCategorySlugs();
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { locale, category: categorySlug } = await params;
  const category = getCategoryBySlug(categorySlug);

  if (!category) {
    return { title: "Category not found" };
  }

  return {
    title: `${category.name} Coloring Pages`,
    description: category.description,
    keywords: category.keywords,
    alternates: generateAlternates(locale, `/gallery/${categorySlug}`),
  };
}

const CategoryPage = async ({ params, searchParams }: CategoryPageProps) => {
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

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to use ${category.name} coloring pages`,
    step: [
      {
        "@type": "HowToStep",
        name: "Browse",
        text: `Browse our collection of ${category.name.toLowerCase()} coloring pages and find a design you like`,
      },
      {
        "@type": "HowToStep",
        name: "Open",
        text: "Click on any coloring page to open it in our online coloring tool",
      },
      {
        "@type": "HowToStep",
        name: "Color online",
        text: "Use our brushes, fill tools, and color palettes to color the page digitally",
      },
      {
        "@type": "HowToStep",
        name: "Download & print",
        text: "Download the finished page as a PDF to print and color at home",
      },
    ],
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `https://coloringhabitat.com/gallery/${categorySlug}`,
    name: `${category.name} Coloring Pages`,
    description: category.description,
    url: `https://coloringhabitat.com/gallery/${categorySlug}`,
    isPartOf: {
      "@id": "https://coloringhabitat.com/#website",
    },
    about: {
      "@type": "Thing",
      name: category.name,
    },
    numberOfItems: data.images.length,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: data.images.length,
      itemListElement: data.images.slice(0, 10).map((image, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "ImageObject",
          "@id": `https://coloringhabitat.com/coloring-image/${image.id}`,
          name: image.title || `${category.name} Coloring Page`,
          contentUrl: image.svgUrl,
          thumbnailUrl: image.svgUrl,
          description:
            image.description || `Free ${category.name} coloring page`,
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <main className="bg-background py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Gallery", href: "/gallery" },
              { label: category.name },
            ]}
            className="mb-6"
          />

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

          <CategoryFaq categoryName={category.name} />
        </div>
      </main>
    </>
  );
};

export default CategoryPage;
